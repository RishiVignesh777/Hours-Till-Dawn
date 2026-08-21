import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../audio/SoundEngine';
import { ChevronRight, RotateCcw, ShieldCheck } from 'lucide-react';

interface EndingSlide {
  title: string;
  subtitle: string;
  text: string;
  icon: string;
}

const ENDING_SLIDES: EndingSlide[] = [
  {
    title: "Escape Down The Grand Staircase",
    subtitle: "05:48 AM — Blackridge Hotel Trembles",
    text: "The Aurelia Heart pulses rhythmically in your grip, burning with crimson heat. Behind you, the shadows shriek in fury as the collapsing hotel groans on its foundations. You burst through the shattered front gates into the cold morning air.",
    icon: "🏃‍♂️"
  },
  {
    title: "The Rendezvous",
    subtitle: "05:55 AM — Industrial Docks",
    text: "Victor Vance stands beside his black limousine, holding Elena and young Lucas under armed guard. A sinister grin stretches across his face as he sees the pulsing gemstone. 'You actually survived... Now give me my immortality.'",
    icon: "🚗"
  },
  {
    title: "The Dark Revelation",
    subtitle: "The Aurelia Heart Awakens",
    text: "The jewel was never just a treasure. It is an eldritch entity bound to consume anyone driven by wicked greed. As Vance seizes the Heart, the stone's tendrils engulf him. The shadows from Blackridge claim their true master.",
    icon: "⚡"
  },
  {
    title: "Dawn Arrives",
    subtitle: "06:00 AM — Safe At Last",
    text: "The first golden rays of sunrise break over the horizon, scattering the supernatural darkness to dust. Elena hugs you tightly as Lucas buries his face in your jacket. The nightmare is over. You survived Blackridge Hotel.",
    icon: "🌅"
  }
];

interface EndingCinematicProps {
  onRestart: () => void;
}

export const EndingCinematic: React.FC<EndingCinematicProps> = ({ onRestart }) => {
  const [slideIndex, setSlideIndex] = useState(0);

  const handleNext = () => {
    soundEngine.playFlashlightClick();
    if (slideIndex < ENDING_SLIDES.length - 1) {
      setSlideIndex(prev => prev + 1);
    }
  };

  const current = ENDING_SLIDES[slideIndex];
  const isFinal = slideIndex === ENDING_SLIDES.length - 1;

  return (
    <div className="relative w-full h-full bg-[#050505] text-[#E0E0E0] flex flex-col items-center justify-between p-6 sm:p-12 select-none overflow-hidden font-serif">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(18,18,18,0.6)_0%,rgba(5,5,5,0.98)_80%)] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#EBCB8B]" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#EBCB8B] font-mono">
            Mission Complete // Survived Till Dawn
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-[#777] font-mono tracking-widest">
          06:00 AM
        </span>
      </div>

      {/* Center Narrative */}
      <div className="relative z-10 w-full max-w-3xl my-auto py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="w-28 h-28 border border-white/15 bg-[#0a0a0a] flex items-center justify-center text-4xl shadow-2xl shadow-black">
              {current.icon}
            </div>

            <div>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-mono text-[#8B0000] mb-2 block">
                {current.subtitle}
              </span>
              <h1 className="text-3xl sm:text-5xl font-normal tracking-wide text-[#C0C0C0] uppercase">
                {current.title}
              </h1>
            </div>

            <p className="text-[#888] text-base sm:text-lg max-w-xl leading-relaxed italic">
              "{current.text}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
        <div className="flex items-center gap-1.5">
          {ENDING_SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`h-0.5 transition-all duration-300 ${
                idx === slideIndex ? 'w-8 bg-[#8B0000]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {isFinal ? (
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-8 py-3 bg-[#8B0000] hover:bg-[#a10d0d] active:scale-[0.99] text-[#E0E0E0] font-serif text-sm tracking-wider uppercase transition shadow-[0_0_15px_rgba(139,0,0,0.3)] border border-[#a10d0d] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.99] text-[#E0E0E0] font-serif text-sm tracking-wider uppercase border border-white/10 transition cursor-pointer"
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
};
