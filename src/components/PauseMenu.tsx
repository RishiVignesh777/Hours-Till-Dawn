import React from 'react';
import { motion } from 'motion/react';
import { Volume2, Sliders, RotateCcw, Play, BookOpen, ShieldAlert } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface PauseMenuProps {
  currentFloor: number;
  sensitivity: number;
  volume: number;
  onSensitivityChange: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onResume: () => void;
  onRestartFloor: () => void;
  onRestartGame: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  currentFloor,
  sensitivity,
  volume,
  onSensitivityChange,
  onVolumeChange,
  onResume,
  onRestartFloor,
  onRestartGame,
}) => {
  return (
    <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl flex items-center justify-center p-4 z-50 select-none font-serif text-[#E0E0E0]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-[#080808] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666] block">
              Blackridge Hotel // Temporal Stasis
            </span>
            <h2 className="text-2xl font-normal text-[#C0C0C0] tracking-wide mt-0.5">
              INVESTIGATION PAUSED
            </h2>
          </div>
          <div className="px-3 py-1 bg-white/[0.03] border border-white/10 text-[10px] font-mono text-[#888] tracking-widest uppercase">
            Floor {currentFloor}
          </div>
        </div>

        {/* Sliders / Audio Settings */}
        <div className="flex flex-col gap-4 bg-white/[0.02] p-4 border border-white/[0.07]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#888]">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#666]" />
                Look Sensitivity
              </span>
              <span className="text-[#C0C0C0]">{Math.round(sensitivity * 2000)}%</span>
            </div>
            <input
              type="range"
              min="0.0008"
              max="0.005"
              step="0.0002"
              value={sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full accent-[#8B0000] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#888]">
              <span className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-[#666]" />
                Master Audio
              </span>
              <span className="text-[#C0C0C0]">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onVolumeChange(val);
                soundEngine.setVolume(val);
              }}
              className="w-full accent-[#8B0000] cursor-pointer"
            />
          </div>
        </div>

        {/* Controls Guide Reference */}
        <div className="text-xs font-mono text-[#777] grid grid-cols-2 gap-2 bg-black/40 p-3.5 border border-white/[0.05]">
          <div><strong className="text-[#B0B0B0]">WASD:</strong> Movement</div>
          <div><strong className="text-[#B0B0B0]">SHIFT:</strong> Sprint</div>
          <div><strong className="text-[#10B981]">C:</strong> Crouch / Hide</div>
          <div><strong className="text-[#F59E0B]">F / B:</strong> Flashlight / Battery</div>
          <div><strong className="text-[#B0B0B0]">E:</strong> Interact / Pick up</div>
          <div><strong className="text-[#B0B0B0]">LMB:</strong> Attack / Shoot</div>
          <div><strong className="text-[#B0B0B0]">1 - 4:</strong> Weapons</div>
          <div><strong className="text-[#8B0000]">Q / X:</strong> Medkit / Surge</div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#8B0000] hover:bg-[#a10d0d] active:scale-[0.99] text-[#E0E0E0] font-serif text-sm tracking-wider uppercase transition shadow-[0_0_15px_rgba(139,0,0,0.25)] border border-[#a10d0d] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Infiltration</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRestartFloor}
              className="flex items-center justify-center gap-2 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] text-[#999] hover:text-[#E0E0E0] text-xs font-mono uppercase tracking-[0.15em] border border-white/10 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Floor</span>
            </button>

            <button
              onClick={onRestartGame}
              className="flex items-center justify-center gap-2 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] text-[#999] hover:text-[#E0E0E0] text-xs font-mono uppercase tracking-[0.15em] border border-white/10 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
