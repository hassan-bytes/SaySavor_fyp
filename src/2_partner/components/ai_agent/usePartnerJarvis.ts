import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface JarvisAction {
  action: string;
  target: string;
  params?: Record<string, unknown>;
  tool_result?: Record<string, unknown>;
}

export interface JarvisHeaderData {
  reply?: string;
  tts_text?: string;
  // Legacy single-action fields (backward compat)
  action?: string;
  target?: string;
  params?: Record<string, unknown>;
  tool_result?: Record<string, unknown>;
  // New multi-intent fields
  actions?: JarvisAction[];
  tool_results?: Record<string, unknown>[];
}

interface UsePartnerJarvisReturn {
  isRecording: boolean;
  isProcessing: boolean;
  isAutoMode: boolean;
  isPlayingAudio: boolean;
  transcript: string;
  error: string | null;
  lastData: JarvisHeaderData | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleAutoMode: () => void;
}

interface UsePartnerJarvisOptions {
  restaurantId?: string;
  preferredLang?: string;   // 'auto' | 'ur' | 'en'
  preferredGender?: string; // 'auto' | 'male' | 'female'
}

const JARVIS_ENDPOINT = `${import.meta.env.VITE_JARVIS_URL ?? 'http://localhost:8001'}/process-voice`;

// VAD constants — tune per environment
const SILENCE_THRESHOLD = 0.012; // RMS level below which = silence
const SILENCE_DURATION_MS = 1500; // ms of continuous silence before auto-stop

export const usePartnerJarvis = ({
  restaurantId = '',
  preferredLang = 'auto',
  preferredGender = 'auto',
}: UsePartnerJarvisOptions = {}): UsePartnerJarvisReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastData, setLastData] = useState<JarvisHeaderData | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);

  // VAD refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoModeRef = useRef(false);
  const retryDelayRef = useRef(2000); // exponential backoff for connection errors
  const recordingStartRef = useRef<number>(0); // for minimum duration guard

  isAutoModeRef.current = isAutoMode;

  const cleanupPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
    if (audioCtxRef.current) { void audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const parseHeaderData = (rawHeader: string | undefined): JarvisHeaderData | null => {
    if (!rawHeader) return null;
    try { return JSON.parse(decodeURIComponent(rawHeader)) as JarvisHeaderData; }
    catch { return null; }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setIsRecording(false);
  }, []);

  const playAudioResponse = useCallback((audioBuffer: ArrayBuffer, onEnded?: () => void) => {
    if (!audioBuffer || audioBuffer.byteLength === 0) { onEnded?.(); return; }
    cleanupPlayback();
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const objectUrl = URL.createObjectURL(blob);
    playbackUrlRef.current = objectUrl;
    const audio = new Audio(objectUrl);
    audioRef.current = audio;
    setIsPlayingAudio(true);
    audio.onended = () => { cleanupPlayback(); setIsPlayingAudio(false); onEnded?.(); };
    audio.onerror = () => { cleanupPlayback(); setIsPlayingAudio(false); onEnded?.(); };
    void audio.play().catch(() => { cleanupPlayback(); setIsPlayingAudio(false); onEnded?.(); });
  }, [cleanupPlayback]);

  const sendToJarvis = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'jarvis.webm');
      formData.append('agent_type', 'partner');
      if (restaurantId) formData.append('restaurant_id', restaurantId);
      formData.append('preferred_lang', preferredLang);
      formData.append('preferred_gender', preferredGender);

      const response = await axios.post<ArrayBuffer>(JARVIS_ENDPOINT, formData, {
        responseType: 'arraybuffer',
      });

      retryDelayRef.current = 2000; // reset backoff on success
      const metadata = parseHeaderData(response.headers['x-jarvis-data']);
      setLastData(metadata);
      setTranscript(metadata?.reply || metadata?.tts_text || '');

      // After audio finishes, if auto mode is on → restart listening
      playAudioResponse(response.data, () => {
        if (isAutoModeRef.current) {
          void startRecordingInternal();
        }
      });
    } catch {
      setError('Jarvis service unavailable. Ensure bridge_agent.py is running on port 8001.');
      if (isAutoModeRef.current) {
        // Exponential backoff: 2s → 4s → 8s → 16s → 30s (cap)
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30000);
        setTimeout(() => { if (isAutoModeRef.current) void startRecordingInternal(); }, delay);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [playAudioResponse, restaurantId, preferredLang, preferredGender]);

  // VAD: monitor microphone volume, auto-stop when silence detected
  const attachVAD = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      let silenceStart: number | null = null;

      vadIntervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
        rms = Math.sqrt(rms / buffer.length);

        if (rms < SILENCE_THRESHOLD) {
          if (silenceStart === null) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION_MS) {
            clearInterval(vadIntervalRef.current!);
            stopRecording();
          }
        } else {
          silenceStart = null;
        }
      }, 100);
    } catch {
      // VAD not critical — recording still works manually
    }
  }, [stopRecording]);

  // Internal start (used by both manual + auto-loop)
  const startRecordingInternal = useCallback(async () => {
    if (isProcessing) return;
    setError(null);
    setTranscript('');
    setLastData(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) options.mimeType = 'audio/webm';

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        cleanupStream();
        const duration = Date.now() - recordingStartRef.current;
        // Skip clips < 1.5 KB or < 800ms — these are mic noise/breath, not real speech
        if (recorded.size > 1500 && duration >= 800) void sendToJarvis(recorded);
        else if (isAutoModeRef.current) void startRecordingInternal();
      };

      recorder.onerror = () => {
        cleanupStream();
        setIsRecording(false);
        setError('Recording failed. Check microphone permissions.');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingStartRef.current = Date.now(); // track start for minimum duration guard
      setIsRecording(true);

      if (isAutoModeRef.current) attachVAD(stream);
    } catch {
      setError('Microphone permission denied or unavailable.');
      setIsRecording(false);
      cleanupStream();
    }
  }, [attachVAD, cleanupStream, isProcessing, sendToJarvis]);

  const startRecording = useCallback(async () => {
    await startRecordingInternal();
  }, [startRecordingInternal]);

  const toggleAutoMode = useCallback(() => {
    setIsAutoMode((prev) => {
      const next = !prev;
      isAutoModeRef.current = next;
      if (!next) stopRecording(); // stop if turning off
      return next;
    });
  }, [stopRecording]);

  // Auto-start recording when auto mode is turned on
  useEffect(() => {
    if (isAutoMode && !isRecording && !isProcessing) {
      void startRecordingInternal();
    }
  }, [isAutoMode]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      cleanupStream();
      cleanupPlayback();
    };
  }, [cleanupPlayback, cleanupStream]);

  return {
    isRecording,
    isProcessing,
    isAutoMode,
    isPlayingAudio,
    transcript,
    error,
    lastData,
    startRecording,
    stopRecording,
    toggleAutoMode,
  };
};
