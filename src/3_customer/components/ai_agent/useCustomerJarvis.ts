import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useCart } from '@/3_customer/context/CartContext';

export interface JarvisAction {
  action: string;
  target: string;
  params: Record<string, unknown>;
  tool_result?: Record<string, unknown>;
}

export interface CustomerJarvisData {
  reply?: string;
  action?: string;                          // backward compat (old flat format)
  target?: string;                          // backward compat
  tts_text?: string;
  tool_result?: Record<string, unknown>;    // top-level: first tool result
  tool_results?: Record<string, unknown>[];
  params?: Record<string, unknown>;
  actions?: JarvisAction[];                 // new multi-intent format
}

interface UseCustomerJarvisReturn {
  isRecording: boolean;
  isProcessing: boolean;
  isAutoMode: boolean;
  transcript: string;
  error: string | null;
  lastData: CustomerJarvisData | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleAutoMode: () => void;
}

interface UseCustomerJarvisOptions {
  restaurantId?: string;
  userId?: string;
  userLat?: number | null;
  userLng?: number | null;
}

const JARVIS_ENDPOINT = `${import.meta.env.VITE_JARVIS_URL ?? 'http://localhost:8001'}/process-voice`;
const SILENCE_THRESHOLD = 0.012;
const SILENCE_DURATION_MS = 1500;

function getOrCreateGuestId(): string {
  const KEY = 'jarvis_guest_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export const useCustomerJarvis = ({
  restaurantId = '',
  userId = '',
  userLat = null,
  userLng = null,
}: UseCustomerJarvisOptions = {}): UseCustomerJarvisReturn => {
  // Stable session ID: real user_id when logged in, else a guest UUID from localStorage
  const sessionId = userId || getOrCreateGuestId();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastData, setLastData] = useState<CustomerJarvisData | null>(null);

  // Real-time cart state — sent with every request so backend knows cart contents
  const { cartItems } = useCart();
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoModeRef = useRef(false);

  // Synchronous processing guard — prevents duplicate in-flight requests.
  // React state (isProcessing) updates asynchronously and suffers stale closure
  // issues inside callbacks; this ref is always current.
  const isProcessingRef = useRef(false);

  // Stable ref to startRecordingInternal — breaks the circular dependency
  // between sendToJarvis (which restarts recording after audio) and
  // startRecordingInternal (which calls sendToJarvis on recorder stop).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startRecordingInternalRef = useRef<() => Promise<void>>(async () => {});

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
    if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
    if (audioCtxRef.current) { void audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const parseHeaderData = (raw?: string): CustomerJarvisData | null => {
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(raw)) as CustomerJarvisData; }
    catch { return null; }
  };

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setIsRecording(false);
  }, []);

  const playAudioResponse = useCallback((buf: ArrayBuffer, onEnded?: () => void) => {
    if (!buf || buf.byteLength === 0) { onEnded?.(); return; }
    cleanupPlayback();
    const blob = new Blob([buf], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    playbackUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { cleanupPlayback(); onEnded?.(); };
    audio.onerror = () => { cleanupPlayback(); onEnded?.(); };
    void audio.play().catch(() => { cleanupPlayback(); onEnded?.(); });
  }, [cleanupPlayback]);

  const sendToJarvis = useCallback(async (blob: Blob) => {
    // Synchronous ref guard — drops duplicate sends that slip past the stale
    // isProcessing state check in startRecordingInternal.
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'jarvis.webm');
      formData.append('agent_type', 'customer');
      if (restaurantId) formData.append('restaurant_id', restaurantId);
      formData.append('user_id', sessionId);
      formData.append('cart_data', JSON.stringify(cartItemsRef.current));
      // GPS location — sent so NEARBY action can sort restaurants by distance
      if (userLat != null) formData.append('user_lat', String(userLat));
      if (userLng != null) formData.append('user_lng', String(userLng));

      const response = await axios.post<ArrayBuffer>(JARVIS_ENDPOINT, formData, {
        responseType: 'arraybuffer',
      });

      const metadata = parseHeaderData(response.headers['x-jarvis-data']);
      setLastData(metadata);
      setTranscript(metadata?.reply || metadata?.tts_text || '');

      // Use ref so we always call the latest startRecordingInternal,
      // avoiding the stale-closure issue with the dependency array.
      playAudioResponse(response.data, () => {
        if (isAutoModeRef.current) void startRecordingInternalRef.current();
      });
    } catch {
      setError('Jarvis service unavailable. Please try again.');
      if (isAutoModeRef.current) {
        setTimeout(() => { if (isAutoModeRef.current) void startRecordingInternalRef.current(); }, 2000);
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [playAudioResponse, restaurantId, userId]);

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
    } catch { /* VAD non-critical */ }
  }, [stopRecording]);

  const startRecordingInternal = useCallback(async () => {
    // Check both the React state (may be stale in closures) and the ref (always current)
    if (isProcessing || isProcessingRef.current) return;
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
        if (recorded.size > 0) void sendToJarvis(recorded);
      };

      recorder.onerror = () => {
        cleanupStream();
        setIsRecording(false);
        setError('Recording failed. Check microphone permissions.');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      if (isAutoModeRef.current) attachVAD(stream);
    } catch {
      setError('Microphone permission denied or unavailable.');
      setIsRecording(false);
      cleanupStream();
    }
  }, [attachVAD, cleanupStream, isProcessing, sendToJarvis]);

  // Keep the ref in sync so sendToJarvis always calls the latest version
  startRecordingInternalRef.current = startRecordingInternal;

  const startRecording = useCallback(async () => {
    await startRecordingInternal();
  }, [startRecordingInternal]);

  const toggleAutoMode = useCallback(() => {
    setIsAutoMode((prev) => {
      const next = !prev;
      isAutoModeRef.current = next;
      if (!next) stopRecording();
      return next;
    });
  }, [stopRecording]);

  useEffect(() => {
    if (isAutoMode && !isRecording && !isProcessing) {
      void startRecordingInternal();
    }
  }, [isAutoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      cleanupStream();
      cleanupPlayback();
    };
  }, [cleanupPlayback, cleanupStream]);

  return {
    isRecording,
    isProcessing,
    isAutoMode,
    transcript,
    error,
    lastData,
    startRecording,
    stopRecording,
    toggleAutoMode,
  };
};
