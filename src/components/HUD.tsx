import React from 'react';
import { FloorObjective, InventoryItem, StealthState, TargetMonsterInfo, Weapon } from '../types';
import { CheckCircle2, Circle, Eye, EyeOff, Flame, Heart, Shield, ShieldCheck, Zap, Skull, Battery, BatteryCharging, BatteryLow, BatteryWarning, Lightbulb, LightbulbOff } from 'lucide-react';
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
  flashlightBattery?: number;
  maxFlashlightBattery?: number;
  isFlashlightOn?: boolean;
  objectives?: FloorObjective[];
  targetMonster?: TargetMonsterInfo | null;
  stealthState?: StealthState;
  onUseItem: (type: 'medkit' | 'energy_drink' | 'battery') => void;
  onSelectWeapon?: (index: number) => void;
  onToggleFlashlight?: () => void;
  onReloadBattery?: () => void;
  onToggleCrouch?: () => void;
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
  flashlightBattery = 100,
  maxFlashlightBattery = 100,
  isFlashlightOn = true,
  objectives = [],
  targetMonster = null,
  stealthState = { isCrouched: false, isHiding: false } as StealthState,
  onUseItem,
  onSelectWeapon,
  onToggleFlashlight,
  onReloadBattery,
  onToggleCrouch,
  onOpenPause
}) => {
  const medkit = inventory.find(i => i.type === 'medkit');
  const energyDrink = inventory.find(i => i.type === 'energy_drink');
  const batteryItem = inventory.find(i => i.type === 'battery');
  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const batteryPercent = Math.max(0, Math.min(100, (flashlightBattery / maxFlashlightBattery) * 100));
  const isLowHealth = health <= 35;
  const isLowBattery = batteryPercent <= 20;
  const isBatteryEmpty = batteryPercent <= 0;

  // Calculate approximate countdown time string till 06:00 AM
  const totalSecondsRemaining = Math.max(0, Math.round((1 - timeProgress) * 6 * 3600));
  const remHours = Math.floor(totalSecondsRemaining / 3600);
  const remMins = Math.floor((totalSecondsRemaining % 3600) / 60);
  const remSecs = totalSecondsRemaining % 60;
  const countdownString = `0${remHours}:${remMins < 10 ? '0' : ''}${remMins}:${remSecs < 10 ? '0' : ''}${remSecs}`;

  return (
    <div id="game_hud_root" className="absolute inset-0 pointer-events-none select-none overflow-hidden font-serif text-[#E0E0E0]">
      {/* Damage Flash Red Overlay */}
      {isDamageFlashing && (
        <div id="damage_flash_overlay" className="absolute inset-0 bg-[#8B0000]/35 animate-ping duration-150 pointer-events-none" />
      )}

      {/* Low Health Blood Vignette */}
      {isLowHealth && (
        <div id="low_health_vignette" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(139,0,0,0.45)_100%)] pointer-events-none animate-pulse" />
      )}

      {/* Dark Atmosphere Radial Vignette & Edge Border */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,transparent_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.96)_80%)] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none border-[24px] sm:border-[36px] border-transparent [border-image:radial-gradient(circle,transparent_70%,rgba(0,0,0,0.5)_100%)_1]" />

      {/* Top Header: Location, Time & Objectives */}
      <div className="absolute top-5 left-5 right-5 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Left Column: Location & Floor Tasks */}
        <div className="flex flex-col gap-1.5 max-w-lg">
          <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-[#777]">
            Current Location
          </span>
          <h1 className="text-xl sm:text-2xl font-normal text-[#C0C0C0] tracking-wide m-0">
            BLACKRIDGE HOTEL <span className="text-[#555] font-light">|</span> FLOOR {floorNumber}
          </h1>
          <span className="text-xs text-[#888] font-sans italic">
            {floorTitle}
          </span>

          <div className="flex flex-wrap items-stretch gap-2.5 mt-1.5">
            {/* Time Remaining Card */}
            <div id="time_remaining_card" className="bg-black/60 border border-white/10 px-3 py-1.5 backdrop-blur-md">
              <span className="block text-[9px] font-mono uppercase text-[#777] tracking-[0.15em]">
                Time Remaining
              </span>
              <span className="text-sm sm:text-base font-mono text-[#aa2222] font-medium tracking-wider">
                {countdownString}
              </span>
            </div>

            {/* Floor Multi-Objective Card */}
            <div id="floor_objectives_card" className="bg-black/60 border border-white/10 px-3.5 py-1.5 backdrop-blur-md flex flex-col gap-1 min-w-[260px]">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono uppercase text-[#777] tracking-[0.15em]">
                  Floor Progression Tasks
                </span>
                <span className="text-[9px] font-mono text-[#aaa]">
                  {objectives.filter(o => o.completed).length} / {objectives.length || 1} Done
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-0.5">
                {objectives.length > 0 ? (
                  objectives.map((obj) => (
                    <div key={obj.id} className="flex items-center gap-1.5 text-xs">
                      {obj.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                      )}
                      <span className={`text-[11px] font-sans ${obj.completed ? 'text-emerald-300 line-through opacity-80' : 'text-[#ddd]'}`}>
                        {obj.text}
                        {obj.total && !obj.completed && (
                          <span className="font-mono ml-1 text-amber-300 font-medium">
                            ({obj.current ?? 0}/{obj.total})
                          </span>
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[#aaa]">
                    <span>Destroy Cameras: {destroyedCameras} / {totalCameras}</span>
                  </div>
                )}
              </div>
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
          <div className="text-[10px] font-mono text-[#666] uppercase tracking-[0.25em]">
            Midnight Cycle
          </div>

          {/* Stealth & Hiding Status Badge */}
          <div className="mt-1 flex items-center gap-2">
            {stealthState.isHiding ? (
              <div id="stealth_hiding_badge" className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>HIDDEN ({stealthState.hidingSpotName || 'Shadows'})</span>
              </div>
            ) : stealthState.isCrouched ? (
              <div id="stealth_crouched_badge" className="px-3 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-200 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>CROUCHED // SILENT</span>
              </div>
            ) : null}

            <button
              id="pause_menu_btn"
              onClick={onOpenPause}
              className="pointer-events-auto px-3 py-1 bg-white/[0.03] hover:bg-white/[0.08] text-[#888] hover:text-[#E0E0E0] border border-white/10 text-[10px] font-mono tracking-[0.15em] uppercase transition cursor-pointer"
            >
              [ESC] Pause
            </button>
          </div>
        </div>
      </div>

      {/* Target Monster / Boss Health Bar (Top Center) */}
      <AnimatePresence>
        {targetMonster && (
          <motion.div
            id="monster_health_hud"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`absolute top-20 left-1/2 -translate-x-1/2 w-80 sm:w-96 px-4 py-2 bg-black/85 border ${
              targetMonster.isBoss ? 'border-[#8B0000] shadow-[0_0_15px_rgba(139,0,0,0.6)]' : 'border-white/15 shadow-xl'
            } backdrop-blur-md`}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <Skull className={`w-3.5 h-3.5 ${targetMonster.isBoss ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
                <span className="text-xs font-mono uppercase tracking-wider text-[#ddd] font-semibold">
                  {targetMonster.name}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#ff4444] font-bold">
                {targetMonster.health} / {targetMonster.maxHealth} HP
              </span>
            </div>
            <div className="h-2 bg-[#222] w-full relative overflow-hidden border border-black">
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-150 ${
                  targetMonster.isBoss
                    ? 'bg-gradient-to-r from-[#8B0000] via-[#cc1111] to-[#ff4444]'
                    : 'bg-gradient-to-r from-[#992222] to-[#dd3333]'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (targetMonster.health / targetMonster.maxHealth) * 100))}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center: Minimalist Sophisticated Crosshair */}
      <div id="hud_crosshair" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative flex items-center justify-center">
          <div className="w-1 h-1 bg-[#E0E0E0]/80 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          <div className="absolute w-5 h-5 border border-white/10 rounded-full" />
        </div>
      </div>

      {/* Center-Bottom: Interaction Prompt */}
      <AnimatePresence>
        {interactPrompt && (
          <motion.div
            id="interaction_prompt_box"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 px-6 py-2.5 border border-amber-400/40 bg-black/85 backdrop-blur-md rounded-[2px] shadow-2xl text-center"
          >
            <span className="text-xs sm:text-sm text-amber-200 tracking-[0.05em] font-serif font-medium">
              {interactPrompt}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horror Stinger / Event Alert Popup */}
      <AnimatePresence>
        {horrorStingerText && (
          <motion.div
            id="horror_stinger_box"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-32 left-1/2 -translate-x-1/2 px-6 py-2 border border-[#8B0000]/60 bg-[#0a0202]/95 backdrop-blur-md text-[#E0E0E0] text-xs font-mono tracking-[0.15em] uppercase shadow-2xl text-center flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF0000] shadow-[0_0_6px_#FF0000] animate-pulse" />
            <span>{horrorStingerText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Area: Vitals, Slots, and Weapons */}
      <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end gap-4">
        {/* Bottom Left: Vitality, Stamina & Quick Item Slots */}
        <div className="w-64 sm:w-72 flex flex-col gap-2.5">
          {/* Vitality Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#777]">
                Vitality
              </span>
              <span className="text-[11px] font-mono text-[#8B0000] font-bold">
                {Math.round(healthPercent)}%
              </span>
            </div>
            <div className="h-1.5 bg-[#1a1a1a] w-full relative overflow-hidden border border-white/5">
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
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#666]">
                Stamina
              </span>
              <span className="text-[10px] font-mono text-[#888]">
                {Math.round(staminaPercent)}%
              </span>
            </div>
            <div className="h-1 bg-[#141414] w-full relative overflow-hidden border border-white/5">
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#666] transition-all duration-150"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>

          {/* Inventory & Control Quick Slots */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 pointer-events-auto flex-wrap">
            {/* Medkit Slot */}
            <button
              id="quick_slot_medkit"
              onClick={() => onUseItem('medkit')}
              disabled={!medkit || medkit.count <= 0}
              className={`w-11 h-11 border flex items-center justify-center relative transition backdrop-blur-sm cursor-pointer ${
                medkit && medkit.count > 0
                  ? 'border-red-500/40 bg-red-950/20 hover:bg-red-900/40 hover:border-red-400 text-[#E0E0E0]'
                  : 'border-white/[0.05] bg-white/[0.01] text-[#444] cursor-not-allowed opacity-60'
              }`}
              title="Quick Medkit [Q / H]"
            >
              <div className="w-3.5 h-3.5 border border-[#8B0000] flex items-center justify-center text-[#ff3333] text-[10px] font-mono font-bold">
                +
              </div>
              <span className="absolute top-0.5 left-1 text-[7px] font-mono text-red-300/70 font-semibold">Q/H</span>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-amber-300 font-bold">
                x{medkit?.count || 0}
              </span>
            </button>

            {/* Energy Drink Slot */}
            <button
              id="quick_slot_drink"
              onClick={() => onUseItem('energy_drink')}
              disabled={!energyDrink || energyDrink.count <= 0}
              className={`w-11 h-11 border flex items-center justify-center relative transition backdrop-blur-sm cursor-pointer ${
                energyDrink && energyDrink.count > 0
                  ? 'border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-900/40 hover:border-emerald-400 text-[#E0E0E0]'
                  : 'border-white/[0.05] bg-white/[0.01] text-[#444] cursor-not-allowed opacity-60'
              }`}
              title="Energy Drink [X / J]"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="absolute top-0.5 left-1 text-[7px] font-mono text-emerald-300/70 font-semibold">X/J</span>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-amber-300 font-bold">
                x{energyDrink?.count || 0}
              </span>
            </button>

            {/* Battery Reload Quick Slot */}
            <button
              id="quick_slot_battery"
              onClick={() => (onReloadBattery ? onReloadBattery() : onUseItem('battery'))}
              disabled={!batteryItem || batteryItem.count <= 0}
              className={`w-11 h-11 border flex items-center justify-center relative transition backdrop-blur-sm cursor-pointer ${
                batteryItem && batteryItem.count > 0
                  ? isLowBattery
                    ? 'border-amber-400 bg-amber-950/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                    : 'border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/40 hover:border-amber-400 text-[#E0E0E0]'
                  : 'border-white/[0.05] bg-white/[0.01] text-[#444] cursor-not-allowed opacity-60'
              }`}
              title="Insert Flashlight Battery [B] (+60% charge)"
            >
              <Battery className={`w-3.5 h-3.5 ${isLowBattery && batteryItem && batteryItem.count > 0 ? 'text-amber-300 animate-bounce' : 'text-amber-400'}`} />
              <span className="absolute top-0.5 left-1 text-[7px] font-mono text-amber-300/80 font-semibold">B</span>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-amber-300 font-bold">
                x{batteryItem?.count || 0}
              </span>
            </button>

            {/* Flashlight Toggle & Battery Level Slot */}
            <button
              id="quick_slot_flashlight"
              onClick={() => onToggleFlashlight?.()}
              className={`w-14 h-11 border flex flex-col items-center justify-center relative transition cursor-pointer px-1 ${
                isBatteryEmpty
                  ? 'border-red-500/40 bg-red-950/20 text-red-400'
                  : isFlashlightOn
                    ? 'border-amber-400/60 bg-amber-950/30 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'border-white/10 bg-black/40 hover:bg-white/10 text-[#888]'
              }`}
              title={`Toggle Flashlight [F] (Battery: ${Math.round(batteryPercent)}%)`}
            >
              <span className="absolute top-0.5 left-1 text-[7px] font-mono text-amber-400">F</span>
              
              <div className="flex items-center gap-1 mt-0.5">
                {isBatteryEmpty ? (
                  <LightbulbOff className="w-3 h-3 text-red-400" />
                ) : isFlashlightOn ? (
                  <div className="w-2 h-2 rounded-full bg-[#EBCB8B] shadow-[0_0_6px_#EBCB8B]" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#555]" />
                )}
                <span className={`text-[8px] font-mono font-bold ${
                  isBatteryEmpty ? 'text-red-500' : isLowBattery ? 'text-red-400 animate-pulse' : 'text-amber-300'
                }`}>
                  {Math.round(batteryPercent)}%
                </span>
              </div>

              {/* Mini Battery Fill Bar */}
              <div className="w-full h-1 bg-[#111] mt-1 relative overflow-hidden border border-white/5">
                <div
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-150 ${
                    isBatteryEmpty
                      ? 'bg-transparent'
                      : isLowBattery
                        ? 'bg-red-500 animate-pulse'
                        : batteryPercent < 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-400'
                  }`}
                  style={{ width: `${batteryPercent}%` }}
                />
              </div>
            </button>

            {/* Crouch / Stealth Toggle Slot */}
            <button
              id="quick_slot_crouch"
              onClick={() => onToggleCrouch?.()}
              className={`w-11 h-11 border flex items-center justify-center relative transition cursor-pointer ${
                stealthState.isCrouched
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'border-white/10 bg-black/40 hover:bg-white/10 text-[#888]'
              }`}
              title="Toggle Crouch / Stealth [C]"
            >
              <span className="absolute top-0.5 left-1 text-[7px] font-mono text-amber-300">C</span>
              <span className="text-[10px] font-mono font-bold">{stealthState.isCrouched ? 'CROUCH' : 'STAND'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Right: Equipped Weapon & Ammo */}
        <div className="flex flex-col items-end text-right pointer-events-auto">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#777] mb-1">
            Equipped Weapon // [1-4]
          </span>
          <div className="flex items-center gap-3">
            <span className="text-base sm:text-lg font-serif font-medium text-[#E0E0E0]">
              {activeWeapon?.name || 'Unarmed'}
            </span>

            {activeWeapon && (
              <div className="pl-3 border-l border-white/10 font-mono">
                {activeWeapon.isRanged ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono text-amber-300 font-bold">{activeWeapon.ammo}</span>
                    <span className="text-xs text-[#777]">/{activeWeapon.maxAmmo}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-amber-200/80 uppercase tracking-wider font-semibold">Melee</span>
                )}
              </div>
            )}
          </div>

          {/* Quick Weapon Slots (Clickable or 1-4) */}
          <div className="flex items-center gap-1.5 mt-2">
            {weapons.map((w, idx) => {
              const isActive = activeWeapon?.id === w.id;
              return (
                <button
                  key={w.id}
                  id={`weapon_slot_${w.id}`}
                  onClick={() => onSelectWeapon?.(idx)}
                  className={`px-2.5 py-1 border text-[10px] font-mono tracking-wider transition cursor-pointer ${
                    isActive
                      ? 'border-[#8B0000] bg-[#8B0000]/30 text-white font-bold shadow-[0_0_8px_rgba(139,0,0,0.5)]'
                      : 'border-white/10 bg-black/40 hover:bg-white/10 text-[#888]'
                  }`}
                  title={`Select ${w.name} [${idx + 1}]`}
                >
                  <span className="text-amber-400 mr-1">[{idx + 1}]</span>
                  {w.name.split(' ')[0].toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Flashlight & Crouch Hint */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-mono uppercase text-[#777] tracking-[0.15em]">
              Stealth:
            </span>
            <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 border border-white/5">
              <span className="text-[9px] font-mono text-emerald-400 font-semibold">
                [C] Crouch into desks/wardrobes to hide
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
