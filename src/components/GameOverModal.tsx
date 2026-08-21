import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Skull, Clock, AlertTriangle } from 'lucide-react';

interface GameOverModalProps {
  reason: 'died' | 'timed_out';
  currentFloor: number;
  onRestartFloor: () => void;
  onRestartGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  reason,
  currentFloor,
  onRestartFloor,
  onRestartGame,
}) => {
  const isTimeOut = reason === 'timed_out';

  return (
    <div className="absolute inset-0 bg-[#050505]/92 backdrop-blur-xl flex items-center justify-center p-4 z-50 select-none font-serif text-[#E0E0E0]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#080808] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-6"
      >
        <div className="w-16 h-16 border border-[#8B0000]/60 bg-black flex items-center justify-center text-[#8B0000] shadow-[0_0_15px_rgba(139,0,0,0.3)]">
          {isTimeOut ? <Clock className="w-8 h-8 animate-pulse" /> : <Skull className="w-8 h-8" />}
        </div>

        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#8B0000] block mb-1">
            {isTimeOut ? '06:00 AM — SUNRISE HAS BROKEN' : `DECEASED ON FLOOR ${currentFloor}`}
          </span>
          <h2 className="text-3xl sm:text-4xl font-normal text-[#C0C0C0] tracking-wide">
            {isTimeOut ? 'TIME EXPIRED' : 'YOU PERISHED'}
          </h2>
        </div>

        <p className="text-[#888] text-sm italic max-w-xs leading-relaxed">
          {isTimeOut
            ? "The dawn sun rose over Blackridge Hotel. The kidnapper's deadline expired, and the supernatural darkness consumed everything."
            : "The shadows of Blackridge Hotel claimed another investigator. Keep your flashlight steady, destroy cameras to disable locks, and conserve ammo."}
        </p>

        {/* Survival Tip */}
        <div className="w-full bg-white/[0.02] border border-white/[0.07] p-3 text-left text-xs font-mono text-[#777] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#EBCB8B] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#B0B0B0]">Survival Insight:</strong> Energy Drinks boost your sprint speed by 30% for 15s. Use the lead pipe on cameras to save ammunition!
          </span>
        </div>

        {/* Restart Buttons */}
        <div className="w-full flex flex-col gap-2.5 pt-2">
          <button
            onClick={onRestartFloor}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#8B0000] hover:bg-[#a10d0d] active:scale-[0.99] text-[#E0E0E0] font-serif text-sm tracking-wider uppercase transition shadow-[0_0_15px_rgba(139,0,0,0.25)] border border-[#a10d0d] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Floor {currentFloor}</span>
          </button>

          <button
            onClick={onRestartGame}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/[0.02] hover:bg-white/[0.06] text-[#888] hover:text-[#E0E0E0] text-xs font-mono uppercase tracking-[0.15em] border border-white/10 transition cursor-pointer"
          >
            <span>Restart from Beginning (Floor 1)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
