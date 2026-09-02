/**
 * Hours Till Dawn - 3D First-Person Single-Player Survival Horror Action Game
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FloorObjective, GameState, InventoryItem, NoteDoc, StealthState, TargetMonsterInfo, Weapon } from './types';
import { HorrorEngine } from './engine/HorrorEngine';
import { soundEngine } from './audio/SoundEngine';
import { FLOOR_CONFIGS } from './engine/LevelData';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { OpeningCinematic } from './components/OpeningCinematic';
import { EndingCinematic } from './components/EndingCinematic';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { NoteModal } from './components/NoteModal';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HorrorEngine | null>(null);

  // Player & Level State for HUD
  const [health, setHealth] = useState<number>(100);
  const [maxHealth, setMaxHealth] = useState<number>(100);
  const [stamina, setStamina] = useState<number>(100);
  const [maxStamina, setMaxStamina] = useState<number>(100);
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [timeString, setTimeString] = useState<string>('12:00 AM');
  const [timeProgress, setTimeProgress] = useState<number>(0);
  const [destroyedCameras, setDestroyedCameras] = useState<number>(0);
  const [totalCameras, setTotalCameras] = useState<number>(2);
  const [floorObjectives, setFloorObjectives] = useState<FloorObjective[]>([]);
  const [targetMonster, setTargetMonster] = useState<TargetMonsterInfo | null>(null);
  const [stealthState, setStealthState] = useState<StealthState>({ isCrouched: false, isHiding: false });
  const [activeWeapon, setActiveWeapon] = useState<Weapon | null>({
    id: 'pipe',
    name: 'Lead Pipe',
    damage: 35,
    range: 2.8,
    ammo: 1,
    maxAmmo: 1,
    isRanged: false,
    cooldown: 500,
  });
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 'medkit', type: 'medkit', name: 'Emergency Medkit', description: 'Restores +50 Health', count: 1 },
    { id: 'energy_drink', type: 'energy_drink', name: 'Stamina Surge Drink', description: 'Restores stamina & speed for 15s', count: 1 },
    { id: 'battery', type: 'battery', name: 'Flashlight Battery', description: 'Heavy-Duty Cell. Restores Flashlight Battery +60% [B]', count: 1 },
  ]);
  const [flashlightBattery, setFlashlightBattery] = useState<number>(100);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(true);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<NoteDoc | null>(null);
  const [horrorStingerText, setHorrorStingerText] = useState<string | null>(null);
  const [isDamageFlashing, setIsDamageFlashing] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<'died' | 'timed_out'>('died');

  // Settings
  const [sensitivity, setSensitivity] = useState<number>(0.0022);
  const [volume, setVolume] = useState<number>(0.75);

  // Initialize or Clean Up 3D Engine when entering PLAYING state
  useEffect(() => {
    if (gameState === 'PLAYING' && canvasContainerRef.current) {
      if (!engineRef.current) {
        engineRef.current = new HorrorEngine(canvasContainerRef.current, {
          onHealthChange: (h, maxH) => {
            setHealth(h);
            setMaxHealth(maxH);
          },
          onStaminaChange: (s, maxS) => {
            setStamina(s);
            setMaxStamina(maxS);
          },
          onCamerasChange: (destroyed, total) => {
            setDestroyedCameras(destroyed);
            setTotalCameras(total);
          },
          onObjectivesChange: (objectives) => {
            setFloorObjectives([...objectives]);
          },
          onTargetMonsterChange: (target) => {
            setTargetMonster(target);
          },
          onCrouchChange: (isCrouched, isHiding, hidingSpotName) => {
            setStealthState({ isCrouched, isHiding, hidingSpotName });
          },
          onFloorChange: (fl) => {
            setCurrentFloor(fl);
          },
          onTimeChange: (tStr, prog) => {
            setTimeString(tStr);
            setTimeProgress(prog);
          },
          onWeaponChange: (w, allW) => {
            setActiveWeapon(w);
            setWeapons(allW);
          },
          onInventoryChange: (inv) => {
            setInventory([...inv]);
          },
          onFlashlightChange: (isOn, battery, maxBatt) => {
            setIsFlashlightOn(isOn);
            setFlashlightBattery(battery);
          },
          onInteractPrompt: (prompt) => {
            setInteractPrompt(prompt);
          },
          onOpenNote: (note) => {
            setActiveNote(note);
          },
          onDamageFlash: () => {
            setIsDamageFlashing(true);
            setTimeout(() => setIsDamageFlashing(false), 200);
          },
          onHorrorStinger: (text) => {
            if (text) {
              setHorrorStingerText(text);
              setTimeout(() => setHorrorStingerText(null), 3500);
            }
          },
          onGameOver: (reason) => {
            setGameOverReason(reason);
            setGameState('GAME_OVER');
          },
          onVictory: () => {
            setGameState('CINEMATIC_ENDING');
          },
        });

        engineRef.current.setMouseSensitivity(sensitivity);
      } else {
        engineRef.current.resume();
      }
    }

    return () => {
      if (gameState === 'MENU' && engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [gameState, sensitivity]);

  // Handle ESC for Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeNote) {
          setActiveNote(null);
          return;
        }
        if (gameState === 'PLAYING') {
          engineRef.current?.pause();
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          engineRef.current?.resume();
          setGameState('PLAYING');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeNote]);

  const handleStartNewGame = () => {
    setGameState('CINEMATIC_OPENING');
  };

  const handleSelectFloor = (floor: number) => {
    setCurrentFloor(floor);
    setGameState('PLAYING');
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.loadFloor(floor);
      }
    }, 100);
  };

  const handleStartFromOpening = () => {
    setGameState('PLAYING');
  };

  const handleResume = () => {
    engineRef.current?.resume();
    setGameState('PLAYING');
  };

  const handleRestartFloor = () => {
    engineRef.current?.restartFloor();
    setGameState('PLAYING');
  };

  const handleRestartFullGame = () => {
    engineRef.current?.restartFullGame();
    setGameState('PLAYING');
  };

  const handleUseItem = (type: 'medkit' | 'energy_drink' | 'battery') => {
    engineRef.current?.useItem(type);
  };

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    engineRef.current?.setMouseSensitivity(val);
  };

  const floorTitle = FLOOR_CONFIGS[currentFloor]?.name || `Floor ${currentFloor}`;

  return (
    <main id="app_root" className="relative w-screen h-screen bg-[#050505] overflow-hidden font-serif text-[#E0E0E0]">
      {/* 3D WebGL Canvas Layer */}
      <div
        id="canvas_container"
        ref={canvasContainerRef}
        className={`absolute inset-0 w-full h-full ${
          gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAME_OVER'
            ? 'block'
            : 'hidden'
        }`}
      />

      {/* Main Menu State */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartNewGame={handleStartNewGame}
          onSelectFloor={handleSelectFloor}
        />
      )}

      {/* Opening Cinematic Slides */}
      {gameState === 'CINEMATIC_OPENING' && (
        <OpeningCinematic onStartGame={handleStartFromOpening} />
      )}

      {/* Ending Cinematic Slides */}
      {gameState === 'CINEMATIC_ENDING' && (
        <EndingCinematic onRestart={() => setGameState('MENU')} />
      )}

      {/* In-Game HUD Overlay */}
      {gameState === 'PLAYING' && (
        <HUD
          health={health}
          maxHealth={maxHealth}
          stamina={stamina}
          maxStamina={maxStamina}
          timeString={timeString}
          timeProgress={timeProgress}
          floorNumber={currentFloor}
          floorTitle={floorTitle}
          destroyedCameras={destroyedCameras}
          totalCameras={totalCameras}
          objectives={floorObjectives}
          targetMonster={targetMonster}
          stealthState={stealthState}
          activeWeapon={activeWeapon}
          weapons={weapons}
          inventory={inventory}
          flashlightBattery={flashlightBattery}
          isFlashlightOn={isFlashlightOn}
          interactPrompt={interactPrompt}
          horrorStingerText={horrorStingerText}
          isDamageFlashing={isDamageFlashing}
          onUseItem={handleUseItem}
          onReloadBattery={() => engineRef.current?.reloadBattery()}
          onSelectWeapon={(index) => engineRef.current?.switchWeapon(index)}
          onToggleFlashlight={() => engineRef.current?.toggleFlashlight()}
          onToggleCrouch={() => engineRef.current?.toggleCrouch()}
          onOpenPause={() => {
            engineRef.current?.pause();
            setGameState('PAUSED');
          }}
        />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'PAUSED' && (
        <PauseMenu
          currentFloor={currentFloor}
          sensitivity={sensitivity}
          volume={volume}
          onSensitivityChange={handleSensitivityChange}
          onVolumeChange={setVolume}
          onResume={handleResume}
          onRestartFloor={handleRestartFloor}
          onRestartGame={handleRestartFullGame}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          reason={gameOverReason}
          currentFloor={currentFloor}
          onRestartFloor={handleRestartFloor}
          onRestartGame={handleRestartFullGame}
        />
      )}

      {/* Lore Note Viewer Modal */}
      {activeNote && (
        <NoteModal
          note={activeNote}
          onClose={() => setActiveNote(null)}
        />
      )}
    </main>
  );
}
