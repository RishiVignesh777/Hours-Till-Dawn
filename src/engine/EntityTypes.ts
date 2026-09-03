import * as THREE from 'three';
import { FloorObjective, HeartbeatState, InventoryItem, NoteDoc, TargetMonsterInfo, Weapon } from '../types';

export interface EngineCallbacks {
  onHealthChange: (health: number, maxHealth: number) => void;
  onStaminaChange: (stamina: number, maxStamina: number) => void;
  onCamerasChange: (destroyed: number, total: number) => void;
  onFlashlightChange?: (isOn: boolean, battery: number, maxBattery: number) => void;
  onObjectivesChange?: (objectives: FloorObjective[]) => void;
  onTargetMonsterChange?: (target: TargetMonsterInfo | null) => void;
  onCrouchChange?: (isCrouched: boolean, isHiding: boolean, hidingSpotName?: string) => void;
  onHeartbeat?: (heartbeat: HeartbeatState) => void;
  onFloorChange: (floor: number) => void;
  onTimeChange: (timeString: string, progress: number) => void;
  onWeaponChange: (weapon: Weapon, availableWeapons: Weapon[]) => void;
  onInventoryChange: (items: InventoryItem[]) => void;
  onInteractPrompt: (prompt: string | null) => void;
  onOpenNote: (note: NoteDoc) => void;
  onDamageFlash: () => void;
  onQuickTurn?: () => void;
  onHorrorStinger: (text?: string) => void;
  onGameOver: (reason: 'died' | 'timed_out') => void;
  onVictory: () => void;
}

export interface WallBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CameraEntity {
  id: string;
  mesh: THREE.Group;
  lightMesh: THREE.Mesh;
  spotLight: THREE.SpotLight;
  x: number;
  y: number;
  z: number;
  health: number;
  isDestroyed: boolean;
  baseRotY: number;
  scanTime: number;
}

export interface MonsterEntity {
  id: string;
  type: 'crawler' | 'stalker' | 'brute' | 'phantom' | 'boss_warden';
  name: string;
  mesh: THREE.Group;
  eyeLight?: THREE.PointLight;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'ceiling_crawl' | 'flee' | 'dead';
  isDead: boolean;
  attackCooldown: number;
  ceilingY?: number;
  wanderAngle: number;
  flinchTimer: number;
  stunTimer: number;
  animLegs?: THREE.Mesh[];
  animArms?: THREE.Mesh[];
  animMandibles?: THREE.Mesh[];
  animTendrils?: THREE.Mesh[];
  animHead?: THREE.Mesh | THREE.Group;
  healthBarGroup?: THREE.Group;
  healthBarFill?: THREE.Mesh;
}

export interface BatterySpawnLocation {
  id: string;
  floor: number;
  x: number;
  y: number;
  z: number;
  surfaceType: 'table' | 'cupboard';
  locationName: string;
  rotationY?: number;
}

export interface ItemEntity {
  id: string;
  type: 'medkit' | 'energy_drink' | 'battery' | 'ammo' | 'key' | 'note' | 'aurelia_heart' | 'pistol' | 'revolver' | 'shotgun' | 'keycard' | 'sigil' | 'seal';
  mesh: THREE.Group;
  pickedUp: boolean;
  noteId?: string;
  name: string;
  locationName?: string;
  surfaceType?: 'table' | 'cupboard';
}

export interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ParanormalProp {
  id: string;
  type: 'chair' | 'painting' | 'door' | 'tv' | 'rolling_object';
  mesh: THREE.Group | THREE.Mesh;
  initialPos: THREE.Vector3;
  initialRot: THREE.Euler;
  state: 'idle' | 'animating' | 'done';
  animTimer: number;
  light?: THREE.PointLight;
  tvScreen?: THREE.Mesh;
  vel?: THREE.Vector3;
}

export interface InteractiveWorldObject {
  id: string;
  type: 'breaker' | 'firewall' | 'piano' | 'altar' | 'keycard_desk';
  mesh: THREE.Group | THREE.Mesh;
  position: THREE.Vector3;
  interacted: boolean;
  promptText: string;
  onInteract: () => void;
}

export interface HidingSpotEntity {
  id: string;
  name: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  type: 'wardrobe_closet' | 'under_desk' | 'under_bed' | 'under_gurney' | 'behind_partition';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}
