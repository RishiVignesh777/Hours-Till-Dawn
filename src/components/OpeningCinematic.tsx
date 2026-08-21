import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../audio/SoundEngine';
import { ChevronRight, Play, Volume2 } from 'lucide-react';

interface Slide {
  title: string;
  subtitle: string;
  text: string;
  imagePrompt: string;
  iconType: 'family' | 'kidnap' | 'jewel' | 'hotel' | 'title';
}

const SLIDES: Slide[] = [
  {
    title: "A Normal Life Shattered",
    subtitle: "October 1984 — 10:45 PM",
    text: "Elena's laughter in the kitchen. Lucas playing with his toy train on the living room rug. A warm, ordinary evening... before the heavy knock tore the front door off its hinges.",
    imagePrompt: "family_photo",
    iconType: "family"
  },
  {
    title: "The Kidnapper's Demand",
    subtitle: "11:15 PM — Ransom Transmission",
    text: "\"I have your wife and son. Their lives are worth nothing to me compared to what lies hidden in Blackridge Hotel. Bring me the Aurelia Heart before sunrise... or you'll never see them again.\"",
    imagePrompt: "kidnap_threat",
    iconType: "kidnap"
  },
  {
    title: "The Ancient Relic",
    subtitle: "The Aurelia Heart",
    text: "An ancient supernatural jewel sealed deep in the upper sanctum of the hotel. Legend says it holds power over life and death—and hungers for the souls of those who disturb its slumber.",
    imagePrompt: "aurelia_jewel",
    iconType: "jewel"
  },
  {
    title: "The Blackridge Hotel",
    subtitle: "11:58 PM — Arrival",
    text: "Abandoned fifty years ago after unexplained disappearances. The grand iron gates groan open. Corridors of rotting velvet, peeling wallpaper, and lurking shadows await.",
    imagePrompt: "blackridge_exterior",
    iconType: "hotel"
  },
  {
    title: "HOURS TILL DAWN",
    subtitle: "12:00 AM — Midnight Has Struck",
    text: "You step inside alone with only a flashlight and your resolve. You have until 6:00 AM to destroy the security lockouts, reach the top floor, take the Aurelia Heart, and escape alive.",
    imagePrompt: "title_drop",
    iconType: "title"
  }
];

interface OpeningCinematicProps {
  onStartGame: () => void;
}

export const OpeningCinematic: React.FC<OpeningCinematicProps> = ({ onStartGame }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    soundEngine.init();
    soundEngine.playHorrorStinger();
  }, [currentSlide]);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      soundEngine.playFlashlightClick();
      setCurrentSlide(prev => prev + 1);
    } else {
      soundEngine.playDoorUnlock();
      onStartGame();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="relative w-full h-full bg-[#050505] text-[#E0E0E0] flex flex-col items-center justify-between p-6 sm:p-12 select-none overflow-hidden font-serif">
      {/* Background Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(18,18,18,0.5)_0%,rgba(5,5,5,0.98)_80%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(0deg,#fff,#fff_1px,transparent_1px,transparent_4px)]" />

      {/* Top Header */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#8B0000] shadow-[0_0_6px_#FF0000] animate-pulse" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#777] font-mono">
            Blackridge Hotel // Case Archive 1984
          </span>
        </div>
        <button 
          onClick={onStartGame}
          className="text-[10px] sm:text-[11px] text-[#777] hover:text-[#E0E0E0] uppercase tracking-[0.15em] font-mono px-3 py-1 bg-white/[0.02] border border-white/10 hover:border-white/20 transition cursor-pointer"
        >
          Skip Prologue [ESC]
        </button>
      </div>

      {/* Center Cinematic Card */}
      <div className="relative z-10 w-full max-w-3xl my-auto py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex flex-col items-center text-center space-y-6"
          >
            {/* Visual Icon Box */}
            <div className="relative w-32 h-32 border border-white/15 bg-[#0a0a0a] flex items-center justify-center shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#8B0000]/20 to-transparent" />
              
              {slide.iconType === 'family' && (
                <div className="relative flex flex-col items-center">
                  <div className="w-14 h-14 border border-white/10 bg-white/[0.03] flex items-center justify-center text-[#EBCB8B]">
                    <span className="text-2xl">👨‍👩‍👦</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#888] mt-2">Family Record</span>
                </div>
              )}

              {slide.iconType === 'kidnap' && (
                <div className="relative flex flex-col items-center">
                  <div className="w-14 h-14 border border-[#8B0000]/50 bg-[#8B0000]/10 flex items-center justify-center text-[#8B0000]">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#8B0000] mt-2">Victor Vance</span>
                </div>
              )}

              {slide.iconType === 'jewel' && (
                <div className="relative flex flex-col items-center">
                  <div className="w-14 h-14 border border-rose-500/40 bg-rose-950/30 flex items-center justify-center text-rose-300 animate-pulse">
                    <span className="text-2xl">💎</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-rose-300/80 mt-2">Aurelia Relic</span>
                </div>
              )}

              {slide.iconType === 'hotel' && (
                <div className="relative flex flex-col items-center">
                  <div className="w-14 h-14 border border-white/10 bg-white/[0.03] flex items-center justify-center text-[#B0B0B0]">
                    <span className="text-2xl">🏨</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#888] mt-2">Blackridge</span>
                </div>
              )}

              {slide.iconType === 'title' && (
                <div className="relative flex flex-col items-center">
                  <div className="w-14 h-14 border border-[#8B0000] bg-[#8B0000]/20 flex items-center justify-center text-[#8B0000]">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#8B0000] mt-2">12:00 AM</span>
                </div>
              )}
            </div>

            {/* Subtitle & Title */}
            <div>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-mono text-[#8B0000] mb-2 block">
                {slide.subtitle}
              </span>
              <h1 className="text-3xl sm:text-5xl font-normal tracking-wide text-[#C0C0C0] uppercase">
                {slide.title}
              </h1>
            </div>

            {/* Narrative text */}
            <p className="text-[#888] text-base sm:text-lg max-w-xl leading-relaxed italic">
              "{slide.text}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action Footer */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
        {/* Progress indicators */}
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`h-0.5 transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-[#8B0000]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Next / Play Button */}
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-8 py-3 bg-[#8B0000] hover:bg-[#a10d0d] active:scale-[0.99] text-[#E0E0E0] font-serif text-sm tracking-wider uppercase transition shadow-[0_0_15px_rgba(139,0,0,0.3)] border border-[#a10d0d] cursor-pointer"
        >
          {currentSlide === SLIDES.length - 1 ? (
            <>
              <span>Enter Blackridge Hotel</span>
              <Play className="w-3.5 h-3.5 fill-current ml-1" />
            </>
          ) : (
            <>
              <span>Continue</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
