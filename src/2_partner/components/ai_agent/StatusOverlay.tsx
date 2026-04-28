import { motion, AnimatePresence } from 'framer-motion';

interface StatusOverlayProps {
  isVisible: boolean;
  isRecording: boolean;
  isProcessing: boolean;
}

const StatusOverlay = ({ isVisible, isRecording, isProcessing }: StatusOverlayProps) => {
  const label = isProcessing ? 'Jarvis soch raha hai...' : isRecording ? 'Jarvis sun raha hai...' : '';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-6 z-[120] rounded-xl border border-amber-400/30 bg-black/80 px-4 py-2 text-xs font-semibold text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.25)] backdrop-blur-md"
        >
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatusOverlay;
