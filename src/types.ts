export type GameState = 
  | 'MENU' 
  | 'CINEMATIC_OPENING' 
  | 'PLAYING' 
  | 'PAUSED' 
  | 'GAME_OVER' 
  | 'VICTORY' 
  | 'CINEMATIC_ENDING';

export interface Weapon {
  id: 'pipe' | 'pistol' | 'revolver' | 'shotgun';
  name: string;
  damage: number;
  range: number;
  ammo: number;
  maxAmmo: number;
  isRanged: boolean;
  cooldown: number; // in ms
}

export interface InventoryItem {
  id: string;
  type: 'medkit' | 'energy_drink' | 'battery' | 'ammo' | 'key' | 'note' | 'aurelia_heart' | 'pistol' | 'revolver' | 'shotgun';
  name: string;
  description: string;
  count: number;
  icon?: string;
  noteText?: string;
}

export interface SecurityCameraData {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  isDestroyed: boolean;
  health: number;
}

export interface MonsterData {
  id: string;
  type: 'crawler' | 'stalker' | 'brute' | 'phantom' | 'boss_warden';
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'dead' | 'ceiling_crawl';
  ceilingY?: number;
  isDead: boolean;
  attackCooldown: number;
}

export interface ItemPickupData {
  id: string;
  type: 'medkit' | 'energy_drink' | 'battery' | 'ammo' | 'key' | 'note' | 'aurelia_heart' | 'pistol' | 'revolver' | 'shotgun';
  name: string;
  x: number;
  y: number;
  z: number;
  pickedUp: boolean;
  noteText?: string;
}

export interface FloorObjective {
  id: string;
  text: string;
  completed: boolean;
  current?: number;
  total?: number;
}

export interface StealthState {
  isCrouched: boolean;
  isHiding: boolean;
  hidingSpotName?: string;
}

export interface TargetMonsterInfo {
  name: string;
  type: string;
  health: number;
  maxHealth: number;
  isBoss?: boolean;
}

export interface FloorConfig {
  floorNumber: number;
  name: string;
  subtitle: string;
  description: string;
  targetCamerasCount: number;
  ambientColor: string;
  fogDensity: number;
  fogColor: string;
  horrorAtmosphere: string;
  unlockRequirementText: string;
  objectives?: FloorObjective[];
}

export interface NoteDoc {
  id: string;
  title: string;
  date: string;
  author: string;
  content: string;
}
