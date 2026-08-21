import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';
import { FLOOR_CONFIGS, LORE_NOTES } from './LevelData';
import { TextureGenerator } from './TextureGenerator';
import { InventoryItem, NoteDoc, Weapon } from '../types';

export interface EngineCallbacks {
  onHealthChange: (health: number, maxHealth: number) => void;
  onStaminaChange: (stamina: number, maxStamina: number) => void;
  onCamerasChange: (destroyed: number, total: number) => void;
  onFloorChange: (floor: number) => void;
  onTimeChange: (timeString: string, progress: number) => void;
  onWeaponChange: (weapon: Weapon, availableWeapons: Weapon[]) => void;
  onInventoryChange: (items: InventoryItem[]) => void;
  onInteractPrompt: (prompt: string | null) => void;
  onOpenNote: (note: NoteDoc) => void;
  onDamageFlash: () => void;
  onHorrorStinger: (text?: string) => void;
  onGameOver: (reason: 'died' | 'timed_out') => void;
  onVictory: () => void;
}

interface WallBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface CameraEntity {
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

interface MonsterEntity {
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
}

interface ItemEntity {
  id: string;
  type: 'medkit' | 'energy_drink' | 'ammo' | 'key' | 'note' | 'aurelia_heart' | 'pistol' | 'revolver' | 'shotgun';
  mesh: THREE.Group;
  pickedUp: boolean;
  noteId?: string;
  name: string;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class HorrorEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private isPointerLocked: boolean = false;

  // Player State
  private playerPos = new THREE.Vector3(0, 1.6, 0);
  private playerRot = { yaw: 0, pitch: 0 };
  private playerVelocity = new THREE.Vector3();
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private isSprinting = false;
  private speedBoostTimer = 0;

  // Inventory & Weapons
  private weapons: Weapon[] = [
    { id: 'pipe', name: 'Lead Pipe', damage: 35, range: 2.8, ammo: 1, maxAmmo: 1, isRanged: false, cooldown: 550 },
  ];
  private currentWeaponIndex = 0;
  private weaponCooldownTimer = 0;
  private inventory: InventoryItem[] = [
    { id: 'medkit', type: 'medkit', name: 'Emergency Medkit', description: 'Restores +50 Health', count: 1 },
    { id: 'energy_drink', type: 'energy_drink', name: 'Stamina Surge Drink', description: 'Restores stamina & boosts speed for 15s', count: 1 },
  ];

  // Flashlight & Viewmodel
  private flashlight: THREE.SpotLight | null = null;
  private flashlightTarget: THREE.Object3D | null = null;
  private torchInnerGlow: THREE.PointLight | null = null;
  private isFlashlightOn: boolean = true;
  private flashlightFlickerTimer: number = 0;
  private viewmodelGroup: THREE.Group | null = null;
  private pipeMesh: THREE.Group | null = null;
  private pistolMesh: THREE.Group | null = null;
  private revolverMesh: THREE.Group | null = null;
  private shotgunMesh: THREE.Group | null = null;
  private heartAltarMesh: THREE.Group | null = null;
  private heartGemMesh: THREE.Mesh | null = null;

  // Level & Progression
  public currentFloor: number = 1;
  private destroyedCamerasCount: number = 0;
  private totalCamerasCount: number = 4;
  private isStairsUnlocked: boolean = false;
  private stairsDoorMesh: THREE.Group | null = null;
  private stairsLight: THREE.PointLight | null = null;

  // Game Time (12:00 AM -> 06:00 AM = 360 virtual minutes, total ~15-20 min gameplay or 600s real time)
  private totalGameSeconds: number = 0;
  private maxNightSeconds: number = 900; // 15 mins total deadline
  private gameTimeProgress: number = 0;

  // Entities & World
  private walls: WallBox[] = [];
  private cameraEntities: CameraEntity[] = [];
  private monsterEntities: MonsterEntity[] = [];
  private itemEntities: ItemEntity[] = [];
  private particles: Particle[] = [];

  // Input
  private keys: Record<string, boolean> = {
    w: false, a: false, s: false, d: false, shift: false, e: false, f: false, r: false,
  };
  private mouseSensitivity: number = 0.0022;
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();
  private footstepTimer: number = 0;
  private heartbeatTimer: number = 0;

  // Visual Horror Effects
  private horrorGlitchIntensity: number = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Three.js Scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1.6, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    container.appendChild(this.renderer.domElement);

    this.setupFlashlight();
    this.setupViewmodels();
    this.bindEvents();
    this.loadFloor(1);

    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  public setMouseSensitivity(val: number) {
    this.mouseSensitivity = val;
  }

  private setupFlashlight() {
    // Powerful high-intensity torch beam
    this.flashlight = new THREE.SpotLight(0xfffaed, 5.2, 35, Math.PI / 4.8, 0.35, 1.5);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 35;
    this.flashlight.shadow.bias = -0.001;

    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.scene.add(this.flashlight);

    // Inner wide fill glow for torch to illuminate foreground clearly
    this.torchInnerGlow = new THREE.PointLight(0xfff5dc, 1.4, 10, 1.8);
    this.scene.add(this.torchInnerGlow);

    // Balanced ambient light so dark corridors are shadowy but readable
    const ambient = new THREE.AmbientLight(0x18202c, 0.42);
    this.scene.add(ambient);
  }

  private setupViewmodels() {
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);
    this.scene.add(this.camera);

    // 1. Lead Pipe Viewmodel
    this.pipeMesh = new THREE.Group();
    const pipeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.4, metalness: 0.85 });
    const pipeObj = new THREE.Mesh(pipeGeom, pipeMat);
    pipeObj.rotation.x = Math.PI / 3;
    pipeObj.rotation.z = -Math.PI / 6;

    // Handle grip tape
    const gripGeom = new THREE.CylinderGeometry(0.027, 0.027, 0.2, 12);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1f1917, roughness: 0.9 });
    const gripObj = new THREE.Mesh(gripGeom, gripMat);
    gripObj.position.y = -0.2;
    pipeObj.add(gripObj);

    this.pipeMesh.add(pipeObj);
    this.pipeMesh.position.set(0.28, -0.3, -0.45);
    this.viewmodelGroup.add(this.pipeMesh);

    // 2. Tactical 9mm Pistol Viewmodel
    this.pistolMesh = new THREE.Group();
    const pSteelMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.9, roughness: 0.25 });
    const pPolymerMat = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.85 });
    const pSightMat = new THREE.MeshBasicMaterial({ color: 0x33ff66 });

    // Pistol Slide
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.24), pSteelMat);
    pSlide.position.set(0, 0.035, -0.06);

    // Slide Serrations & Barrel
    const pBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 12), pSteelMat);
    pBarrel.rotation.x = Math.PI / 2;
    pBarrel.position.set(0, 0.035, -0.19);

    // Pistol Frame & Grip
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.065), pPolymerMat);
    pGrip.rotation.x = -0.22;
    pGrip.position.set(0, -0.05, 0.02);

    // Trigger Guard & Trigger
    const pGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.05), pPolymerMat);
    pGuard.position.set(0, -0.01, -0.04);
    const pTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.022, 0.012), pSteelMat);
    pTrigger.rotation.x = -0.2;
    pTrigger.position.set(0, -0.01, -0.035);

    // Tritium Iron Sights (Green luminous dots)
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.008), pSightMat);
    frontSight.position.set(0, 0.066, -0.17);
    const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.006), pSightMat);
    rearSightL.position.set(-0.014, 0.066, 0.05);
    const rearSightR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.006), pSightMat);
    rearSightR.position.set(0.014, 0.066, 0.05);

    this.pistolMesh.add(pSlide, pBarrel, pGrip, pGuard, pTrigger, frontSight, rearSightL, rearSightR);
    this.pistolMesh.position.set(0.24, -0.26, -0.4);
    this.pistolMesh.visible = false;
    this.viewmodelGroup.add(this.pistolMesh);

    // 3. Revolver Viewmodel
    this.revolverMesh = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.9, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.7 });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.15);

    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), gunMat);
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(0, 0.04, -0.02);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), woodMat);
    grip.rotation.x = -0.3;
    grip.position.set(0, -0.06, 0.06);

    this.revolverMesh.add(barrel, cylinder, grip);
    this.revolverMesh.position.set(0.25, -0.28, -0.42);
    this.revolverMesh.visible = false;
    this.viewmodelGroup.add(this.revolverMesh);

    // 4. Shotgun Viewmodel
    this.shotgunMesh = new THREE.Group();
    const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 12), gunMat);
    sBarrel.rotation.x = Math.PI / 2;
    sBarrel.position.set(0, 0.04, -0.25);
    const sStock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.25), woodMat);
    sStock.position.set(0, -0.04, 0.1);
    this.shotgunMesh.add(sBarrel, sStock);
    this.shotgunMesh.position.set(0.25, -0.28, -0.45);
    this.shotgunMesh.visible = false;
    this.viewmodelGroup.add(this.shotgunMesh);
  }

  public loadFloor(floorNum: number) {
    this.currentFloor = floorNum;
    const config = FLOOR_CONFIGS[floorNum] || FLOOR_CONFIGS[1];
    soundEngine.startAmbient(floorNum);

    // Clear previous entities from scene
    this.clearLevelEntities();

    // Scene Fog & Lighting
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    this.scene.background = new THREE.Color(config.fogColor);

    // Build Modular Hotel Environment
    this.buildHotelLayout(floorNum);

    // Reset Player to start of floor
    this.playerPos.set(0, 1.6, 2);
    this.playerVelocity.set(0, 0, 0);
    this.playerRot = { yaw: 0, pitch: 0 };
    this.camera.position.copy(this.playerPos);

    // Reset floor cameras state
    this.destroyedCamerasCount = 0;
    this.totalCamerasCount = config.targetCamerasCount;
    this.isStairsUnlocked = floorNum === 5; // Boss floor

    this.callbacks.onFloorChange(floorNum);
    this.callbacks.onCamerasChange(0, this.totalCamerasCount);
    this.callbacks.onHealthChange(this.health, this.maxHealth);
    this.callbacks.onStaminaChange(this.stamina, this.maxStamina);
    this.callbacks.onWeaponChange(this.weapons[this.currentWeaponIndex], this.weapons);
    this.callbacks.onInventoryChange(this.inventory);

    // Play floor intro sound
    soundEngine.playHorrorStinger();
  }

  private clearLevelEntities() {
    // Remove walls, items, monsters, cameras
    this.cameraEntities.forEach((c) => this.scene.remove(c.mesh));
    this.cameraEntities = [];

    this.monsterEntities.forEach((m) => this.scene.remove(m.mesh));
    this.monsterEntities = [];

    this.itemEntities.forEach((i) => this.scene.remove(i.mesh));
    this.itemEntities = [];

    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];

    this.walls = [];

    // Remove old room geometry meshes
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.name.startsWith('hotel_') || obj.name.startsWith('prop_')) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => this.scene.remove(obj));
  }

  private addWallBox(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.walls.push({
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
    });
  }

  private buildHotelLayout(floor: number) {
    const wallTex = TextureGenerator.getWallpaper(floor);
    wallTex.repeat.set(2, 1);
    const floorTex = TextureGenerator.getFloorTexture(floor);
    floorTex.repeat.set(3, 10);
    const ceilTex = TextureGenerator.getCeilingTexture();
    ceilTex.repeat.set(4, 12);

    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.65 });
    const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9 });

    // Main Corridor Length & Width
    const corridorLength = 48;
    const corridorWidth = 4.2;
    const wallHeight = 3.6;

    // Floor Mesh
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth + 16, corridorLength + 8), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -corridorLength / 2 + 4);
    floorMesh.receiveShadow = true;
    floorMesh.name = 'hotel_floor';
    this.scene.add(floorMesh);

    // Ceiling Mesh
    const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth + 16, corridorLength + 8), ceilMat);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(0, wallHeight, -corridorLength / 2 + 4);
    ceilMesh.name = 'hotel_ceiling';
    this.scene.add(ceilMesh);

    // Main Corridor Left & Right Walls with Room Openings
    const wallThickness = 0.4;
    const halfW = corridorWidth / 2;

    // Left Wall segments
    for (let z = 4; z > -corridorLength; z -= 8) {
      // Wall segment
      const wallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, 6);
      const wallLeft = new THREE.Mesh(wallGeom, wallMat);
      wallLeft.position.set(-halfW, wallHeight / 2, z - 3);
      wallLeft.castShadow = true;
      wallLeft.receiveShadow = true;
      wallLeft.name = 'hotel_wall_left';
      this.scene.add(wallLeft);
      this.addWallBox(-halfW - wallThickness / 2, -halfW + wallThickness / 2, z - 6, z);

      // Add a hotel door or painting on this segment
      if (z % 16 === 0) {
        this.createDoor(-halfW + 0.1, 1.2, z - 3, Math.PI / 2, `${floor}0${Math.abs(Math.floor(z / 8)) + 1}`);
      } else {
        this.createPainting(-halfW + 0.05, 2.0, z - 3, Math.PI / 2, Math.abs(z));
      }
    }

    // Right Wall segments
    for (let z = 4; z > -corridorLength; z -= 8) {
      const wallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, 6);
      const wallRight = new THREE.Mesh(wallGeom, wallMat);
      wallRight.position.set(halfW, wallHeight / 2, z - 3);
      wallRight.castShadow = true;
      wallRight.receiveShadow = true;
      wallRight.name = 'hotel_wall_right';
      this.scene.add(wallRight);
      this.addWallBox(halfW - wallThickness / 2, halfW + wallThickness / 2, z - 6, z);

      if (z % 16 === 8) {
        this.createDoor(halfW - 0.1, 1.2, z - 3, -Math.PI / 2, `${floor}0${Math.abs(Math.floor(z / 8)) + 5}`);
      } else {
        this.createPainting(halfW - 0.05, 2.0, z - 3, -Math.PI / 2, Math.abs(z) + 1);
      }
    }

    // Back Wall (Entrance)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth + 4, wallHeight, wallThickness), wallMat);
    backWall.position.set(0, wallHeight / 2, 5);
    backWall.castShadow = true;
    backWall.name = 'hotel_back_wall';
    this.scene.add(backWall);
    this.addWallBox(-corridorWidth / 2 - 2, corridorWidth / 2 + 2, 5 - wallThickness / 2, 5 + wallThickness / 2);

    // Entrance Vestibule Doors & Grand Entrance Lighting at the start of the hall
    this.createEntranceVestibule(corridorWidth, wallHeight);

    // Center Velvet Carpet Runner
    const carpetMat = new THREE.MeshStandardMaterial({
      color: floor === 1 ? 0x6e1a24 : (floor === 2 ? 0x5a1820 : 0x221a28),
      roughness: 0.8,
    });
    const carpetMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, corridorLength + 6), carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.015, -corridorLength / 2 + 4);
    carpetMesh.receiveShadow = true;
    carpetMesh.name = 'hotel_carpet_runner';
    this.scene.add(carpetMesh);

    // Far End Staircase / Vault Door
    this.createStaircaseExit(0, -corridorLength + 2, floor);

    // Side Rooms for Exploration / Loot
    this.createSideRoom(-halfW - 3.5, 0, -12, 6, 6, wallMat, floorMat, ceilMat, floor);
    this.createSideRoom(halfW + 3.5, 0, -28, 6, 6, wallMat, floorMat, ceilMat, floor);

    // Grand Chandeliers along the corridor (dimmed atmospheric lighting)
    const chandelierZPositions = [2.0, -4.0, -14.0, -24.0, -34.0, -44.0];
    for (const cz of chandelierZPositions) {
      this.createChandelier(0, 2.75, cz, floor);
    }

    // Antique Wall Sconces flanking the hallway (subtly dimmed atmospheric glow)
    for (let z = 3.5; z > -corridorLength; z -= 6) {
      this.createSconce(-halfW + 0.15, 2.3, z, Math.PI / 2, z >= -6 ? 0.6 : 0.45);
      this.createSconce(halfW - 0.15, 2.3, z - 3, -Math.PI / 2, z >= -6 ? 0.6 : 0.45);
    }

    // Spawn Security Cameras
    this.spawnSecurityCameras(floor, corridorWidth, corridorLength);

    // Spawn Items / Weapons / Lore Notes
    this.spawnFloorPickups(floor);

    // Spawn Monsters & Crawlers
    this.spawnMonsters(floor, corridorWidth, corridorLength);

    // Special Boss & Aurelia Heart setup on Floor 5
    if (floor === 5) {
      this.setupFloor5Altar();
    }
  }

  private createEntranceVestibule(corridorWidth: number, wallHeight: number) {
    const vestGroup = new THREE.Group();
    vestGroup.position.set(0, 0, 4.8);

    // Grand Double Entrance Doors
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.6 });
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.15), doorFrameMat);
    doorFrame.position.set(0, 1.4, 0);
    vestGroup.add(doorFrame);

    const doorLeafMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.5, metalness: 0.1 });
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.5, 0.08), doorLeafMat);
    leftDoor.position.set(-0.6, 1.35, 0.04);
    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.5, 0.08), doorLeafMat);
    rightDoor.position.set(0.6, 1.35, 0.04);
    vestGroup.add(leftDoor, rightDoor);

    // Brass handles
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xcaa048, metalness: 0.9, roughness: 0.2 });
    const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), brassMat);
    leftHandle.position.set(-0.15, 1.25, 0.1);
    const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), brassMat);
    rightHandle.position.set(0.15, 1.25, 0.1);
    vestGroup.add(leftHandle, rightHandle);

    // Entrance Twin Coach Lanterns (Left & Right)
    for (const lx of [-1.6, 1.6]) {
      const lanternMount = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.15), brassMat);
      lanternMount.position.set(lx, 2.2, -0.05);
      vestGroup.add(lanternMount);

      const lanternGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.24, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff0d0 })
      );
      lanternGlass.position.set(lx, 2.2, 0.08);
      vestGroup.add(lanternGlass);

      // Soft warm entrance point light
      const lanternLight = new THREE.PointLight(0xffdf9e, 0.75, 6.5, 1.8);
      lanternLight.position.set(lx, 2.2, 0.2);
      vestGroup.add(lanternLight);
    }

    vestGroup.name = 'hotel_entrance_vestibule';
    this.scene.add(vestGroup);
  }

  private createChandelier(x: number, y: number, z: number, floor: number) {
    const chGroup = new THREE.Group();
    chGroup.position.set(x, y, z);

    // Ceiling bracket
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xcaa048, metalness: 0.85, roughness: 0.25 });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.08, 12), brassMat);
    plate.position.y = 0.8;
    chGroup.add(plate);

    // Suspension chain
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), brassMat);
    chain.position.y = 0.4;
    chGroup.add(chain);

    // Main Brass Chandelier Ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 16), brassMat);
    ring.rotation.x = Math.PI / 2;
    chGroup.add(ring);

    // 4 radial arms & candle lamps
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const lx = Math.cos(angle) * 0.45;
      const lz = Math.sin(angle) * 0.45;

      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), brassMat);
      holder.position.set(lx, 0.06, lz);
      chGroup.add(holder);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff4d6 })
      );
      bulb.position.set(lx, 0.15, lz);
      chGroup.add(bulb);
    }

    // Central Frosted Amber Glass Bowl
    const centerGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe9be })
    );
    centerGlobe.position.set(0, -0.04, 0);
    chGroup.add(centerGlobe);

    // Atmospheric warm point light
    const light = new THREE.PointLight(0xffdf99, 0.85, 8.5, 1.8);
    light.position.set(0, -0.1, 0);
    chGroup.add(light);

    chGroup.name = 'prop_chandelier';
    this.scene.add(chGroup);
  }

  private createDoor(x: number, y: number, z: number, rotY: number, roomNum: string) {
    const doorTex = TextureGenerator.getDoorTexture(roomNum, false);
    const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.6 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), doorMat);
    door.position.set(x, y, z);
    door.rotation.y = rotY;
    door.name = `prop_door_${roomNum}`;
    this.scene.add(door);
  }

  private createPainting(x: number, y: number, z: number, rotY: number, id: number) {
    const pTex = TextureGenerator.getPaintingTexture(id);
    const pMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.5 });
    const painting = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), pMat);
    painting.position.set(x, y, z);
    painting.rotation.y = rotY;
    painting.name = `prop_painting_${id}`;
    this.scene.add(painting);
  }

  private createSconce(x: number, y: number, z: number, rotY: number, intensity: number = 0.45, range: number = 6.5) {
    const sconceGroup = new THREE.Group();
    sconceGroup.position.set(x, y, z);
    sconceGroup.rotation.y = rotY;

    // Brass mount
    const mount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0xb38f39, metalness: 0.8, roughness: 0.3 })
    );
    mount.rotation.x = Math.PI / 4;
    sconceGroup.add(mount);

    // Glass bulb with faint warm glow
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe2a0 })
    );
    bulb.position.set(0, 0.12, 0.12);
    sconceGroup.add(bulb);

    const light = new THREE.PointLight(0xffa84d, intensity, range, 1.8);
    light.position.set(0, 0.15, 0.15);
    sconceGroup.add(light);

    sconceGroup.name = 'prop_sconce';
    this.scene.add(sconceGroup);
  }

  private createStaircaseExit(x: number, z: number, floor: number) {
    this.stairsDoorMesh = new THREE.Group();
    this.stairsDoorMesh.position.set(x, 1.3, z);

    const doorTex = TextureGenerator.getDoorTexture(`F${floor + 1} STAIRS`, true);
    const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.5 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.6), doorMat);
    this.stairsDoorMesh.add(door);

    // Door Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.2), frameMat);
    topFrame.position.y = 1.35;
    this.stairsDoorMesh.add(topFrame);

    // Status Indicator Light (Red = Locked by Security Cameras, Green = Unlocked)
    this.stairsLight = new THREE.PointLight(0xff1111, 1.5, 5);
    this.stairsLight.position.set(0, 1.5, 0.2);
    this.stairsDoorMesh.add(this.stairsLight);

    const statusBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1111 })
    );
    statusBulb.name = 'stairs_bulb';
    statusBulb.position.set(0, 1.5, 0.15);
    this.stairsDoorMesh.add(statusBulb);

    this.stairsDoorMesh.name = 'hotel_stairs_door';
    this.scene.add(this.stairsDoorMesh);

    // Wall blocking stairs
    this.addWallBox(x - 2.5, x + 2.5, z - 0.5, z + 0.5);
  }

  private createSideRoom(
    rx: number, ry: number, rz: number,
    w: number, d: number,
    wallMat: THREE.Material, floorMat: THREE.Material, ceilMat: THREE.Material,
    floor: number
  ) {
    const halfW = w / 2;
    const halfD = d / 2;
    const h = 3.6;

    // Room Floor & Ceiling
    const rFloor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    rFloor.rotation.x = -Math.PI / 2;
    rFloor.position.set(rx, 0, rz);
    rFloor.name = 'hotel_room_floor';
    this.scene.add(rFloor);

    const rCeil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    rCeil.rotation.x = Math.PI / 2;
    rCeil.position.set(rx, h, rz);
    rCeil.name = 'hotel_room_ceil';
    this.scene.add(rCeil);

    // Room Walls
    const thick = 0.4;
    // North wall
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), wallMat);
    wallN.position.set(rx, h / 2, rz - halfD);
    wallN.name = 'hotel_room_wall';
    this.scene.add(wallN);
    this.addWallBox(rx - halfW, rx + halfW, rz - halfD - thick / 2, rz - halfD + thick / 2);

    // South wall
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), wallMat);
    wallS.position.set(rx, h / 2, rz + halfD);
    wallS.name = 'hotel_room_wall';
    this.scene.add(wallS);
    this.addWallBox(rx - halfW, rx + halfW, rz + halfD - thick / 2, rz + halfD + thick / 2);

    // Outer wall
    const isLeft = rx < 0;
    const wallOuter = new THREE.Mesh(new THREE.BoxGeometry(thick, h, d), wallMat);
    wallOuter.position.set(isLeft ? rx - halfW : rx + halfW, h / 2, rz);
    wallOuter.name = 'hotel_room_wall';
    this.scene.add(wallOuter);
    if (isLeft) {
      this.addWallBox(rx - halfW - thick / 2, rx - halfW + thick / 2, rz - halfD, rz + halfD);
    } else {
      this.addWallBox(rx + halfW - thick / 2, rx + halfW + thick / 2, rz - halfD, rz + halfD);
    }

    // Room Furniture: Broken Bed & Desk
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2e1e17, roughness: 0.8 })
    );
    bed.position.set(isLeft ? rx - 1.2 : rx + 1.2, 0.3, rz - 1.2);
    bed.name = 'prop_furniture_bed';
    this.scene.add(bed);
    this.addWallBox(bed.position.x - 0.9, bed.position.x + 0.9, bed.position.z - 1.2, bed.position.z + 1.2);

    // Desk
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.75, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.7 })
    );
    desk.position.set(rx, 0.375, rz + 1.6);
    desk.name = 'prop_furniture_desk';
    this.scene.add(desk);
    this.addWallBox(rx - 0.8, rx + 0.8, rz + 1.1, rz + 2.1);
  }

  private spawnSecurityCameras(floor: number, corridorWidth: number, corridorLength: number) {
    const count = FLOOR_CONFIGS[floor]?.targetCamerasCount || 4;
    const halfW = corridorWidth / 2 - 0.2;

    const cameraPositions = [
      { x: -halfW, y: 3.1, z: -4, rotY: Math.PI / 4 },
      { x: halfW, y: 3.1, z: -16, rotY: -Math.PI / 3 },
      { x: -halfW, y: 3.1, z: -28, rotY: Math.PI / 3 },
      { x: halfW, y: 3.1, z: -40, rotY: -Math.PI / 4 },
      { x: 0, y: 3.2, z: -corridorLength + 4, rotY: Math.PI },
    ];

    for (let i = 0; i < count; i++) {
      const pos = cameraPositions[i % cameraPositions.length];
      const camGroup = new THREE.Group();
      camGroup.position.set(pos.x, pos.y, pos.z);

      // Mount bracket
      const bracket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
      );
      bracket.rotation.x = Math.PI / 3;
      camGroup.add(bracket);

      // Camera Box
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.16, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x2b2d30, metalness: 0.7, roughness: 0.4 })
      );
      box.position.set(0, -0.15, 0.15);
      camGroup.add(box);

      // Red Surveillance LED Lens
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff0022 })
      );
      lens.position.set(0, -0.15, 0.38);
      camGroup.add(lens);

      // Red Scanning Laser / Cone SpotLight
      const spotLight = new THREE.SpotLight(0xff0022, 1.8, 12, Math.PI / 7, 0.5, 2);
      spotLight.position.set(0, -0.15, 0.38);
      const target = new THREE.Object3D();
      target.position.set(0, -3.0, 3.5);
      camGroup.add(target);
      spotLight.target = target;
      camGroup.add(spotLight);

      camGroup.rotation.y = pos.rotY;
      camGroup.name = `prop_camera_${i}`;
      this.scene.add(camGroup);

      this.cameraEntities.push({
        id: `cam_${floor}_${i}`,
        mesh: camGroup,
        lightMesh: lens,
        spotLight,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        health: 30,
        isDestroyed: false,
        baseRotY: pos.rotY,
        scanTime: i * 1.5,
      });
    }
  }

  private spawnFloorPickups(floor: number) {
    // Medkits & Energy Drinks
    this.createItemPickup(`medkit_${floor}_1`, 'medkit', 'Emergency Medkit', -1.2, 0.3, -10);
    this.createItemPickup(`energy_${floor}_1`, 'energy_drink', 'Stamina Surge', 1.2, 0.3, -22);

    if (floor >= 2) {
      this.createItemPickup(`medkit_${floor}_2`, 'medkit', 'Emergency Medkit', -4.5, 0.9, -12); // Inside room desk
      this.createItemPickup(`ammo_${floor}_1`, 'ammo', 'Revolver Rounds (x6)', 4.5, 0.9, -28);
    }

    // Weapons Spawning:
    if (floor === 2 && !this.weapons.some(w => w.id === 'revolver')) {
      this.createItemPickup('weapon_revolver', 'revolver', 'Detective\'s .38 Revolver', -4.5, 0.95, -12);
    }
    if (floor === 3) {
      // Level 3 Pistol Weapon pickup in prominent hallway table & extra pistol rounds
      if (!this.weapons.some(w => w.id === 'pistol')) {
        this.createItemPickup('weapon_pistol', 'pistol', 'Tactical 9mm Pistol', 1.1, 0.85, 0);
      }
      this.createItemPickup(`ammo_pistol_${floor}_1`, 'ammo', '9mm Pistol Rounds (x15)', -1.2, 0.3, -4);
      if (!this.weapons.some(w => w.id === 'shotgun')) {
        this.createItemPickup('weapon_shotgun', 'shotgun', 'Security 12-Gauge Shotgun', 4.5, 0.95, -28);
      }
    }

    // Lore Notes
    if (floor === 1) {
      this.createItemPickup('note_1', 'note', 'Torn Journal Entry', 0.5, 0.4, -6, 'note_1');
      this.createItemPickup('note_2', 'note', 'Surveillance Memo #104', -0.5, 0.4, -20, 'note_2');
    } else if (floor === 2) {
      this.createItemPickup('note_3', 'note', 'Occult Appraisal - Aurelia Heart', 4.8, 0.9, -27.5, 'note_3');
    } else if (floor === 3 || floor === 4) {
      this.createItemPickup('note_4', 'note', 'Victor Vance\'s Threat', -4.8, 0.9, -11.5, 'note_4');
    }
  }

  private createItemPickup(
    id: string,
    type: 'medkit' | 'energy_drink' | 'ammo' | 'key' | 'note' | 'aurelia_heart' | 'pistol' | 'revolver' | 'shotgun',
    name: string,
    x: number, y: number, z: number,
    noteId?: string
  ) {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(x, y, z);

    let mesh: THREE.Mesh;
    if (type === 'medkit') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.22, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 })
      );
      // Red Cross on medkit
      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xdd1111 })
      );
      mesh.add(cross);
    } else if (type === 'energy_drink') {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.24, 12),
        new THREE.MeshStandardMaterial({ color: 0x11bb44, metalness: 0.8, roughness: 0.2 })
      );
    } else if (type === 'ammo') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.12, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x8a6d2b, metalness: 0.9, roughness: 0.3 })
      );
    } else if (type === 'pistol') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.14, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 0.9, roughness: 0.25 })
      );
    } else if (type === 'revolver' || type === 'shotgun') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.12, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.95, roughness: 0.1 })
      );
    } else if (type === 'aurelia_heart') {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 1),
        new THREE.MeshStandardMaterial({
          color: 0xff0033,
          emissive: 0x990011,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.9,
        })
      );
    } else {
      // Lore Note paper
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.32),
        new THREE.MeshStandardMaterial({ color: 0xdfd4be, roughness: 0.9 })
      );
      mesh.rotation.x = -Math.PI / 2;
    }

    itemGroup.add(mesh);

    // Subtle gentle glow point
    const glow = new THREE.PointLight(type === 'aurelia_heart' ? 0xff0033 : 0xffdd88, 0.5, 2.5);
    glow.position.y = 0.2;
    itemGroup.add(glow);

    itemGroup.name = `item_${id}`;
    this.scene.add(itemGroup);

    this.itemEntities.push({
      id,
      type,
      name,
      mesh: itemGroup,
      pickedUp: false,
      noteId,
    });
  }

  private spawnMonsters(floor: number, corridorWidth: number, corridorLength: number) {
    if (floor === 1) {
      // Floor 1: 3 Crawlers (Atmospheric ceiling/wall stalkers)
      this.createMonster('crawler_1', 'crawler', 'Shadow Crawler', -1.0, 3.2, -14, 'ceiling_crawl');
      this.createMonster('crawler_2', 'crawler', 'Shadow Crawler', 1.2, 3.2, -32, 'ceiling_crawl');
      this.createMonster('crawler_3', 'crawler', 'Shadow Crawler', 0, 0.5, -42, 'patrol');
    } else if (floor === 2) {
      // Floor 2: 4 Aggressive Hallway Stalkers
      this.createMonster('stalker_1', 'stalker', 'Crimson Stalker', 0, 1.2, -18, 'patrol');
      this.createMonster('stalker_2', 'stalker', 'Crimson Stalker', -4.5, 1.2, -12, 'idle');
      this.createMonster('stalker_3', 'stalker', 'Crimson Stalker', 0, 1.2, -36, 'patrol');
      this.createMonster('crawler_2_1', 'crawler', 'Ceiling Scuttler', 0, 3.2, -26, 'ceiling_crawl');
    } else if (floor === 3) {
      // Floor 3: Armored Brutes & Fast Stalkers
      this.createMonster('brute_1', 'brute', 'Armored Gore Brute', 0, 1.6, -20, 'patrol');
      this.createMonster('brute_2', 'brute', 'Armored Gore Brute', 0, 1.6, -38, 'patrol');
      this.createMonster('stalker_3_1', 'stalker', 'Agile Lurker', 4.5, 1.2, -28, 'idle');
    } else if (floor === 4) {
      // Floor 4: Phantom Weepers & Multiple Threats
      this.createMonster('phantom_1', 'phantom', 'Weeping Phantom', 0, 1.5, -15, 'idle');
      this.createMonster('phantom_2', 'phantom', 'Void Wraith', 0, 1.5, -30, 'patrol');
      this.createMonster('brute_4_1', 'brute', 'Nightmare Fiend', 0, 1.6, -42, 'patrol');
      this.createMonster('crawler_4_1', 'crawler', 'Vile Scuttler', 0, 3.2, -22, 'ceiling_crawl');
    }
  }

  private createMonster(
    id: string,
    type: 'crawler' | 'stalker' | 'brute' | 'phantom' | 'boss_warden',
    name: string,
    x: number, y: number, z: number,
    state: 'idle' | 'patrol' | 'chase' | 'attack' | 'ceiling_crawl'
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    let maxHp = 50;
    let speed = 2.2;
    let damage = 15;

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0c0b0f,
      roughness: 0.9,
      metalness: 0.2,
    });
    const fleshMat = new THREE.MeshStandardMaterial({
      color: 0x3d0b13,
      roughness: 0.65,
      metalness: 0.35,
    });
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xc8bea8,
      roughness: 0.55,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    const animLegs: THREE.Mesh[] = [];
    const animArms: THREE.Mesh[] = [];
    const animMandibles: THREE.Mesh[] = [];
    const animTendrils: THREE.Mesh[] = [];
    let animHead: THREE.Mesh | THREE.Group | undefined;

    if (type === 'crawler') {
      maxHp = 35;
      speed = 3.6;
      damage = 12;

      // --- SCARIER LEVEL 1 CRAWLER: Corpse Arachnid Nightmare ---
      // 1. Horrific deformed humanoid skull face
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), boneMat);
      skull.position.set(0, 0.15, 0.45);
      skull.scale.set(0.9, 0.85, 1.2);
      group.add(skull);

      // Unhinged lower jaw with jagged needle fangs
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.28), boneMat);
      jaw.position.set(0, 0.02, 0.52);
      jaw.rotation.x = 0.25;
      group.add(jaw);

      for (let f = -0.06; f <= 0.06; f += 0.03) {
        const fang = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 4), boneMat);
        fang.position.set(f, 0.07, 0.56);
        fang.rotation.x = Math.PI;
        group.add(fang);
      }

      // 6 Glowing multi-ocular crimson eyes cluster
      const eyePositions = [
        [-0.07, 0.2, 0.54], [0.07, 0.2, 0.54],
        [-0.11, 0.16, 0.50], [0.11, 0.16, 0.50],
        [-0.04, 0.25, 0.50], [0.04, 0.25, 0.50]
      ];
      eyePositions.forEach(([ex, ey, ez]) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
        eye.position.set(ex, ey, ez);
        group.add(eye);
      });

      // Twin snapping front mandibles / pedipalps
      for (const side of [-1, 1]) {
        const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.32, 5), boneMat);
        pincer.position.set(side * 0.16, 0.1, 0.62);
        pincer.rotation.x = Math.PI / 2 + 0.2;
        pincer.rotation.y = -side * 0.4;
        group.add(pincer);
        animMandibles.push(pincer);
      }

      // Segmented vertebrae thorax
      for (let v = 0; v < 4; v++) {
        const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.12 - v * 0.01, 0.14 - v * 0.01, 0.08, 8), fleshMat);
        vert.rotation.x = Math.PI / 2;
        vert.position.set(0, 0.16, 0.25 - v * 0.12);
        group.add(vert);
      }

      // Pulsing swollen pustule-covered rear abdomen
      const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), fleshMat);
      abdomen.position.set(0, 0.2, -0.4);
      abdomen.scale.set(1.1, 0.8, 1.4);
      group.add(abdomen);

      // 8 Articulated scythe legs (4 on each side)
      for (let side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const zOffset = (i - 1.5) * 0.28;
          const legGroup = new THREE.Group();
          legGroup.position.set(side * 0.22, 0.16, zOffset);

          // Upper Coxa / Femur angling up and out
          const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.48, 6), boneMat);
          femur.position.set(side * 0.2, 0.18, 0);
          femur.rotation.z = side * (Math.PI / 3.2);
          femur.rotation.y = (i - 1.5) * 0.18;
          legGroup.add(femur);

          // Lower Tibia / Talon spiking down to the floor
          const tibia = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.65, 5), darkMat);
          tibia.position.set(side * 0.38, -0.15, 0);
          tibia.rotation.z = -side * (Math.PI / 5);
          legGroup.add(tibia);

          group.add(legGroup);
          animLegs.push(legGroup as unknown as THREE.Mesh);
        }
      }
    } else if (type === 'stalker') {
      maxHp = 60;
      speed = 4.2;
      damage = 22;

      // --- SCARIER LEVEL 2 STALKER: The Flayed Wendigo Nightmare ---
      const stalkerHeadGroup = new THREE.Group();
      stalkerHeadGroup.position.set(0, 1.95, 0.15);

      // Grotesque Horned Skull Cranium
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.32), boneMat);
      stalkerHeadGroup.add(skull);

      // Gaping wide unhinged lower jaw
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.24), fleshMat);
      jaw.position.set(0, -0.22, 0.08);
      jaw.rotation.x = 0.3;
      stalkerHeadGroup.add(jaw);

      // Needle teeth
      for (let t = -0.07; t <= 0.07; t += 0.035) {
        const toothU = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), boneMat);
        toothU.position.set(t, -0.08, 0.14);
        toothU.rotation.x = Math.PI;
        stalkerHeadGroup.add(toothU);

        const toothL = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), boneMat);
        toothL.position.set(t, -0.32, 0.15);
        stalkerHeadGroup.add(toothL);
      }

      // Antlers / Backward bone horns
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.65, 5), boneMat);
        horn.position.set(side * 0.18, 0.32, -0.15);
        horn.rotation.x = -0.6;
        horn.rotation.z = side * 0.45;
        stalkerHeadGroup.add(horn);
      }

      // Burning hollow eye sockets
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
        eye.position.set(side * 0.08, 0.04, 0.15);
        stalkerHeadGroup.add(eye);
      }
      group.add(stalkerHeadGroup);
      animHead = stalkerHeadGroup;

      // Emaciated flayed torso with exposed protruding spine & ribs
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.2, 8), fleshMat);
      spine.position.set(0, 1.15, 0);
      group.add(spine);

      // 5 pairs of broken curved ribs
      for (let r = 0; r < 5; r++) {
        const ry = 1.5 - r * 0.14;
        for (const side of [-1, 1]) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 4, 8, Math.PI / 1.5), boneMat);
          rib.position.set(side * 0.05, ry, 0.05);
          rib.rotation.y = side * 0.3;
          rib.rotation.z = side * 0.2;
          group.add(rib);
        }
      }

      // Pulsing dark crimson heart core inside exposed chest cavity
      const heartCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x440000, roughness: 0.2 })
      );
      heartCore.position.set(0, 1.35, 0.05);
      group.add(heartCore);

      // 4 Wriggling shoulder/back tendrils
      for (let side of [-1, 1]) {
        for (let t = 0; t < 2; t++) {
          const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, 0.65, 5), fleshMat);
          tendril.position.set(side * (0.18 + t * 0.08), 1.6 - t * 0.15, -0.15);
          tendril.rotation.x = -0.4;
          tendril.rotation.z = side * (0.6 + t * 0.3);
          group.add(tendril);
          animTendrils.push(tendril);
        }
      }

      // Massive 0.95m Bone Scythe Arms
      for (const side of [-1, 1]) {
        const armGroup = new THREE.Group();
        armGroup.position.set(side * 0.32, 1.6, 0);

        // Flayed upper arm
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.55, 6), fleshMat);
        upperArm.position.set(side * 0.1, -0.22, 0.05);
        upperArm.rotation.z = side * 0.25;
        upperArm.rotation.x = -0.2;
        armGroup.add(upperArm);

        // Forearm with curved razor bone scythe
        const scytheBlade = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.9, 4),
          new THREE.MeshStandardMaterial({ color: 0x1f0f15, metalness: 0.85, roughness: 0.2 })
        );
        scytheBlade.position.set(side * 0.18, -0.65, 0.35);
        scytheBlade.rotation.x = -Math.PI / 2.8;
        scytheBlade.rotation.z = side * 0.15;
        armGroup.add(scytheBlade);

        group.add(armGroup);
        animArms.push(armGroup as unknown as THREE.Mesh);
      }

      // Digitigrade legs
      for (const side of [-1, 1]) {
        const legUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.6, 6), fleshMat);
        legUpper.position.set(side * 0.18, 0.65, -0.05);
        legUpper.rotation.x = 0.35;
        const legLower = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.65, 6), boneMat);
        legLower.position.set(side * 0.18, 0.2, 0.1);
        legLower.rotation.x = -0.3;
        group.add(legUpper, legLower);
      }
    } else if (type === 'brute') {
      maxHp = 120;
      speed = 2.4;
      damage = 38;

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.7), darkMat);
      torso.position.y = 0.75;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), darkMat);
      head.position.y = 1.55;
      group.add(torso, head);
    } else if (type === 'phantom') {
      maxHp = 80;
      speed = 3.0;
      damage = 25;

      const shroud = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 1.6, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a0f1d, transparent: true, opacity: 0.75 })
      );
      shroud.position.y = 0.8;
      group.add(shroud);
    } else if (type === 'boss_warden') {
      maxHp = 350;
      speed = 3.2;
      damage = 45;

      const bossBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1.2), darkMat);
      bossBody.position.y = 1.5;
      const bossHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x330005, roughness: 0.4 })
      );
      bossHead.position.y = 3.0;
      group.add(bossBody, bossHead);

      // Horns
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 6), darkMat);
      hornL.position.set(-0.4, 3.4, 0);
      hornL.rotation.z = -0.4;
      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 6), darkMat);
      hornR.position.set(0.4, 3.4, 0);
      hornR.rotation.z = 0.4;
      group.add(hornL, hornR);
    }

    // Glowing Eyes PointLight
    const eyeLight = new THREE.PointLight(type === 'boss_warden' ? 0xff0033 : 0xff2200, 0.9, 4.5);
    eyeLight.position.set(0, type === 'crawler' ? 0.25 : (type === 'boss_warden' ? 3.0 : 1.9), 0.35);
    group.add(eyeLight);

    group.name = `monster_${id}`;
    this.scene.add(group);

    this.monsterEntities.push({
      id,
      type,
      name,
      mesh: group,
      eyeLight,
      health: maxHp,
      maxHealth: maxHp,
      speed,
      damage,
      state,
      isDead: false,
      attackCooldown: 0,
      ceilingY: state === 'ceiling_crawl' ? 3.2 : undefined,
      wanderAngle: Math.random() * Math.PI * 2,
      flinchTimer: 0,
      stunTimer: 0,
      animLegs,
      animArms,
      animMandibles,
      animTendrils,
      animHead,
    });
  }

  private setupFloor5Altar() {
    this.heartAltarMesh = new THREE.Group();
    this.heartAltarMesh.position.set(0, 0, -42);

    // Stone Pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.0, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1216, roughness: 0.9 })
    );
    base.position.y = 0.4;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x221319, roughness: 0.85 })
    );
    pillar.position.y = 1.4;

    // Glowing Occult Runes Ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xdd1133 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.85;

    // Aurelia Heart Gemstone
    const gemGeom = new THREE.OctahedronGeometry(0.4, 2);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0x990011,
      emissiveIntensity: 0.9,
      roughness: 0.05,
      metalness: 0.95,
    });
    this.heartGemMesh = new THREE.Mesh(gemGeom, gemMat);
    this.heartGemMesh.position.y = 2.4;

    const gemLight = new THREE.PointLight(0xff0022, 2.5, 8);
    gemLight.position.y = 2.4;

    this.heartAltarMesh.add(base, pillar, ring, this.heartGemMesh, gemLight);
    this.heartAltarMesh.name = 'hotel_aurelia_altar';
    this.scene.add(this.heartAltarMesh);

    // Spawn Boss Warden of Blackridge
    this.createMonster('boss_warden_1', 'boss_warden', 'The Warden of Blackridge', 0, 0, -36, 'idle');

    // Spawn Aurelia Heart interactive pickup near altar
    this.createItemPickup('aurelia_heart_item', 'aurelia_heart', 'The Aurelia Heart', 0, 2.4, -42);
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);

    this.container.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.isPaused) {
        this.container.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
    });
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (this.keys[key] !== undefined) {
      this.keys[key] = true;
    }
    if (e.key === 'Shift') this.keys.shift = true;

    // Flashlight toggle
    if (key === 'f') {
      this.toggleFlashlight();
    }

    // Weapon Switching: 1, 2, 3, 4
    if (key === '1' && this.weapons[0]) this.switchWeapon(0);
    if (key === '2' && this.weapons[1]) this.switchWeapon(1);
    if (key === '3' && this.weapons[2]) this.switchWeapon(2);
    if (key === '4' && this.weapons[3]) this.switchWeapon(3);

    // Use Quick Medkit (Q) or Energy Drink (X)
    if (key === 'q') this.useItem('medkit');
    if (key === 'x') this.useItem('energy_drink');

    // Interact (E)
    if (key === 'e') {
      this.handleInteract();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (this.keys[key] !== undefined) {
      this.keys[key] = false;
    }
    if (e.key === 'Shift') this.keys.shift = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked || this.isPaused) return;

    this.playerRot.yaw -= e.movementX * this.mouseSensitivity;
    this.playerRot.pitch -= e.movementY * this.mouseSensitivity;

    // Clamp pitch
    this.playerRot.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.playerRot.pitch));
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && this.isPointerLocked && !this.isPaused) {
      this.attack();
    }
  };

  public toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    soundEngine.playFlashlightClick();
    if (this.flashlight) {
      this.flashlight.visible = this.isFlashlightOn;
    }
  }

  public switchWeapon(index: number) {
    if (index >= 0 && index < this.weapons.length) {
      this.currentWeaponIndex = index;
      const current = this.weapons[index];

      if (this.pipeMesh) this.pipeMesh.visible = current.id === 'pipe';
      if (this.pistolMesh) this.pistolMesh.visible = current.id === 'pistol';
      if (this.revolverMesh) this.revolverMesh.visible = current.id === 'revolver';
      if (this.shotgunMesh) this.shotgunMesh.visible = current.id === 'shotgun';

      this.callbacks.onWeaponChange(current, this.weapons);
    }
  }

  public useItem(type: 'medkit' | 'energy_drink'): boolean {
    const item = this.inventory.find(i => i.type === type && i.count > 0);
    if (!item) return false;

    if (type === 'medkit') {
      if (this.health >= this.maxHealth) return false;
      this.health = Math.min(this.maxHealth, this.health + 50);
      item.count--;
      soundEngine.playItemPickup();
      this.callbacks.onHealthChange(this.health, this.maxHealth);
      this.callbacks.onInventoryChange(this.inventory);
      return true;
    } else if (type === 'energy_drink') {
      this.stamina = this.maxStamina;
      this.health = Math.min(this.maxHealth, this.health + 15);
      this.speedBoostTimer = 15; // 15 seconds boost
      item.count--;
      soundEngine.playItemPickup();
      this.callbacks.onHealthChange(this.health, this.maxHealth);
      this.callbacks.onStaminaChange(this.stamina, this.maxStamina);
      this.callbacks.onInventoryChange(this.inventory);
      return true;
    }
    return false;
  }

  private attack() {
    if (this.weaponCooldownTimer > 0) return;
    const weapon = this.weapons[this.currentWeaponIndex];
    if (!weapon) return;

    if (weapon.isRanged && weapon.ammo <= 0) {
      // Empty click
      soundEngine.playFlashlightClick();
      return;
    }

    this.weaponCooldownTimer = weapon.cooldown;

    if (weapon.isRanged) {
      weapon.ammo--;
      this.callbacks.onWeaponChange(weapon, this.weapons);
      const gunType = weapon.id === 'shotgun' ? 'shotgun' : (weapon.id === 'pistol' ? 'pistol' : 'revolver');
      soundEngine.playGunshot(gunType);
      this.triggerMuzzleFlash();
    } else {
      soundEngine.playPipeSwing();
    }

    // Check Security Cameras Hit
    this.cameraEntities.forEach((cam) => {
      if (cam.isDestroyed) return;
      const camPos = new THREE.Vector3(cam.x, cam.y, cam.z);
      if (camPos.distanceTo(this.playerPos) <= weapon.range + 1.2) {
        // Check angle
        const dirToCam = camPos.clone().sub(this.playerPos).normalize();
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        if (dirToCam.dot(forward) > 0.8) {
          this.hitCamera(cam, weapon.damage);
        }
      }
    });

    // Check Monsters Hit
    this.monsterEntities.forEach((m) => {
      if (m.isDead) return;
      const mPos = m.mesh.position.clone();
      if (mPos.distanceTo(this.playerPos) <= weapon.range + 1.5) {
        const dirToM = mPos.clone().sub(this.playerPos).normalize();
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        if (dirToM.dot(forward) > 0.7) {
          this.hitMonster(m, weapon.damage, weapon.isRanged);
        }
      }
    });
  }

  private triggerMuzzleFlash() {
    const flash = new THREE.PointLight(0xffaa33, 4.0, 10);
    flash.position.copy(this.playerPos);
    this.scene.add(flash);
    setTimeout(() => {
      this.scene.remove(flash);
    }, 45);
  }

  private hitCamera(cam: CameraEntity, dmg: number) {
    cam.health -= dmg;
    soundEngine.playCameraSparks();
    this.createSparks(cam.x, cam.y, cam.z);

    if (cam.health <= 0) {
      cam.isDestroyed = true;
      cam.spotLight.visible = false;
      cam.lightMesh.material = new THREE.MeshBasicMaterial({ color: 0x222222 });
      soundEngine.playCameraDestroyed();
      this.createExplosion(cam.x, cam.y, cam.z);

      this.destroyedCamerasCount++;
      this.callbacks.onCamerasChange(this.destroyedCamerasCount, this.totalCamerasCount);

      // Check if all cameras on floor are destroyed
      if (this.destroyedCamerasCount >= this.totalCamerasCount) {
        this.unlockStaircase();
      }
    }
  }

  private unlockStaircase() {
    this.isStairsUnlocked = true;
    soundEngine.playDoorUnlock();
    this.callbacks.onHorrorStinger('Lockdown lifted! Staircase to next floor unlocked.');

    if (this.stairsLight) {
      this.stairsLight.color.setHex(0x11ff22);
    }
    if (this.stairsDoorMesh) {
      const bulb = this.stairsDoorMesh.getObjectByName('stairs_bulb') as THREE.Mesh;
      if (bulb) {
        bulb.material = new THREE.MeshBasicMaterial({ color: 0x11ff22 });
      }
    }
  }

  private hitMonster(m: MonsterEntity, dmg: number, isRanged: boolean = false) {
    m.health -= dmg;
    m.flinchTimer = 0.3;
    soundEngine.playPipeHit();
    this.createBlood(m.mesh.position.x, m.mesh.position.y + 0.8, m.mesh.position.z);

    // Shooting monsters pauses/stuns them for 10 seconds so the player can get ahead
    if (isRanged) {
      m.stunTimer = 10.0;
      soundEngine.playMonsterStunned();
      this.createStunShockwave(m.mesh.position.x, m.mesh.position.y + 0.6, m.mesh.position.z);
      this.callbacks.onHorrorStinger('Monster shot & stunned for 10s! Run past!');
    }

    if (m.health <= 0) {
      m.isDead = true;
      m.state = 'dead';
      soundEngine.playCrawlerScreech();
      this.scene.remove(m.mesh);

      // Boss defeated condition
      if (m.type === 'boss_warden') {
        this.callbacks.onHorrorStinger('The Warden has collapsed! Claim the Aurelia Heart!');
      }
    } else if (m.stunTimer <= 0) {
      // Monster reacts by chasing if not stunned
      m.state = 'chase';
      soundEngine.playMonsterGrowl(1.3);
    }
  }

  private createStunShockwave(x: number, y: number, z: number) {
    for (let i = 0; i < 14; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x00ffee : 0xff3355 });
      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pMat);
      pMesh.position.set(x + (Math.random() - 0.5) * 0.4, y + (Math.random() - 0.5) * 0.4, z + (Math.random() - 0.5) * 0.4);
      this.scene.add(pMesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        Math.random() * 2.5 + 1.0,
        (Math.random() - 0.5) * 3.5
      );
      this.particles.push({ mesh: pMesh, vel, life: 0.6, maxLife: 0.6 });
    }
  }

  private createSparks(x: number, y: number, z: number) {
    for (let i = 0; i < 8; i++) {
      const geom = new THREE.SphereGeometry(0.02, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
      const p = new THREE.Mesh(geom, mat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2 + 1, (Math.random() - 0.5) * 3),
        life: 0.3,
        maxLife: 0.3,
      });
    }
  }

  private createExplosion(x: number, y: number, z: number) {
    for (let i = 0; i < 15; i++) {
      const geom = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const p = new THREE.Mesh(geom, mat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 3, (Math.random() - 0.5) * 5),
        life: 0.6,
        maxLife: 0.6,
      });
    }
  }

  private createBlood(x: number, y: number, z: number) {
    for (let i = 0; i < 10; i++) {
      const geom = new THREE.SphereGeometry(0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0x880011 });
      const p = new THREE.Mesh(geom, mat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2),
        life: 0.4,
        maxLife: 0.4,
      });
    }
  }

  private handleInteract() {
    // Check nearby Item Pickups
    for (const item of this.itemEntities) {
      if (item.pickedUp) continue;
      const dist = item.mesh.position.distanceTo(this.playerPos);
      if (dist < 2.4) {
        this.pickupItem(item);
        return;
      }
    }

    // Check Staircase Door
    if (this.stairsDoorMesh) {
      const dist = this.stairsDoorMesh.position.distanceTo(this.playerPos);
      if (dist < 3.0) {
        if (this.isStairsUnlocked) {
          if (this.currentFloor < 5) {
            this.loadFloor(this.currentFloor + 1);
          }
        } else {
          soundEngine.playFlashlightClick();
          this.callbacks.onHorrorStinger(`Lockdown Active! Destroy remaining cameras (${this.destroyedCamerasCount}/${this.totalCamerasCount}).`);
        }
      }
    }
  }

  private pickupItem(item: ItemEntity) {
    item.pickedUp = true;
    this.scene.remove(item.mesh);
    soundEngine.playItemPickup();

    if (item.type === 'note' && item.noteId && LORE_NOTES[item.noteId]) {
      this.callbacks.onOpenNote(LORE_NOTES[item.noteId]);
    } else if (item.type === 'pistol') {
      this.weapons.push({
        id: 'pistol',
        name: 'Tactical 9mm Pistol',
        damage: 45,
        range: 24,
        ammo: 15,
        maxAmmo: 30,
        isRanged: true,
        cooldown: 260,
      });
      this.switchWeapon(this.weapons.length - 1);
      this.callbacks.onHorrorStinger('Acquired Tactical 9mm Pistol! Shots pause monsters for 10s!');
    } else if (item.type === 'revolver') {
      this.weapons.push({
        id: 'revolver',
        name: 'Detective\'s .38 Revolver',
        damage: 65,
        range: 18,
        ammo: 12,
        maxAmmo: 18,
        isRanged: true,
        cooldown: 400,
      });
      this.switchWeapon(this.weapons.length - 1);
      this.callbacks.onHorrorStinger('Picked up .38 Revolver!');
    } else if (item.type === 'shotgun') {
      this.weapons.push({
        id: 'shotgun',
        name: 'Security 12-Gauge',
        damage: 120,
        range: 12,
        ammo: 8,
        maxAmmo: 12,
        isRanged: true,
        cooldown: 750,
      });
      this.switchWeapon(this.weapons.length - 1);
      this.callbacks.onHorrorStinger('Picked up 12-Gauge Shotgun!');
    } else if (item.type === 'ammo') {
      const pis = this.weapons.find(w => w.id === 'pistol');
      if (pis) pis.ammo = Math.min(pis.maxAmmo, pis.ammo + 15);
      const rev = this.weapons.find(w => w.id === 'revolver');
      if (rev) rev.ammo = Math.min(rev.maxAmmo, rev.ammo + 6);
      const shot = this.weapons.find(w => w.id === 'shotgun');
      if (shot) shot.ammo = Math.min(shot.maxAmmo, shot.ammo + 4);
      this.callbacks.onWeaponChange(this.weapons[this.currentWeaponIndex], this.weapons);
      this.callbacks.onHorrorStinger('+Ammo added to reserves.');
    } else if (item.type === 'aurelia_heart') {
      this.inventory.push({
        id: 'aurelia_heart',
        type: 'aurelia_heart',
        name: 'The Aurelia Heart',
        description: 'Pulsing supernatural jewel. Return to entrance and escape before dawn!',
        count: 1,
      });
      this.callbacks.onInventoryChange(this.inventory);
      this.callbacks.onHorrorStinger('Aurelia Heart acquired! Escape Blackridge Hotel before dawn!');
      // Trigger ending transition after claiming heart
      setTimeout(() => {
        this.callbacks.onVictory();
      }, 2500);
    } else {
      const invItem = this.inventory.find(i => i.type === item.type);
      if (invItem) {
        invItem.count++;
      }
      this.callbacks.onInventoryChange(this.inventory);
      this.callbacks.onHorrorStinger(`Picked up ${item.name}`);
    }
  }

  private animate = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.isPaused) {
      this.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.animate);
  };

  private update(dt: number) {
    // 1. Time Progression (Midnight 12:00 AM -> 06:00 AM Dawn)
    this.totalGameSeconds += dt;
    this.gameTimeProgress = Math.min(1.0, this.totalGameSeconds / this.maxNightSeconds);
    const totalMinutes = Math.floor(this.gameTimeProgress * 360); // 360 mins = 6 hours
    const hour = (12 + Math.floor(totalMinutes / 60)) % 12 || 12;
    const minute = totalMinutes % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} AM`;
    this.callbacks.onTimeChange(timeStr, this.gameTimeProgress);

    if (this.totalGameSeconds >= this.maxNightSeconds) {
      this.callbacks.onGameOver('timed_out');
      return;
    }

    // 2. Weapon Cooldown
    if (this.weaponCooldownTimer > 0) {
      this.weaponCooldownTimer -= dt * 1000;
    }

    // 3. Player Movement & Stamina
    this.updatePlayerMovement(dt);

    // 4. Update Flashlight & Viewmodel Position/Sway
    this.updateFlashlightAndViewmodel(dt);

    // 5. Update Security Cameras
    this.updateCameras(dt);

    // 6. Update Monsters AI & Crawlers
    this.updateMonsters(dt);

    // 7. Update Particles
    this.updateParticles(dt);

    // 8. Check Interaction Raycast Prompt
    this.updateInteractionPrompt();

    // 9. Heartbeat audio when low HP
    if (this.health < 35) {
      this.heartbeatTimer += dt;
      if (this.heartbeatTimer > 0.8) {
        this.heartbeatTimer = 0;
        soundEngine.playHeartbeat();
      }
    }
  }

  private updatePlayerMovement(dt: number) {
    // Speed Boost Timer
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
    }

    // Sprinting
    this.isSprinting = this.keys.shift && (this.keys.w || this.keys.s || this.keys.a || this.keys.d) && this.stamina > 5;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 25);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 18);
    }
    this.callbacks.onStaminaChange(this.stamina, this.maxStamina);

    let moveSpeed = this.isSprinting ? 5.2 : 3.0;
    if (this.speedBoostTimer > 0) moveSpeed *= 1.3;

    // Movement Vectors
    const moveVector = new THREE.Vector3();
    if (this.keys.w) moveVector.z -= 1;
    if (this.keys.s) moveVector.z += 1;
    if (this.keys.a) moveVector.x -= 1;
    if (this.keys.d) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRot.yaw);

      const nextX = this.playerPos.x + moveVector.x * moveSpeed * dt;
      const nextZ = this.playerPos.z + moveVector.z * moveSpeed * dt;

      // Wall Collision checks
      const playerRadius = 0.35;
      if (!this.checkWallCollision(nextX, this.playerPos.z, playerRadius)) {
        this.playerPos.x = nextX;
      }
      if (!this.checkWallCollision(this.playerPos.x, nextZ, playerRadius)) {
        this.playerPos.z = nextZ;
      }

      // Realistic footstep sounds with distinct walk vs sprint cadence
      const stepCadence = this.isSprinting ? 0.28 : 0.48;
      this.footstepTimer += dt;
      if (this.footstepTimer >= stepCadence) {
        this.footstepTimer = 0;
        soundEngine.playFootstep(this.isSprinting);
      }
    } else {
      // Keep footstep timer primed so taking a step after standing plays immediately
      this.footstepTimer = 0.38;
    }

    this.camera.position.copy(this.playerPos);

    // Apply Camera Rotation (Pitch & Yaw)
    const euler = new THREE.Euler(this.playerRot.pitch, this.playerRot.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  private checkWallCollision(x: number, z: number, r: number): boolean {
    for (const w of this.walls) {
      if (x + r > w.minX && x - r < w.maxX && z + r > w.minZ && z - r < w.maxZ) {
        return true;
      }
    }
    return false;
  }

  private updateFlashlightAndViewmodel(dt: number) {
    if (this.flashlight && this.flashlightTarget) {
      this.flashlight.position.copy(this.playerPos);
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      this.flashlightTarget.position.copy(this.playerPos).add(forward.multiplyScalar(10));
    }

    // Flashlight flicker effect in higher floors or tense moments
    if (this.currentFloor >= 3 && Math.random() < 0.005) {
      if (this.flashlight) {
        this.flashlight.intensity = 0.2;
        setTimeout(() => {
          if (this.flashlight) this.flashlight.intensity = 2.8;
        }, 120);
      }
    }

    // Viewmodel weapon idle sway / bobbing
    if (this.viewmodelGroup) {
      const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;
      const bobFreq = this.isSprinting ? 12 : 7;
      const bobAmount = isMoving ? (this.isSprinting ? 0.025 : 0.012) : 0.003;
      const t = performance.now() * 0.001;

      this.viewmodelGroup.position.x = Math.sin(t * bobFreq) * bobAmount;
      this.viewmodelGroup.position.y = Math.cos(t * bobFreq * 2) * bobAmount;
    }

    // Altar gem hover & rotation
    if (this.heartGemMesh) {
      this.heartGemMesh.rotation.y += dt * 1.2;
      this.heartGemMesh.position.y = 2.4 + Math.sin(performance.now() * 0.0025) * 0.12;
    }
  }

  private updateCameras(dt: number) {
    this.cameraEntities.forEach((cam) => {
      if (cam.isDestroyed) return;
      cam.scanTime += dt;
      // Oscillate camera head left and right
      const swing = Math.sin(cam.scanTime * 0.9) * 0.65;
      cam.mesh.rotation.y = cam.baseRotY + swing;
    });
  }

  private updateMonsters(dt: number) {
    const time = performance.now() * 0.005;

    this.monsterEntities.forEach((m) => {
      if (m.isDead) return;

      const mPos = m.mesh.position;
      const distToPlayer = mPos.distanceTo(this.playerPos);

      // --- STUN PAUSE MECHANIC (10 seconds when shot) ---
      if (m.stunTimer > 0) {
        m.stunTimer -= dt;

        // Visual shudder/twitch vibration effect while paralyzed
        m.mesh.position.x += (Math.random() - 0.5) * 0.015;
        m.mesh.position.z += (Math.random() - 0.5) * 0.015;

        // Flickering electric blue / glitch stun eye
        if (m.eyeLight) {
          m.eyeLight.color.setHex(Math.random() > 0.5 ? 0x00ffee : 0x331122);
          m.eyeLight.intensity = 0.6 + Math.random() * 0.8;
        }

        // Stunned monster is completely paused at position (cannot move or attack)
        return;
      } else if (m.eyeLight) {
        // Reset normal eye color when recovery occurs
        m.eyeLight.color.setHex(m.type === 'boss_warden' ? 0xff0033 : 0xff2200);
        m.eyeLight.intensity = 0.9;
      }

      // Flinch timer
      if (m.flinchTimer > 0) {
        m.flinchTimer -= dt;
        return;
      }

      // Dynamic scary procedural limb animations
      if (m.type === 'crawler') {
        m.animLegs?.forEach((leg, i) => {
          leg.rotation.x = Math.sin(time * 3 + i * 0.9) * 0.35;
        });
        m.animMandibles?.forEach((mand, i) => {
          mand.rotation.y = (i === 0 ? -1 : 1) * (0.35 + Math.sin(time * 4) * 0.22);
        });
      } else if (m.type === 'stalker') {
        m.animArms?.forEach((arm, i) => {
          arm.rotation.x = -Math.PI / 4 + Math.sin(time * 2.8 + i * Math.PI) * 0.45;
        });
        m.animTendrils?.forEach((tend, i) => {
          tend.rotation.z = (i % 2 === 0 ? 0.6 : -0.6) + Math.sin(time * 2 + i) * 0.25;
        });
        if (m.animHead) {
          m.animHead.rotation.y = Math.sin(time * 1.5) * 0.3;
          m.animHead.rotation.z = Math.sin(time * 1.2) * 0.15;
        }
      }

      // Crawler ceiling/wall mechanics (Floor 1 & higher)
      if (m.state === 'ceiling_crawl') {
        // Skittering audio when near
        if (distToPlayer < 8 && Math.random() < 0.03) {
          soundEngine.playCrawlerSkitter();
        }

        // Drop down if player gets close or shines flashlight directly on it
        if (distToPlayer < 4.5 || (distToPlayer < 9 && this.isFlashlightOn)) {
          m.state = 'chase';
          soundEngine.playCrawlerScreech();
          this.callbacks.onHorrorStinger('Crawler dropping from ceiling!');
        } else {
          // Crawl along ceiling towards darkness
          mPos.y = 3.2;
          m.mesh.rotation.x = Math.PI; // upside down
          return;
        }
      }

      // Normal Monster ground AI
      m.mesh.rotation.x = 0;
      mPos.y = m.type === 'boss_warden' ? 0 : (m.type === 'crawler' ? 0.3 : 0.6);

      // Aggro logic
      if (distToPlayer < (m.type === 'boss_warden' ? 25 : 12)) {
        m.state = 'chase';
      }

      if (m.state === 'chase') {
        // Face player
        const dir = this.playerPos.clone().sub(mPos);
        dir.y = 0;
        const angle = Math.atan2(dir.x, dir.z);
        m.mesh.rotation.y = angle;

        // Move towards player if not too close
        if (distToPlayer > (m.type === 'boss_warden' ? 2.5 : 1.2)) {
          dir.normalize();
          mPos.x += dir.x * m.speed * dt;
          mPos.z += dir.z * m.speed * dt;
        } else {
          // Attack player
          m.attackCooldown -= dt;
          if (m.attackCooldown <= 0) {
            m.attackCooldown = m.type === 'boss_warden' ? 1.8 : 1.2;
            this.damagePlayer(m.damage);
            soundEngine.playMonsterGrowl(1.5);
          }
        }
      } else if (m.state === 'patrol') {
        // Simple wander
        mPos.z += Math.sin(performance.now() * 0.001) * dt * 0.8;
      }
    });
  }

  private damagePlayer(amount: number) {
    this.health = Math.max(0, this.health - amount);
    soundEngine.playPlayerHurt();
    this.callbacks.onDamageFlash();
    this.callbacks.onHealthChange(this.health, this.maxHealth);

    if (this.health <= 0) {
      this.callbacks.onGameOver('died');
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 9.8 * dt; // gravity
      }
    }
  }

  private updateInteractionPrompt() {
    let prompt: string | null = null;

    // Check item pickups
    for (const item of this.itemEntities) {
      if (item.pickedUp) continue;
      if (item.mesh.position.distanceTo(this.playerPos) < 2.4) {
        prompt = `[E] Pick up ${item.name}`;
        break;
      }
    }

    // Check stairs door
    if (!prompt && this.stairsDoorMesh) {
      if (this.stairsDoorMesh.position.distanceTo(this.playerPos) < 3.0) {
        prompt = this.isStairsUnlocked ? '[E] Ascend to Next Floor' : `[LOCKED] Destroy Cameras (${this.destroyedCamerasCount}/${this.totalCamerasCount})`;
      }
    }

    this.callbacks.onInteractPrompt(prompt);
  }

  public restartFloor() {
    this.health = 100;
    this.stamina = 100;
    this.loadFloor(this.currentFloor);
  }

  public restartFullGame() {
    this.health = 100;
    this.stamina = 100;
    this.totalGameSeconds = 0;
    this.weapons = [
      { id: 'pipe', name: 'Lead Pipe', damage: 35, range: 2.8, ammo: 1, maxAmmo: 1, isRanged: false, cooldown: 550 },
    ];
    this.currentWeaponIndex = 0;
    this.inventory = [
      { id: 'medkit', type: 'medkit', name: 'Emergency Medkit', description: 'Restores +50 Health', count: 1 },
      { id: 'energy_drink', type: 'energy_drink', name: 'Stamina Surge Drink', description: 'Restores stamina & boosts speed for 15s', count: 1 },
    ];
    this.loadFloor(1);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  public dispose() {
    this.isRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    soundEngine.stopAmbient();
    this.renderer.dispose();
  }
}
