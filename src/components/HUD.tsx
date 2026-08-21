import React from 'react';
import { InventoryItem, Weapon } from '../types';
import { Camera, Clock, Crosshair as CrosshairIcon, Flame, Heart, Info, Shield, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HUDProps {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  timeString: string;
  timeProgress: number;
  floorNumber: number;
  floorTitle: string;
  destroyedCameras: number;
  totalCameras: number;
  activeWeapon: Weapon | null;
  weapons: Weapon[];
  inventory: InventoryItem[];
  interactPrompt: string | null;
  horrorStingerText: string | null;
  isDamageFlashing: boolean;
  onUseItem: (type: 'medkit' | 'energy_drink') => void;
  onOpenPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  stamina,
  maxStamina,
  timeString,
  timeProgress,
  floorNumber,
  floorTitle,
  destroyedCameras,
  totalCameras,
  activeWeapon,
  weapons,
  inventory,
  interactPrompt,
  horrorStingerText,
  isDamageFlashing,
  onUseItem,
  onOpenPause
}) => {
  const medkit = inventory.find(i => i.type === 'medkit');
  const energyDrink = inventory.find(i => i.type === 'energy_drink');
  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const isLowHealth = health <= 35;

  // Calculate approximate countdown time string till 06:00 AM
  const totalSecondsRemaining = Math.max(0, Math.round((1 - timeProgress) * 6 * 3600));
  const remHours = Math.floor(totalSecondsRemaining / 3600);
  const remMins = Math.floor((totalSecondsRemaining % 3600) / 60);
  const remSecs = totalSecondsRemaining % 60;
  const countdownString = `0${remHours}:${remMins < 10 ? '0' : ''}${remMins}:${remSecs < 10 ? '0' : ''}${remSecs}`;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-serif text-[#E0E0E0]">
      {/* Damage Flash Red Overlay */}
      {isDamageFlashing && (
        <div className="absolute inset-0 bg-[#8B0000]/30 animate-ping duration-150 pointer-events-none" />
      )}

      {/* Low Health Blood Vignette */}
      {isLowHealth && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(139,0,0,0.45)_100%)] pointer-events-none animate-pulse" />
      )}

      {/* Sophisticated Dark Radial Vignette & Edge Border */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,transparent_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.96)_80%)] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none border-[24px] sm:border-[36px] border-transparent [border-image:radial-gradient(circle,transparent_70%,rgba(0,0,0,0.5)_100%)_1]" />

      {/* Top Header: Location, Time & Objective */}
      <div className="absolute top-6 left-6 right-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Left Column: Location & Sub-Cards */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-[#666]">
            Current Location
          </span>
          <h1 className="text-xl sm:text-2xl font-normal text-[#C0C0C0] tracking-wide m-0">
            BLACKRIDGE HOTEL <span className="text-[#444] font-light">|</span> FLOOR {floorNumber}
          </h1>
          <span className="text-xs text-[#888] font-sans italic">
            {floorTitle}
          </span>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            {/* Time Remaining Card */}
            <div className="bg-white/[0.03] border border-white/10 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="block text-[9px] font-mono uppercase text-[#666] tracking-[0.15em]">
                Time Remaining
              </span>
              <span className="text-sm sm:text-base font-mono text-[#8B0000] font-medium tracking-wider">
                {countdownString}
              </span>
            </div>

            {/* Objective Card */}
            <div className="bg-white/[0.03] border border-white/10 px-3.5 py-1.5 backdrop-blur-sm flex flex-col">
              <span className="block text-[9px] font-mono uppercase text-[#666] tracking-[0.15em]">
                Objective
              </span>
              <span className="text-xs sm:text-sm text-[#999]">
                {totalCameras > 0 ? (
                  <>
                    Destroy Cameras: <span className={destroyedCameras >= totalCameras ? 'text-emerald-400 font-bold' : 'text-[#E0E0E0] font-mono'}>{destroyedCameras} / {totalCameras}</span>
                    {destroyedCameras >= totalCameras && <span className="text-emerald-400 ml-1 text-xs">(Unlocked)</span>}
                  </>
                ) : (
                  <span className="text-[#E0E0E0]">Survive the Chamber</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Clock Cycle & Menu */}
        <div className="flex flex-col sm:items-end text-left sm:text-right gap-2">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-light tracking-tight text-[#E0E0E0]/90">
              {timeString.replace(/\s?[AP]M/, '')}
              <span className="text-xs sm:text-sm font-mono tracking-widest text-[#777] ml-1">
                {timeString.includes('AM') ? 'AM' : 'PM'}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#555] uppercase tracking-[0.25em]">
            Midnight Cycle
          </div>

          <button
            onClick={onOpenPause}
            className="pointer-events-auto mt-1 px-3 py-1 bg-white/[0.03] hover:bg-white/[0.08] text-[#888] hover:text-[#E0E0E0] border border-white/10 text-[10px] font-mono tracking-[0.15em] uppercase transition cursor-pointer"
          >
            [ESC] Pause
          </button>
        </div>
      </div>

      {/* Center: Minimalist Sophisticated Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative flex items-center justify-center">
          <div className="w-1 h-1 bg-[#E0E0E0]/80 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          <div className="absolute w-5 h-5 border border-white/10 rounded-full" />
        </div>
      </div>

      {/* Center-Bottom: Interaction Prompt */}
      <AnimatePresence>
        {interactPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 px-6 py-2.5 border border-white/10 bg-black/75 backdrop-blur-md rounded-[2px] shadow-2xl text-center"
          >
            <span className="text-xs sm:text-sm text-[#C0C0C0] tracking-[0.05em] font-serif">
              {interactPrompt}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horror Stinger / Event Alert Popup */}
      <AnimatePresence>
        {horrorStingerText && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 px-6 py-2 border border-[#8B0000]/60 bg-[#0a0202]/95 backdrop-blur-md text-[#E0E0E0] text-xs font-mono tracking-[0.15em] uppercase shadow-2xl text-center flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF0000] shadow-[0_0_6px_#FF0000] animate-pulse" />
            <span>{horrorStingerText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Area: Vitals, Slots, and Flashlight/Ammo */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end gap-4">
        {/* Bottom Left: Vitality, Stamina & Quick Slots */}
        <div className="w-64 sm:w-72 flex flex-col gap-3">
          {/* Vitality Bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#777]">
                Vitality
              </span>
              <span className="text-[11px] font-mono text-[#8B0000] font-bold">
                {Math.round(healthPercent)}%
              </span>
            </div>
            <div className="h-1 bg-[#1a1a1a] w-full relative overflow-hidden">
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-200 ${
                  isLowHealth
                    ? 'bg-[#FF0000] animate-pulse shadow-[0_0_8px_#FF0000]'
                    : 'bg-gradient-to-r from-[#4a0000] to-[#8B0000] shadow-[0_0_10px_rgba(139,0,0,0.5)]'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Stamina Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#555]">
                Stamina
              </span>
              <span className="text-[10px] font-mono text-[#777]">
                {Math.round(staminaPercent)}%
              </span>
            </div>
            <div className="h-0.5 bg-[#141414] w-full relative overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#555] transition-all duration-150"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>

          {/* Inventory Quick Item Slots */}
          <div className="flex items-center gap-2.5 mt-1 pointer-events-auto">
            {/* Medkit Slot */}
            <button
              onClick={() => onUseItem('medkit')}
              disabled={!medkit || medkit.count <= 0}
              className={`w-12 h-12 border flex items-center justify-center relative transition backdrop-blur-sm cursor-pointer ${
                medkit && medkit.count > 0
                  ? 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 text-[#E0E0E0]'
                  : 'border-white/[0.05] bg-white/[0.01] text-[#444] cursor-not-allowed opacity-60'
              }`}
              title="Quick Medkit [Q]"
            >
              <div className="w-4 h-4 border border-[#8B0000] flex items-center justify-center text-[#8B0000] text-[10px] font-mono font-bold">
                +
              </div>
              <span className="absolute top-1 left-1.5 text-[8px] font-mono text-[#666]">Q</span>
              <span className="absolute bottom-0.5 right-1.5 text-[10px] font-mono text-[#aaa]">
                {medkit?.count || 0}
              </span>
            </button>

            {/* Energy Drink Slot */}
            <button
              onClick={() => onUseItem('energy_drink')}
              disabled={!energyDrink || energyDrink.count <= 0}
              className={`w-12 h-12 border flex items-center justify-center relative transition backdrop-blur-sm cursor-pointer ${
                energyDrink && energyDrink.count > 0
                  ? 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 text-[#E0E0E0]'
                  : 'border-white/[0.05] bg-white/[0.01] text-[#444] cursor-not-allowed opacity-60'
              }`}
              title="Energy Drink [X]"
            >
              <div className="w-3.5 h-5 border border-[#666] flex items-center justify-center text-[#999] text-[9px] font-mono">
                ⚡
              </div>
              <span className="absolute top-1 left-1.5 text-[8px] font-mono text-[#666]">X</span>
              <span className="absolute bottom-0.5 right-1.5 text-[10px] font-mono text-[#aaa]">
                {energyDrink?.count || 0}
              </span>
            </button>

            {/* Empty Reference / Tactical Slot */}
            <div className="w-12 h-12 border border-white/[0.05] bg-white/[0.01] flex items-center justify-center relative opacity-40">
              <span className="text-[8px] font-mono text-[#444]">F</span>
              <div className="w-2 h-2 rounded-full bg-[#EBCB8B] opacity-70" />
            </div>
          </div>
        </div>

        {/* Bottom Right: Equipped Weapon & Ammo */}
        <div className="flex flex-col items-end text-right">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#666] mb-1">
            Equipped Weapon // [1-4]
          </span>
          <div className="flex items-center gap-3">
            <span className="text-base sm:text-lg font-serif font-normal text-[#C0C0C0]">
              {activeWeapon?.name || 'Unarmed'}
            </span>

            {activeWeapon && (
              <div className="pl-3 border-l border-white/10 font-mono">
                {activeWeapon.isRanged ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono text-[#E0E0E0]">{activeWeapon.ammo}</span>
                    <span className="text-xs text-[#555]">/{activeWeapon.maxAmmo}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Melee</span>
                )}
              </div>
            )}
          </div>

          {/* Quick Weapon Slots */}
          <div className="flex items-center gap-1.5 mt-2">
            {weapons.map((w, idx) => {
              const isActive = activeWeapon?.id === w.id;
              return (
                <div
                  key={w.id}
                  className={`px-2 py-0.5 border text-[9px] font-mono tracking-wider transition ${
                    isActive
                      ? 'border-[#8B0000] bg-[#8B0000]/20 text-[#E0E0E0]'
                      : 'border-white/10 bg-white/[0.02] text-[#666]'
                  }`}
                >
                  <span className="text-[#888] mr-1">{idx + 1}:</span>
                  {w.id.toUpperCase()}
                </div>
              );
            })}
          </div>

          {/* Flashlight Status Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-mono uppercase text-[#555] tracking-[0.15em]">
              Flashlight [F]
            </span>
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 bg-[#EBCB8B] opacity-90 shadow-[0_0_4px_#EBCB8B]" />
              <div className="w-2.5 h-2.5 bg-[#EBCB8B] opacity-90 shadow-[0_0_4px_#EBCB8B]" />
              <div className="w-2.5 h-2.5 bg-[#EBCB8B] opacity-90 shadow-[0_0_4px_#EBCB8B]" />
              <div className="w-2.5 h-2.5 bg-[#333] opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
