import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, BookOpen, Volume2, ShieldAlert, Layers, HelpCircle, ChevronRight } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface MainMenuProps {
  onStartNewGame: () => void;
  onSelectFloor: (floor: number) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartNewGame,
  onSelectFloor,
}) => {
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const handleStart = () => {
    soundEngine.init();
    soundEngine.playDoorUnlock();
    onStartNewGame();
  };

  const handleSelectFloor = (f: number) => {
    soundEngine.init();
    soundEngine.playFlashlightClick();
    onSelectFloor(f);
  };

  return (
    <div className="relative w-full h-full bg-[#050505] text-[#E0E0E0] flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden font-serif">
      {/* Perspective Geometric Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(18,18,18,0.6)_0%,rgba(5,5,5,0.98)_80%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(0deg,#fff,#fff_1px,transparent_1px,transparent_4px)]" />

      {/* Top Bar */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#8B0000] shadow-[0_0_6px_#FF0000] animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-[#777]">
            Blackridge Hotel // Midnight Investigation
          </span>
        </div>
        <div className="text-[10px] sm:text-[11px] font-mono tracking-[0.15em] text-[#555]">
          1984 ARCHIVAL RECORD
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center py-6">
        {/* Left Column: Title & Story */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 flex flex-col gap-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/10 w-fit">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#8B0000]">
              12:00 AM — 06:00 AM DEADLINE
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-normal tracking-tight text-[#C0C0C0] leading-none m-0">
            HOURS TILL <span className="text-[#8B0000] font-serif">DAWN</span>
          </h1>

          <p className="text-[#888] text-sm sm:text-base max-w-lg leading-relaxed italic">
            Your family has been taken. Enter the abandoned Blackridge Hotel at midnight, destroy security lockdowns, survive ancient horrors, and retrieve the supernatural Aurelia Heart before the sunrise breaks.
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-[#555] tracking-widest pt-2">
            <span>SURVIVAL</span>
            <span>•</span>
            <span>EXPLORATION</span>
            <span>•</span>
            <span>ACTION</span>
          </div>
        </motion.div>

        {/* Right Column: Menu Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-5 flex flex-col gap-3 bg-[#0a0a0a]/80 border border-white/10 p-6 backdrop-blur-md shadow-2xl"
        >
          <button
            onClick={handleStart}
            className="flex items-center justify-center gap-3 w-full py-3.5 bg-[#8B0000] hover:bg-[#a10d0d] active:scale-[0.99] text-[#E0E0E0] font-serif text-base tracking-wider uppercase transition shadow-[0_0_15px_rgba(139,0,0,0.3)] border border-[#a10d0d] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Begin Infiltration</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playFlashlightClick();
              setShowLevelSelect(!showLevelSelect);
            }}
            className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] text-[#999] hover:text-[#E0E0E0] border border-white/10 text-xs font-mono tracking-[0.15em] uppercase transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#666]" />
              <span>Select Floor</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showLevelSelect ? 'rotate-90' : ''}`} />
          </button>

          {/* Level Select Drawer */}
          {showLevelSelect && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#555]">
                Direct Floor Access:
              </span>
              {[
                { f: 1, name: 'Floor 1: Lobby & Crawlers (12:00 AM)' },
                { f: 2, name: 'Floor 2: Guest Suites & Stalkers (01:15 AM)' },
                { f: 3, name: 'Floor 3: Ballroom & Brutes (02:30 AM)' },
                { f: 4, name: 'Floor 4: Penthouse Corridors (03:45 AM)' },
                { f: 5, name: 'Floor 5: The Grand Vault & Boss (05:00 AM)' },
              ].map((lvl) => (
                <button
                  key={lvl.f}
                  onClick={() => handleSelectFloor(lvl.f)}
                  className="w-full text-left px-3 py-2 bg-black/40 hover:bg-[#8B0000]/20 border border-white/[0.05] hover:border-[#8B0000]/50 text-xs font-mono text-[#888] hover:text-[#E0E0E0] transition cursor-pointer"
                >
                  {lvl.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              soundEngine.playFlashlightClick();
              setShowControls(!showControls);
            }}
            className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] text-[#999] hover:text-[#E0E0E0] border border-white/10 text-xs font-mono tracking-[0.15em] uppercase transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#666]" />
              <span>Directives & Controls</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showControls ? 'rotate-90' : ''}`} />
          </button>

          {/* Controls Dialog */}
          {showControls && (
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10 text-xs font-mono text-[#888]">
              <div className="grid grid-cols-2 gap-2 bg-black/50 p-3 border border-white/[0.05]">
                <div><strong className="text-[#C0C0C0]">WASD:</strong> Movement</div>
                <div><strong className="text-[#C0C0C0]">SHIFT:</strong> Sprint</div>
                <div><strong className="text-[#10B981]">C:</strong> Crouch / Hide</div>
                <div><strong className="text-[#F59E0B]">F / B:</strong> Flashlight / Battery</div>
                <div><strong className="text-[#C0C0C0]">E:</strong> Interact / Pick up</div>
                <div><strong className="text-[#C0C0C0]">LMB:</strong> Attack / Shoot</div>
                <div><strong className="text-[#C0C0C0]">1 - 4:</strong> Weapons</div>
                <div><strong className="text-[#8B0000]">Q / X:</strong> Medkit / Surge</div>
                <div><strong className="text-[#F59E0B]">Z / R:</strong> 180° Quick Turn</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between border-t border-white/10 pt-4 text-[10px] sm:text-[11px] font-mono text-[#555] tracking-[0.15em]">
        <span>OBJECTIVE: DESTROY LOCKDOWN CAMERAS // RETRIEVE AURELIA HEART</span>
        <span>DEADLINE: 06:00 AM</span>
      </div>
    </div>
  );
};
