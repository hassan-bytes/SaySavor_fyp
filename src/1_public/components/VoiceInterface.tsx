// ============================================================
// FILE: VoiceInterface.tsx
// SECTION: 1_public > components
// PURPOSE: Voice se menu order karne ka interface.
//          Speech recognition integrate hai is mein.
// ============================================================
import { useState, useEffect } from 'react';
import { Mic, MicOff, Waves } from 'lucide-react';

const VoiceInterface = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState({ urdu: '', english: '' });
  const [waveAmplitudes, setWaveAmplitudes] = useState([0.3, 0.5, 0.7, 0.5, 0.3]);

  const samplePhrases = [
    { urdu: 'مجھے بریانی آرڈر کرنی ہے', english: 'I want to order biryani' },
    { urdu: 'حلال ریستوران دکھائیں', english: 'Show me halal restaurants' },
    { urdu: 'میرے قریب کھانا', english: 'Food near me' },
    { urdu: 'ڈیلیوری کا وقت کیا ہے؟', english: "What's the delivery time?" },
  ];

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let isTypingUrdu = true;

    const typeInterval = setInterval(() => {
      if (!isListening) return;

      const currentPhrase = samplePhrases[phraseIndex];
      
      if (isTypingUrdu) {
        if (charIndex <= currentPhrase.urdu.length) {
          setTranscript(prev => ({
            ...prev,
            urdu: currentPhrase.urdu.slice(0, charIndex)
          }));
          charIndex++;
        } else {
          isTypingUrdu = false;
          charIndex = 0;
        }
      } else {
        if (charIndex <= currentPhrase.english.length) {
          setTranscript(prev => ({
            ...prev,
            english: currentPhrase.english.slice(0, charIndex)
          }));
          charIndex++;
        } else {
          setTimeout(() => {
            phraseIndex = (phraseIndex + 1) % samplePhrases.length;
            charIndex = 0;
            isTypingUrdu = true;
            setTranscript({ urdu: '', english: '' });
          }, 1500);
        }
      }
    }, 80);

    return () => clearInterval(typeInterval);
  }, [isListening]);

  useEffect(() => {
    if (!isListening) return;

    const waveInterval = setInterval(() => {
      setWaveAmplitudes(prev => 
        prev.map(() => 0.2 + Math.random() * 0.8)
      );
    }, 150);

    return () => clearInterval(waveInterval);
  }, [isListening]);

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground font-medium">Whisper AI</span>
        </div>
        <span className="text-xs text-gold font-medium">90% Accuracy</span>
      </div>

      {/* Waveform visualization */}
      <div className="flex items-center justify-center gap-1 h-16 mb-4">
        {waveAmplitudes.map((amp, i) => (
          <div
            key={i}
            className="w-1.5 bg-gradient-to-t from-gold-dark to-gold-light rounded-full transition-all duration-150"
            style={{ 
              height: isListening ? `${amp * 100}%` : '20%',
              opacity: isListening ? 1 : 0.3
            }}
          />
        ))}
      </div>

      {/* Transcript display */}
      <div className="space-y-3 min-h-[80px]">
        {transcript.urdu && (
          <div className="animate-fade-in-up">
            <p className="text-xs text-muted-foreground mb-1">اردو</p>
            <p className="text-foreground text-right font-medium" dir="rtl">
              {transcript.urdu}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        )}
        {transcript.english && (
          <div className="animate-fade-in-up delay-200">
            <p className="text-xs text-muted-foreground mb-1">English</p>
            <p className="text-foreground font-medium">
              {transcript.english}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        )}
      </div>

      {/* Mic button */}
      <button
        onClick={() => setIsListening(!isListening)}
        className={`w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
          isListening
            ? 'bg-gold text-primary-foreground glow-gold'
            : 'bg-secondary hover:bg-secondary/80 text-foreground'
        }`}
      >
        {isListening ? (
          <>
            <Waves className="w-5 h-5 animate-pulse" />
            <span className="font-medium">Listening...</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span className="font-medium">Tap to Speak</span>
          </>
        )}
      </button>
    </div>
  );
};

export default VoiceInterface;
