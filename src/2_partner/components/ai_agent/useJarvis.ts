import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface JarvisActionData {
  reply?: string;
  action?: string;
  target?: string;
  tts_text?: string;
}

interface UseJarvisReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  lastAction: JarvisActionData | null;
}

const JARVIS_URL = `${import.meta.env.VITE_JARVIS_URL ?? 'http://localhost:8001'}/process-voice`;

const safeParseHeader = (rawHeader: string | undefined): JarvisActionData | null => {
  if (!rawHeader) return null;

  try {
    return JSON.parse(rawHeader) as JarvisActionData;
  } catch {
    return null;
  }
};

export const useJarvis = (): UseJarvisReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<JarvisActionData | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const clearPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const clearStream = useCallback(() => {
    if (!streamRef.current) return;

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const playResponseAudio = useCallback((audioBuffer: ArrayBuffer) => {
    if (!audioBuffer.byteLength) return;

    clearPlayback();

    const responseBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const objectUrl = URL.createObjectURL(responseBlob);
    objectUrlRef.current = objectUrl;

    const audio = new Audio(objectUrl);
    audioRef.current = audio;
    audio.onended = () => {
      clearPlayback();
    };
    audio.onerror = () => {
      clearPlayback();
    };

    void audio.play().catch(() => {
      clearPlayback();
    });
  }, [clearPlayback]);

  const sendRecording = useCallback(async (blob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'jarvis.webm');

      const response = await axios.post<ArrayBuffer>(JARVIS_URL, formData, {
        responseType: 'arraybuffer',
      });

      const headerData = safeParseHeader(response.headers['x-jarvis-data']);
      if (mountedRef.current) {
        setLastAction(headerData);
      }

      playResponseAudio(response.data);
    } catch {
      if (mountedRef.current) {
        setLastAction(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [playResponseAudio]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      }

      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        clearStream();

        if (recordingBlob.size > 0) {
          void sendRecording(recordingBlob);
        }
      };

      recorder.onerror = () => {
        clearStream();
        if (mountedRef.current) {
          setIsRecording(false);
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      clearStream();
      setIsRecording(false);
    }
  }, [clearStream, isProcessing, isRecording, sendRecording]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }

      clearStream();
      clearPlayback();
    };
  }, [clearPlayback, clearStream]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    lastAction,
  };
};

export default useJarvis;