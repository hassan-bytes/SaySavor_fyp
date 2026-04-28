import { memo, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mic, MicOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePartnerJarvis } from './usePartnerJarvis';
import { usePartnerActionHandler } from './PartnerActionHandler';
import StatusOverlay from './StatusOverlay';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';

interface JarvisButtonProps {
  isRecording?: boolean;
  isProcessing?: boolean;
  onClickStart?: () => void | Promise<void>;
  onClickStop?: () => void;
}

const isTypingContext = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

const JarvisButton = ({
  isRecording: controlledRecording,
  isProcessing: controlledProcessing,
  onClickStart,
  onClickStop,
}: JarvisButtonProps) => {
  const { restaurantId } = useRestaurant();
  const internalJarvis = usePartnerJarvis({ restaurantId });
  const { executeAction } = usePartnerActionHandler();
  const handledActionRef = useRef<string | null>(null);
  const spaceHeldRef = useRef(false);

  const isControlled = typeof controlledRecording === 'boolean' || typeof controlledProcessing === 'boolean';
  const isRecording = controlledRecording ?? internalJarvis.isRecording;
  const isProcessing = controlledProcessing ?? internalJarvis.isProcessing;
  const transcript = internalJarvis.transcript;
  const error = internalJarvis.error;
  const lastData = internalJarvis.lastData;
  const startRecording = onClickStart ?? internalJarvis.startRecording;
  const stopRecording = onClickStop ?? internalJarvis.stopRecording;

  // Support both new actions[] array and legacy flat action field
  const currentActionKey = useMemo(() => {
    if (!lastData) return null;
    const hasAny = (lastData.actions?.length ?? 0) > 0 || lastData.action;
    return hasAny ? `${lastData.reply ?? ''}:${Date.now()}` : null;
  }, [lastData]);

  useEffect(() => {
    if (!lastData || !currentActionKey) return;
    if (handledActionRef.current === currentActionKey) return;
    handledActionRef.current = currentActionKey;

    const toRun = lastData.actions?.length
      ? lastData.actions
      : lastData.action
      ? [{ action: lastData.action, target: lastData.target ?? '', params: {}, tool_result: lastData.tool_result }]
      : [];

    for (const act of toRun) {
      executeAction(act.action, act.target, act.tool_result ?? lastData.tool_result);
    }
  }, [currentActionKey, executeAction, lastData]);

  useEffect(() => {
    if (transcript) {
      toast.message('Jarvis', { description: transcript });
    }
  }, [transcript]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
      if (!isSpace || event.repeat || isProcessing || isTypingContext(event.target)) return;

      event.preventDefault();

      if (spaceHeldRef.current) return;

      spaceHeldRef.current = true;
      if (!isRecording) {
        await startRecording();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
      if (!isSpace) return;

      event.preventDefault();
      spaceHeldRef.current = false;

      if (isRecording) {
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      spaceHeldRef.current = false;
    };
  }, [isProcessing, isRecording, startRecording, stopRecording]);

  const onPress = async () => {
    if (isProcessing) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    await startRecording();
  };

  return (
    <>
      <StatusOverlay isVisible={isRecording || isProcessing} isRecording={isRecording} isProcessing={isProcessing} />

      <div className="fixed bottom-6 right-6 z-[120]">
        <motion.button
          type="button"
          onClick={onPress}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/40 bg-black/80 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.28)] backdrop-blur-md outline-none transition focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={isRecording ? 'Stop Jarvis voice capture' : 'Start Jarvis voice capture'}
          aria-pressed={isRecording}
          aria-busy={isProcessing}
          title={isControlled ? 'Click to toggle Jarvis' : 'Click to toggle Jarvis. Hold Space to record.'}
        >
          {isRecording && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full border border-amber-400/50"
                animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute inset-0 rounded-full border border-amber-300/40"
                animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
              />
            </>
          )}

          {!isRecording && !isProcessing && (
            <div className="absolute inset-0 rounded-full ring-2 ring-amber-400/25 transition group-hover:ring-amber-300/40" />
          )}

          <motion.div
            className="absolute inset-0 rounded-full border border-amber-400/10"
            animate={isRecording ? { opacity: [0.2, 0.8, 0.2], scale: [1, 1.05, 1] } : { opacity: 0.3 }}
            transition={isRecording ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          />

          <div className="relative z-10 flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-7 w-7" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </div>

          <Sparkles className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 text-amber-300/80" />
        </motion.button>
      </div>
    </>
  );
};

JarvisButton.displayName = 'JarvisButton';

export default memo(JarvisButton);
