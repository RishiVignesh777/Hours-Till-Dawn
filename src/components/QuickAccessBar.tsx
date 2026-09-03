import React from 'react';
import { InventoryItem } from '../types';
import { HeartPulse, Zap, BatteryCharging, ChevronLeft, ChevronRight, Sparkles, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../audio/SoundEngine';

export type QuickItemType = 'medkit' | 'energy_drink' | 'battery';

interface QuickAccessBarProps {
  inventory: InventoryItem[];
  selectedItemType: QuickItemType;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  flashlightBattery: number;
  maxFlashlightBattery: number;
  onSelectItem: (type: QuickItemType) => void;
  onCycleItem: (direction: 1 | -1) => void;
  onUseItem: (type: QuickItemType) => void;
}

interface QuickItemDefinition {
  type: QuickItemType;
  label: string;
  category: 'HEALTH' | 'STAMINA' | 'POWER';
  quickKey: string;
  effectText: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  activeBorder: string;
  activeGlow: string;
  badgeBg: string;
}

const QUICK_ITEMS: QuickItemDefinition[] = [
  {
    type: 'medkit',
    label: 'Emergency Medkit',
    category: 'HEALTH',
    quickKey: 'Q',
    effectText: '+50 Vitality Restoration',
    icon: HeartPulse,
    accentColor: 'text-red-400',
    activeBorder: 'border-red-500',
    activeGlow: 'shadow-[0_0_16px_rgba(239,68,68,0.45)]',
    badgeBg: 'bg-red-950/80 text-red-300 border-red-500/40',
  },
  {
    type: 'energy_drink',
    label: 'Adrenaline Surge',
    category: 'STAMINA',
    quickKey: 'X',
    effectText: 'Full Stamina & 15s Sprint Boost (+15 HP)',
    icon: Zap,
    accentColor: 'text-emerald-400',
    activeBorder: 'border-emerald-500',
    activeGlow: 'shadow-[0_0_16px_rgba(16,185,129,0.45)]',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  {
    type: 'battery',
    label: 'Heavy-Duty Battery',
    category: 'POWER',
    quickKey: 'B',
    effectText: '+60% Flashlight Charge & Torch Boost',
    icon: BatteryCharging,
    accentColor: 'text-amber-400',
    activeBorder: 'border-amber-500',
    activeGlow: 'shadow-[0_0_16px_rgba(245,158,11,0.45)]',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
];

export const QuickAccessBar: React.FC<QuickAccessBarProps> = ({
  inventory,
  selectedItemType,
  health,
  maxHealth,
  stamina,
  maxStamina,
  flashlightBattery,
  maxFlashlightBattery,
  onSelectItem,
  onCycleItem,
  onUseItem,
}) => {
  const getCount = (type: QuickItemType): number => {
    const item = inventory.find(i => i.type === type);
    return item ? item.count : 0;
  };

  const selectedDef = QUICK_ITEMS.find(item => item.type === selectedItemType) || QUICK_ITEMS[0];
  const selectedCount = getCount(selectedDef.type);

  // Status computation for feedback
  const isSelectedMaxed =
    (selectedDef.type === 'medkit' && health >= maxHealth) ||
    (selectedDef.type === 'battery' && flashlightBattery >= maxFlashlightBattery);

  const canUseSelected = selectedCount > 0 && !isSelectedMaxed;

  const handleConsume = (type: QuickItemType) => {
    onUseItem(type);
  };

  return (
    <div
      id="quick_access_hud_bar"
      className="pointer-events-auto flex flex-col items-center select-none"
    >
      {/* Top Micro-Header / Cycling Directives */}
      <div className="flex items-center justify-between w-full max-w-[340px] px-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
          <span className="text-[8px] font-mono tracking-[0.2em] text-amber-300/90 font-bold uppercase">
            Quick Inventory // Hotbar
          </span>
        </div>
        <div className="flex items-center gap-2 text-[8px] font-mono text-[#888]">
          <span className="bg-white/10 px-1 py-0.2 rounded text-white/90">[G/T] CYCLE</span>
          <span className="bg-white/10 px-1 py-0.2 rounded text-white/90">[U] CONSUME</span>
        </div>
      </div>

      {/* Main Bar Container */}
      <div className="relative flex items-center gap-1.5 p-1.5 bg-black/85 backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.8)] rounded-sm">
        {/* Cycle Left Button */}
        <button
          id="btn_quick_bar_prev"
          onClick={() => {
            soundEngine.playItemCycle();
            onCycleItem(-1);
          }}
          className="w-7 h-14 flex items-center justify-center bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-[#888] hover:text-amber-300 transition-colors cursor-pointer group"
          title="Previous Item [G / [ ]"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </button>

        {/* Quick Item Slots */}
        <div className="flex items-center gap-1.5">
          {QUICK_ITEMS.map((itemDef) => {
            const count = getCount(itemDef.type);
            const isSelected = selectedItemType === itemDef.type;
            const IconComponent = itemDef.icon;
            const isDepleted = count <= 0;

            const isItemFull =
              (itemDef.type === 'medkit' && health >= maxHealth) ||
              (itemDef.type === 'battery' && flashlightBattery >= maxFlashlightBattery);

            return (
              <button
                key={itemDef.type}
                id={`quick_item_slot_${itemDef.type}`}
                onClick={() => {
                  if (isSelected) {
                    handleConsume(itemDef.type);
                  } else {
                    soundEngine.playItemCycle();
                    onSelectItem(itemDef.type);
                  }
                }}
                className={`relative w-20 h-14 p-1.5 flex flex-col justify-between border transition-all duration-150 cursor-pointer text-left overflow-hidden ${
                  isSelected
                    ? `${itemDef.activeBorder} bg-white/[0.08] ${itemDef.activeGlow} scale-[1.02]`
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20'
                }`}
                title={`${itemDef.label} [${itemDef.quickKey}] - Click to select or consume`}
              >
                {/* Active Selector Corner Brackets */}
                {isSelected && (
                  <>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-amber-400" />
                  </>
                )}

                {/* Top Row: Quick Key & Category */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded border ${
                      isSelected
                        ? 'bg-amber-400 text-black border-amber-300 font-extrabold'
                        : 'bg-black/60 text-[#888] border-white/10'
                    }`}
                  >
                    [{itemDef.quickKey}]
                  </span>

                  <span
                    className={`text-[7px] font-mono tracking-wider uppercase font-semibold ${
                      isSelected ? itemDef.accentColor : 'text-[#666]'
                    }`}
                  >
                    {itemDef.category}
                  </span>
                </div>

                {/* Center / Middle Row: Icon & Count */}
                <div className="flex items-center justify-between w-full mt-0.5">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center ${
                      isSelected ? 'bg-white/10' : 'bg-black/40'
                    }`}
                  >
                    <IconComponent
                      className={`w-3.5 h-3.5 ${
                        isDepleted ? 'text-[#555]' : itemDef.accentColor
                      }`}
                    />
                  </div>

                  {/* Quantity Badge */}
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-bold tracking-tight ${
                        isDepleted
                          ? 'text-red-500/80 line-through'
                          : isSelected
                          ? 'text-amber-300'
                          : 'text-white/90'
                      }`}
                    >
                      x{count}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Status Tag */}
                <div className="w-full text-right mt-0.5">
                  {isDepleted ? (
                    <span className="text-[7px] font-mono text-red-500 uppercase tracking-wider">
                      DEPLETED
                    </span>
                  ) : isItemFull ? (
                    <span className="text-[7px] font-mono text-emerald-400/80 uppercase tracking-wider">
                      FULL
                    </span>
                  ) : (
                    <span className="text-[7px] font-mono text-[#888] group-hover:text-amber-300 uppercase tracking-wider">
                      READY
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Cycle Right Button */}
        <button
          id="btn_quick_bar_next"
          onClick={() => {
            soundEngine.playItemCycle();
            onCycleItem(1);
          }}
          className="w-7 h-14 flex items-center justify-center bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-[#888] hover:text-amber-300 transition-colors cursor-pointer group"
          title="Next Item [G / T / ] ]"
        >
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Consume Selected Action Button */}
        <div className="pl-1 border-l border-white/10">
          <button
            id="btn_consume_selected"
            onClick={() => handleConsume(selectedDef.type)}
            disabled={!canUseSelected}
            className={`h-14 px-3 flex flex-col items-center justify-center border transition-all cursor-pointer ${
              canUseSelected
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95'
                : 'bg-white/[0.02] border-white/5 text-[#555] cursor-not-allowed'
            }`}
            title={`Consume ${selectedDef.label} [U]`}
          >
            <span className="text-[7px] font-mono tracking-widest text-amber-300 font-bold uppercase mb-0.5">
              [U]
            </span>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
              USE
            </span>
            <span className="text-[7px] font-mono text-[#888] mt-0.5">
              {selectedCount > 0 ? (isSelectedMaxed ? 'MAX' : 'APPLY') : 'EMPTY'}
            </span>
          </button>
        </div>
      </div>

      {/* Selected Item Detail Description Strip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDef.type}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.12 }}
          className="mt-1 px-2.5 py-0.5 bg-black/60 border border-white/10 rounded flex items-center gap-2 text-[8px] font-mono"
        >
          <span className={`font-semibold uppercase ${selectedDef.accentColor}`}>
            {selectedDef.label}:
          </span>
          <span className="text-[#B0B0B0]">{selectedDef.effectText}</span>
          <span className="text-[#555]">•</span>
          <span className="text-amber-400 font-semibold">
            {selectedCount > 0 ? `${selectedCount} in pack` : 'None in pack'}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
