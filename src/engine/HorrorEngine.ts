import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';
import { FLOOR_CONFIGS, LORE_NOTES } from './LevelData';
import { FloorObjective, InventoryItem, NoteDoc, Weapon } from '../types';
import {
  BatterySpawnLocation,
  CameraEntity,
  EngineCallbacks,
  HidingSpotEntity,
  InteractiveWorldObject,
  ItemEntity,
  MonsterEntity,
  ParanormalProp,
  WallBox,
} from './EntityTypes';
import { ParticlePool } from './ParticlePool';
import { MonsterBuilder } from './MonsterBuilder';
import { RoomBuilder } from './RoomBuilder';

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
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private isSprinting = false;
  private speedBoostTimer = 0;

  // Crouch & Stealth Hiding System
  public isCrouched: boolean = false;
  public isHiding: boolean = false;
  public currentHidingSpot: HidingSpotEntity | null = null;
  private hidingSpots: HidingSpotEntity[] = [];
  private targetCameraY: number = 1.6;
  private currentCameraY: number = 1.6;

  // Inventory & Weapons
  private weapons: Weapon[] = [
    { id: 'pipe', name: 'Lead Pipe', damage: 35, range: 2.8, ammo: 1, maxAmmo: 1, isRanged: false, cooldown: 500 },
  ];
  private currentWeaponIndex = 0;
  private weaponCooldownTimer = 0;
  private inventory: InventoryItem[] = [
    { id: 'medkit', type: 'medkit', name: 'Emergency Medkit', description: 'Restores +50 Health', count: 1 },
    { id: 'energy_drink', type: 'energy_drink', name: 'Stamina Surge Drink', description: 'Restores stamina & boosts speed for 15s', count: 1 },
    { id: 'battery', type: 'battery', name: 'Flashlight Battery', description: 'Heavy-Duty Cell. Restores Flashlight Battery +60% [B]', count: 1 },
  ];

  // Flashlight & Viewmodel
  private flashlight: THREE.SpotLight | null = null;
  private flashlightTarget: THREE.Object3D | null = null;
  private torchInnerGlow: THREE.PointLight | null = null;
  private isFlashlightOn: boolean = true;
  private flashlightBattery: number = 100;
  private maxFlashlightBattery: number = 100;
  private batteryDrainRate: number = 1.05; // drains ~1.05% per sec when on
  private flashlightFlickerTimer: number = 0;
  private flickerStateTimer: number = 0;
  private flickerSoundCooldown: number = 0;
  private lastBatterySent: number = 100;
  private baseFlashlightColor: THREE.Color = new THREE.Color(0xfffaed);
  private dyingFlashlightColor: THREE.Color = new THREE.Color(0xee6611);
  private viewmodelGroup: THREE.Group | null = null;
  private pipeMesh: THREE.Group | null = null;
  private pistolMesh: THREE.Group | null = null;
  private revolverMesh: THREE.Group | null = null;
  private shotgunMesh: THREE.Group | null = null;
  private heartAltarMesh: THREE.Group | null = null;
  private heartGemMesh: THREE.Mesh | null = null;

  // Level & Progression
  public currentFloor: number = 1;
  private floorObjectives: FloorObjective[] = [];
  private destroyedCamerasCount: number = 0;
  private totalCamerasCount: number = 2;
  private isStairsUnlocked: boolean = false;
  private stairsDoorMesh: THREE.Group | null = null;
  private stairsLight: THREE.PointLight | null = null;

  // Game Time (12:00 AM -> 06:00 AM)
  private totalGameSeconds: number = 0;
  private maxNightSeconds: number = 900;
  private gameTimeProgress: number = 0;

  // Entities & World
  private walls: WallBox[] = [];
  private cameraEntities: CameraEntity[] = [];
  private monsterEntities: MonsterEntity[] = [];
  private itemEntities: ItemEntity[] = [];
  private interactiveObjects: InteractiveWorldObject[] = [];
  private paranormalProps: ParanormalProp[] = [];
  private particlePool: ParticlePool;

  // Reusable scratch vectors for 60+ FPS without garbage collection stutter
  private _scratchVec1 = new THREE.Vector3();
  private _scratchVec2 = new THREE.Vector3();
  private _scratchCamDir = new THREE.Vector3();

  // Paranormal Scheduler
  private paranormalTimer: number = 0;
  private nextParanormalInterval: number = 12;

  // Input & Timers
  private keys: Record<string, boolean> = {
    w: false, a: false, s: false, d: false, shift: false, e: false, f: false, r: false, c: false, b: false, z: false, v: false, control: false,
  };
  private mouseSensitivity: number = 0.0022;
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();
  private footstepTimer: number = 0;
  private heartbeatTimer: number = 0;
  private currentHeartbeatBPM: number = 68;
  private currentTensionLevel: number = 0;
  private nearestLivingMonsterDistance: number | null = null;
  private heartbeatPulseCount: number = 0;
  private continuousTelemetryTimer: number = 0;
  private quickTurnCooldownTimer: number = 0;
  private cameraRollImpulse: number = 0;
  private quickAccessItemTypes: Array<'medkit' | 'energy_drink' | 'battery'> = ['medkit', 'energy_drink', 'battery'];
  private selectedQuickItemIndex: number = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1.6, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.particlePool = new ParticlePool(this.scene);

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
    // High-atmosphere dynamic spotlight casting soft elongated shadows
    this.flashlight = new THREE.SpotLight(0xfffaed, 7.0, 48, Math.PI / 4.0, 0.35, 1.4);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 48;
    this.flashlight.shadow.bias = -0.0005;
    this.flashlight.shadow.radius = 4.0;

    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.scene.add(this.flashlight);

    this.torchInnerGlow = new THREE.PointLight(0xfff5dc, 1.8, 14, 1.6);
    this.scene.add(this.torchInnerGlow);

    const ambient = new THREE.AmbientLight(0x384150, 0.65);
    this.scene.add(ambient);
  }

  private setupViewmodels() {
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);
    this.scene.add(this.camera);

    // 1. Lead Pipe
    this.pipeMesh = new THREE.Group();
    const pipeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.4, metalness: 0.85 });
    const pipeObj = new THREE.Mesh(pipeGeom, pipeMat);
    pipeObj.rotation.x = Math.PI / 3;
    pipeObj.rotation.z = -Math.PI / 6;
    pipeObj.castShadow = true;
    this.pipeMesh.add(pipeObj);
    this.pipeMesh.position.set(0.28, -0.3, -0.45);
    this.viewmodelGroup.add(this.pipeMesh);

    // 2. Tactical 9mm Pistol
    this.pistolMesh = new THREE.Group();
    const pSteelMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.9, roughness: 0.25 });
    const pPolymerMat = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.85 });
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.24), pSteelMat);
    pSlide.position.set(0, 0.035, -0.06);
    pSlide.castShadow = true;
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.065), pPolymerMat);
    pGrip.rotation.x = -0.22;
    pGrip.position.set(0, -0.05, 0.02);
    pGrip.castShadow = true;
    this.pistolMesh.add(pSlide, pGrip);
    this.pistolMesh.position.set(0.24, -0.26, -0.4);
    this.pistolMesh.visible = false;
    this.viewmodelGroup.add(this.pistolMesh);

    // 3. Revolver
    this.revolverMesh = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.9, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.7 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.15);
    barrel.castShadow = true;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), woodMat);
    grip.rotation.x = -0.3;
    grip.position.set(0, -0.06, 0.06);
    grip.castShadow = true;
    this.revolverMesh.add(barrel, grip);
    this.revolverMesh.position.set(0.25, -0.28, -0.42);
    this.revolverMesh.visible = false;
    this.viewmodelGroup.add(this.revolverMesh);

    // 4. Shotgun
    this.shotgunMesh = new THREE.Group();
    const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 12), gunMat);
    sBarrel.rotation.x = Math.PI / 2;
    sBarrel.position.set(0, 0.04, -0.25);
    sBarrel.castShadow = true;
    this.shotgunMesh.add(sBarrel);
    this.shotgunMesh.position.set(0.25, -0.28, -0.45);
    this.shotgunMesh.visible = false;
    this.viewmodelGroup.add(this.shotgunMesh);
  }

  public loadFloor(floorNum: number) {
    this.currentFloor = floorNum;
    const config = FLOOR_CONFIGS[floorNum] || FLOOR_CONFIGS[1];
    soundEngine.startAmbient(floorNum);

    this.clearLevelEntities();

    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    this.scene.background = new THREE.Color(config.fogColor);

    // Reset Player Position at Entrance
    this.playerPos.set(0, 1.6, 2.5);
    this.playerRot = { yaw: 0, pitch: 0 };
    this.isCrouched = false;
    this.isHiding = false;
    this.currentHidingSpot = null;
    this.targetCameraY = 1.6;
    this.currentCameraY = 1.6;

    // Initialize Objectives
    this.floorObjectives = config.objectives ? JSON.parse(JSON.stringify(config.objectives)) : [];
    this.totalCamerasCount = config.targetCamerasCount || 0;
    this.destroyedCamerasCount = 0;
    this.isStairsUnlocked = false;

    this.callbacks.onFloorChange(floorNum);
    this.callbacks.onCamerasChange(this.destroyedCamerasCount, this.totalCamerasCount);
    this.callbacks.onObjectivesChange?.(this.floorObjectives);
    this.callbacks.onCrouchChange?.(this.isCrouched, this.isHiding);

    // Build Floor Architecture, Fixtures & Hiding Spots
    const buildResult = RoomBuilder.buildFloor(this.scene, floorNum, (taskId) => {
      this.handleInteractiveTaskCompleted(taskId);
    });

    this.walls = buildResult.walls;
    this.interactiveObjects = buildResult.interactiveObjects;
    this.hidingSpots = buildResult.hidingSpots || [];
    this.stairsDoorMesh = buildResult.stairsDoorMesh;
    this.stairsLight = buildResult.stairsLight;

    // Spawn Paranormal Furniture Props
    this.spawnParanormalFurniture(floorNum);

    // Spawn Security Cameras
    this.spawnSecurityCameras(floorNum);

    // Spawn Items & Weapon Pickups
    this.spawnFloorPickups(floorNum);

    // Spawn Monsters & Crawlers
    this.spawnMonsters(floorNum);

    // Setup Floor 5 Boss Altar
    if (floorNum === 5) {
      this.setupFloor5Altar();
    }

    this.callbacks.onHorrorStinger(`Entered ${config.name}`);
  }

  private clearLevelEntities() {
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const child = this.scene.children[i];
      if (child !== this.camera && child !== this.flashlight && child !== this.flashlightTarget && child !== this.torchInnerGlow) {
        this.scene.remove(child);
      }
    }

    this.walls = [];
    this.cameraEntities = [];
    this.monsterEntities = [];
    this.itemEntities = [];
    this.interactiveObjects = [];
    this.hidingSpots = [];
    this.paranormalProps = [];
    this.particlePool.clear();
  }

  private updateObjective(id: string, updates: Partial<FloorObjective>) {
    const obj = this.floorObjectives.find(o => o.id === id);
    if (obj) {
      Object.assign(obj, updates);
      this.callbacks.onObjectivesChange?.(this.floorObjectives);
      this.checkStaircaseUnlock();
    }
  }

  private handleInteractiveTaskCompleted(taskId: string) {
    if (taskId === 'breaker') {
      soundEngine.playBreakerSwitch();
      this.particlePool.createSparks(this.playerPos.x, 1.6, this.playerPos.z - 0.5, 10);
      this.updateObjective('breaker', { completed: true });
      this.callbacks.onHorrorStinger('Power Breaker engaged! Main power restored.');
    } else if (taskId === 'firewall') {
      soundEngine.playKeycardBeep();
      this.updateObjective('firewall', { completed: true });
      this.callbacks.onHorrorStinger('Firewall Disarmed! Security lock loosened.');
    } else if (taskId === 'piano') {
      soundEngine.playPianoChord();
      this.updateObjective('piano', { completed: true });
      this.callbacks.onHorrorStinger('Ballroom Piano played! An occult seal dissolves.');
    } else if (taskId === 'altar' || taskId === 'altars') {
      soundEngine.playAltarCleanse();
      this.particlePool.createStunShockwave(this.playerPos.x, 1.2, this.playerPos.z - 0.5, 10);
      this.updateObjective('altar', { completed: true });
      this.callbacks.onHorrorStinger('Blood Altar cleansed!');
    }
  }

  private checkStaircaseUnlock() {
    const allDone = this.floorObjectives.length === 0 || this.floorObjectives.every(o => o.completed);
    if (allDone && !this.isStairsUnlocked) {
      this.unlockStaircase();
    }
  }

  private unlockStaircase() {
    this.isStairsUnlocked = true;
    soundEngine.playDoorUnlock();
    this.callbacks.onHorrorStinger('All tasks complete! Staircase to next floor unlocked!');

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

  private spawnParanormalFurniture(floor: number) {
    // Chairs
    this.createParanormalChair(-2.4, 0, -8, Math.PI / 4, `chair_${floor}_1`);
    this.createParanormalChair(2.4, 0, -22, -Math.PI / 3, `chair_${floor}_2`);
    this.createParanormalChair(-2.4, 0, -38, Math.PI / 6, `chair_${floor}_3`);

    // TVs
    this.createParanormalTV(-2.5, 0.8, -18, Math.PI / 2, `tv_${floor}_1`);
    this.createParanormalTV(2.5, 0.8, -34, -Math.PI / 2, `tv_${floor}_2`);

    // Rolling Props
    this.createParanormalRolling(0.8, 0.15, -14, `roll_${floor}_1`);
    this.createParanormalRolling(-0.8, 0.15, -30, `roll_${floor}_2`);
  }

  private createParanormalChair(x: number, y: number, z: number, rotY: number, id: string) {
    const chair = new THREE.Group();
    chair.position.set(x, y, z);
    chair.rotation.y = rotY;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.7 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), woodMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    chair.add(seat);
    this.scene.add(chair);

    this.paranormalProps.push({
      id,
      type: 'chair',
      mesh: chair,
      initialPos: new THREE.Vector3(x, y, z),
      initialRot: new THREE.Euler(0, rotY, 0),
      state: 'idle',
      animTimer: 0,
    });
  }

  private createParanormalTV(x: number, y: number, z: number, rotY: number, id: string) {
    const tv = new THREE.Group();
    tv.position.set(x, y, z);
    tv.rotation.y = rotY;
    const tvMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.8 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), tvMat);
    box.castShadow = true;
    tv.add(box);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x11161a, roughness: 0.2 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.38), screenMat);
    screen.position.set(0, 0, 0.205);
    tv.add(screen);
    const light = new THREE.PointLight(0x66aaff, 0, 4);
    light.position.set(0, 0, 0.3);
    tv.add(light);
    this.scene.add(tv);

    this.paranormalProps.push({
      id,
      type: 'tv',
      mesh: tv,
      initialPos: new THREE.Vector3(x, y, z),
      initialRot: new THREE.Euler(0, rotY, 0),
      state: 'idle',
      animTimer: 0,
      light,
      tvScreen: screen,
    });
  }

  private createParanormalRolling(x: number, y: number, z: number, id: string) {
    const geom = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.6 });
    const sphere = new THREE.Mesh(geom, mat);
    sphere.position.set(x, y, z);
    sphere.castShadow = true;
    this.scene.add(sphere);

    this.paranormalProps.push({
      id,
      type: 'rolling_object',
      mesh: sphere,
      initialPos: new THREE.Vector3(x, y, z),
      initialRot: new THREE.Euler(),
      state: 'idle',
      animTimer: 0,
    });
  }

  private spawnSecurityCameras(floor: number) {
    if (floor === 5) return;
    const cameraZ = floor === 1 ? [-14, -36] : (floor === 2 ? [-16, -38] : [-12, -26, -42]);

    cameraZ.forEach((cz, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const cx = side * (floor === 3 ? 3.8 : 3.2);
      this.createSecurityCamera(`cam_${floor}_${i}`, cx, 3.4, cz, side === -1 ? Math.PI / 2 : -Math.PI / 2);
    });
  }

  private createSecurityCamera(id: string, x: number, y: number, z: number, rotY: number) {
    const camGroup = new THREE.Group();
    camGroup.position.set(x, y, z);
    camGroup.rotation.y = rotY;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.45), bodyMat);
    body.castShadow = true;
    camGroup.add(body);

    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lightMat);
    lightMesh.position.set(0, -0.05, 0.22);
    camGroup.add(lightMesh);

    const spotLight = new THREE.SpotLight(0xff0022, 3.5, 12, Math.PI / 5, 0.5);
    spotLight.position.set(0, -0.05, 0.22);
    camGroup.add(spotLight);
    this.scene.add(camGroup);

    this.cameraEntities.push({
      id,
      mesh: camGroup,
      lightMesh,
      spotLight,
      x,
      y,
      z,
      health: 35,
      isDestroyed: false,
      baseRotY: rotY,
      scanTime: Math.random() * Math.PI * 2,
    });
  }

  // Battery Spawn System Pools: Candidate tables and cupboards per floor
  private readonly BATTERY_SPAWN_POOLS: Record<number, BatterySpawnLocation[]> = {
    1: [
      // Tables & Counters
      { id: 'fl1_tbl_reception', floor: 1, x: 1.8, y: 1.15, z: -6.0, surfaceType: 'table', locationName: 'Reception Counter Tabletop' },
      { id: 'fl1_tbl_security', floor: 1, x: -7.5, y: 0.9, z: -12.0, surfaceType: 'table', locationName: 'Security Monitoring Desk' },
      { id: 'fl1_tbl_lounge', floor: 1, x: 6.0, y: 0.9, z: -28.0, surfaceType: 'table', locationName: 'Lounge Side Table' },
      { id: 'fl1_tbl_hall_n', floor: 1, x: 1.5, y: 0.9, z: -14.0, surfaceType: 'table', locationName: 'Hallway Telephone Table' },
      { id: 'fl1_tbl_hall_s', floor: 1, x: -1.5, y: 0.9, z: -32.0, surfaceType: 'table', locationName: 'Hallway Console Table' },
      // Cupboards & Wardrobes
      { id: 'fl1_cpb_wardrobe', floor: 1, x: -1.2, y: 0.65, z: -20.0, surfaceType: 'cupboard', locationName: 'Lobby Antique Wardrobe' },
      { id: 'fl1_cpb_sec_closet', floor: 1, x: -9.5, y: 0.65, z: -9.0, surfaceType: 'cupboard', locationName: 'Security Storage Closet' },
      { id: 'fl1_cpb_lounge_cab', floor: 1, x: 9.2, y: 0.65, z: -26.0, surfaceType: 'cupboard', locationName: 'Lounge Wall Cupboard' },
      { id: 'fl1_cpb_hall_linen', floor: 1, x: 1.5, y: 0.65, z: -44.0, surfaceType: 'cupboard', locationName: 'Corridor Linen Cupboard' },
    ],
    2: [
      // Tables
      { id: 'fl2_tbl_detective', floor: 2, x: -8.8, y: 0.9, z: -12.0, surfaceType: 'table', locationName: 'Detective Suite Desk' },
      { id: 'fl2_tbl_bedside', floor: 2, x: -5.8, y: 0.88, z: -16.0, surfaceType: 'table', locationName: 'Suite Bedside Table' },
      { id: 'fl2_tbl_dressing', floor: 2, x: 5.8, y: 0.9, z: -30.0, surfaceType: 'table', locationName: 'Suite Dressing Table' },
      { id: 'fl2_tbl_hall_n', floor: 2, x: 1.5, y: 0.9, z: -14.0, surfaceType: 'table', locationName: 'Hallway Telephone Table' },
      { id: 'fl2_tbl_hall_s', floor: 2, x: -1.5, y: 0.9, z: -32.0, surfaceType: 'table', locationName: 'Hallway Console Table' },
      // Cupboards & Lockers
      { id: 'fl2_cpb_armory_lock', floor: 2, x: -1.2, y: 0.65, z: -22.0, surfaceType: 'cupboard', locationName: 'Corridor Armory Locker' },
      { id: 'fl2_cpb_suite_lock', floor: 2, x: -9.2, y: 0.65, z: -12.0, surfaceType: 'cupboard', locationName: 'Suite Armory Locker' },
      { id: 'fl2_cpb_bath_cab', floor: 2, x: 9.2, y: 0.65, z: -34.0, surfaceType: 'cupboard', locationName: 'Bathroom Medicine Cupboard' },
      { id: 'fl2_cpb_hall_store', floor: 2, x: 1.5, y: 0.65, z: -44.0, surfaceType: 'cupboard', locationName: 'Hallway Storage Cupboard' },
    ],
    3: [
      // Tables
      { id: 'fl3_tbl_piano', floor: 3, x: -8.0, y: 0.9, z: -13.0, surfaceType: 'table', locationName: 'Grand Piano Stand' },
      { id: 'fl3_tbl_banquet', floor: 3, x: -6.2, y: 0.9, z: -17.0, surfaceType: 'table', locationName: 'Ballroom Banquet Table' },
      { id: 'fl3_tbl_reading', floor: 3, x: 6.0, y: 0.9, z: -32.0, surfaceType: 'table', locationName: 'Library Reading Table' },
      { id: 'fl3_tbl_hall_n', floor: 3, x: 1.5, y: 0.9, z: -14.0, surfaceType: 'table', locationName: 'Hallway Telephone Table' },
      { id: 'fl3_tbl_hall_s', floor: 3, x: -1.5, y: 0.9, z: -32.0, surfaceType: 'table', locationName: 'Hallway Console Table' },
      // Cupboards & Wardrobes
      { id: 'fl3_cpb_wardrobe', floor: 3, x: 1.2, y: 0.65, z: -20.0, surfaceType: 'cupboard', locationName: 'Gothic Hallway Wardrobe' },
      { id: 'fl3_cpb_props', floor: 3, x: -10.5, y: 0.65, z: -16.0, surfaceType: 'cupboard', locationName: 'Stage Props Cupboard' },
      { id: 'fl3_cpb_archive_w', floor: 3, x: 11.5, y: 0.65, z: -32.0, surfaceType: 'cupboard', locationName: 'Archive Double Wardrobe' },
      { id: 'fl3_cpb_catalog', floor: 3, x: 10.5, y: 0.65, z: -28.0, surfaceType: 'cupboard', locationName: 'Catalog Cupboard' },
      { id: 'fl3_cpb_hall_gothic', floor: 3, x: -1.5, y: 0.65, z: -44.0, surfaceType: 'cupboard', locationName: 'Gothic Hallway Cupboard' },
    ],
    4: [
      // Tables & Workstations
      { id: 'fl4_tbl_gurney', floor: 4, x: -5.5, y: 0.95, z: -12.0, surfaceType: 'table', locationName: 'Autopsy Gurney Table' },
      { id: 'fl4_tbl_lab', floor: 4, x: -6.0, y: 0.9, z: -16.0, surfaceType: 'table', locationName: 'Occult Lab Table' },
      { id: 'fl4_tbl_alchemy', floor: 4, x: 9.5, y: 0.9, z: -30.0, surfaceType: 'table', locationName: 'Alchemy Ritual Table' },
      { id: 'fl4_tbl_hall_n', floor: 4, x: 1.5, y: 0.9, z: -14.0, surfaceType: 'table', locationName: 'Hallway Telephone Table' },
      { id: 'fl4_tbl_hall_s', floor: 4, x: -1.5, y: 0.9, z: -32.0, surfaceType: 'table', locationName: 'Hallway Console Table' },
      // Cupboards & Cabinets
      { id: 'fl4_cpb_contain_lock', floor: 4, x: -1.2, y: 0.65, z: -20.0, surfaceType: 'cupboard', locationName: 'Containment Steel Locker' },
      { id: 'fl4_cpb_chemical', floor: 4, x: -9.5, y: 0.65, z: -14.0, surfaceType: 'cupboard', locationName: 'Chemical Storage Cupboard' },
      { id: 'fl4_cpb_specimen', floor: 4, x: 8.5, y: 0.65, z: -34.0, surfaceType: 'cupboard', locationName: 'Alchemical Specimen Cupboard' },
      { id: 'fl4_cpb_med_store', floor: 4, x: 1.5, y: 0.65, z: -44.0, surfaceType: 'cupboard', locationName: 'Medical Supply Cupboard' },
    ],
    5: [
      // Tables & Pedestals
      { id: 'fl5_tbl_east_altar', floor: 5, x: 4.5, y: 0.88, z: -14.0, surfaceType: 'table', locationName: 'East Offering Table' },
      { id: 'fl5_tbl_west_altar', floor: 5, x: -4.5, y: 0.88, z: -14.0, surfaceType: 'table', locationName: 'West Offering Table' },
      { id: 'fl5_tbl_ritual_ped', floor: 5, x: -3.5, y: 0.88, z: -20.0, surfaceType: 'table', locationName: 'Ritual Pedestal Table' },
      { id: 'fl5_tbl_dais_cons', floor: 5, x: 3.5, y: 0.88, z: -20.0, surfaceType: 'table', locationName: 'Dais Console Table' },
      // Cupboards & Storage
      { id: 'fl5_cpb_emergency', floor: 5, x: -4.5, y: 0.65, z: -6.0, surfaceType: 'cupboard', locationName: 'Emergency Supply Cupboard' },
      { id: 'fl5_cpb_vault_cab', floor: 5, x: 4.5, y: 0.65, z: -26.0, surfaceType: 'cupboard', locationName: 'Security Vault Cabinet' },
    ],
  };

  private spawnRandomFlashlightBatteries(floor: number) {
    const pool = this.BATTERY_SPAWN_POOLS[floor];
    if (!pool || pool.length === 0) return;

    // Separate candidate locations into tables and cupboards to guarantee variety across both surfaces
    const tableSpots = pool.filter(s => s.surfaceType === 'table');
    const cupboardSpots = pool.filter(s => s.surfaceType === 'cupboard');

    const shuffle = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledTables = shuffle(tableSpots);
    const shuffledCupboards = shuffle(cupboardSpots);

    // Pick 3 to 4 battery spawns per floor level (ensuring both tables & cupboards receive items)
    const targetCount = Math.min(pool.length, floor === 5 ? 3 : 3 + (Math.random() > 0.4 ? 1 : 0));
    const selectedSpots: BatterySpawnLocation[] = [];

    if (shuffledTables.length > 0) selectedSpots.push(shuffledTables[0]);
    if (shuffledCupboards.length > 0) selectedSpots.push(shuffledCupboards[0]);

    const remainingPool = shuffle([
      ...shuffledTables.slice(1),
      ...shuffledCupboards.slice(1),
    ]);

    while (selectedSpots.length < targetCount && remainingPool.length > 0) {
      selectedSpots.push(remainingPool.pop()!);
    }

    // Spawn 3D batteries with location metadata
    selectedSpots.forEach((spot, idx) => {
      this.createBatteryPickup(
        `batt_rnd_${floor}_${idx}`,
        spot.x,
        spot.y,
        spot.z,
        spot.surfaceType,
        spot.locationName
      );
    });
  }

  private createBatteryPickup(
    id: string,
    x: number,
    y: number,
    z: number,
    surfaceType: 'table' | 'cupboard',
    locationName: string
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Cylindrical battery model
    const battGroup = new THREE.Group();

    // If on a table, slight natural resting angle or upright; in cupboard, upright on shelf
    if (surfaceType === 'table' && Math.random() < 0.25) {
      battGroup.rotation.z = Math.PI / 2;
      battGroup.position.y = 0.065;
    } else {
      battGroup.position.y = 0.11;
    }

    const bodyGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.35,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    battGroup.add(body);

    // Gold terminal nub
    const termGeom = new THREE.CylinderGeometry(0.028, 0.028, 0.035, 12);
    const termMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.2,
    });
    const term = new THREE.Mesh(termGeom, termMat);
    term.position.y = 0.12;
    battGroup.add(term);

    // Glowing power band
    const ringGeom = new THREE.CylinderGeometry(0.068, 0.068, 0.05, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    battGroup.add(ring);

    group.add(battGroup);

    // Emissive amber beacon light for discovery in dark cupboards and on dim tables
    const glow = new THREE.PointLight(0xfbbf24, surfaceType === 'cupboard' ? 0.95 : 0.8, 3.2);
    glow.position.set(0, 0.15, 0);
    group.add(glow);

    this.scene.add(group);
    this.itemEntities.push({
      id,
      type: 'battery',
      name: 'Flashlight Battery (+60%)',
      mesh: group,
      pickedUp: false,
      surfaceType,
      locationName,
    });
  }

  private spawnFloorPickups(floor: number) {
    // Medkits & Energy drinks
    this.createItemPickup(`med_${floor}_1`, 'medkit', 'Emergency Medkit', -2.0, 0.3, -16);
    this.createItemPickup(`drink_${floor}_1`, 'energy_drink', 'Stamina Surge Drink', 2.0, 0.3, -26);

    // Dynamic Flashlight Battery spawn system (randomly placed on tables and in cupboards)
    this.spawnRandomFlashlightBatteries(floor);

    // Unique story & weapon items per floor
    if (floor === 1) {
      this.createItemPickup('keycard_fl1', 'keycard', 'Reception Master Keycard', 1.8, 1.15, -6);
      this.createLoreNotePickup('note_pickup_1', 'note_1', -7.0, 0.8, -12);
    } else if (floor === 2) {
      this.createItemPickup('pistol_fl2', 'pistol', 'Tactical 9mm Pistol', -6.5, 0.85, -12);
      this.createItemPickup('ammo_fl2_1', 'ammo', '9mm Ammunition Box (+15)', -6.0, 0.85, -12);
      this.createLoreNotePickup('note_pickup_2', 'note_2', 5.5, 0.8, -32);
    } else if (floor === 3) {
      this.createItemPickup('sigil_1', 'sigil', 'Ancient Sigil Tablet', 6.2, 1.2, -32);
      this.createItemPickup('revolver_fl3', 'revolver', 'Detective\'s .38 Revolver', -6.0, 0.85, -16);
      this.createItemPickup('ammo_fl3_1', 'ammo', 'Revolver Ammo (+12)', -5.5, 0.85, -16);
      this.createLoreNotePickup('note_pickup_3', 'note_3', -5.0, 0.8, -18);
    } else if (floor === 4) {
      this.createItemPickup('seal_fl4', 'seal', 'Penthouse Master Seal Key', -6.0, 0.85, -14);
      this.createItemPickup('shotgun_fl4', 'shotgun', 'Security 12-Gauge Shotgun', 5.0, 0.85, -30);
      this.createItemPickup('ammo_fl4_1', 'ammo', '12-Gauge Shotgun Shells (+8)', 5.5, 0.85, -30);
      this.createLoreNotePickup('note_pickup_4', 'note_4', 5.0, 0.8, -28);
    }
  }

  private createItemPickup(id: string, type: ItemEntity['type'], name: string, x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    if (type === 'battery') {
      this.createBatteryPickup(id, x, y, z, 'table', 'Tabletop');
      return;
    }

    let matColor = 0x22c55e;
    if (type === 'medkit') matColor = 0xef4444;
    else if (type === 'energy_drink') matColor = 0x3b82f6;
    else if (type === 'pistol' || type === 'revolver' || type === 'shotgun') matColor = 0xf59e0b;
    else if (type === 'ammo') matColor = 0xeab308;
    else if (type === 'keycard' || type === 'seal') matColor = 0x06b6d4;
    else if (type === 'sigil') matColor = 0xa855f7;
    else if (type === 'aurelia_heart') matColor = 0xff0033;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.3, emissive: matColor, emissiveIntensity: 0.5 })
    );
    box.castShadow = true;
    group.add(box);

    const glow = new THREE.PointLight(matColor, 0.9, 3.5);
    glow.position.set(0, 0.2, 0);
    group.add(glow);

    this.scene.add(group);
    this.itemEntities.push({ id, type, name, mesh: group, pickedUp: false });
  }

  private createLoreNotePickup(id: string, noteId: string, x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xfff8e7, side: THREE.DoubleSide })
    );
    paper.rotation.x = -Math.PI / 2;
    group.add(paper);
    const glow = new THREE.PointLight(0xfff0c0, 0.6, 2.5);
    group.add(glow);
    this.scene.add(group);
    this.itemEntities.push({ id, type: 'note', name: 'Investigative Note', mesh: group, pickedUp: false, noteId });
  }

  private spawnMonsters(floor: number) {
    if (floor === 1) {
      this.monsterEntities.push(MonsterBuilder.createMonster('c_1', 'crawler', 'Venting Crawler', 0, 3.2, -18, 'ceiling_crawl'));
      this.monsterEntities.push(MonsterBuilder.createMonster('s_1', 'stalker', 'Hallway Stalker', 0, 0, -42, 'patrol'));
    } else if (floor === 2) {
      this.monsterEntities.push(MonsterBuilder.createMonster('s_2', 'stalker', 'Shadow Stalker', -1.5, 0, -20, 'patrol'));
      this.monsterEntities.push(MonsterBuilder.createMonster('s_3', 'stalker', 'Shadow Stalker', 1.5, 0, -36, 'patrol'));
      this.monsterEntities.push(MonsterBuilder.createMonster('c_3', 'crawler', 'Venting Crawler', 0, 3.2, -28, 'ceiling_crawl'));
    } else if (floor === 3) {
      this.monsterEntities.push(MonsterBuilder.createMonster('b_1', 'brute', 'Armored Goliath (Photophobic)', 0, 0, -22, 'patrol'));
      this.monsterEntities.push(MonsterBuilder.createMonster('s_4', 'stalker', 'Photophobic Stalker', -2.0, 0, -38, 'patrol'));
      this.monsterEntities.push(MonsterBuilder.createMonster('c_4', 'crawler', 'Venting Crawler', 0, 3.2, -16, 'ceiling_crawl'));
    } else if (floor === 4) {
      this.monsterEntities.push(MonsterBuilder.createMonster('p_1', 'phantom', 'Occult Phantom (Photophobic)', 0, 0.6, -18, 'patrol'));
      this.monsterEntities.push(MonsterBuilder.createMonster('p_2', 'phantom', 'Occult Phantom (Photophobic)', 0, 0.6, -34, 'patrol'));
      this.monsterEntities.push(MonsterBuilder.createMonster('b_2', 'brute', 'Nightmare Brute', 0, 0, -44, 'patrol'));
    }

    this.monsterEntities.forEach(m => this.scene.add(m.mesh));
  }

  private setupFloor5Altar() {
    this.heartAltarMesh = new THREE.Group();
    this.heartAltarMesh.position.set(0, 0, -22);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.0, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1216, roughness: 0.9 })
    );
    base.position.y = 0.4;
    base.castShadow = true;
    base.receiveShadow = true;

    const gemGeom = new THREE.OctahedronGeometry(0.45, 2);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xcc0022,
      emissiveIntensity: 0.9,
      roughness: 0.05,
      metalness: 0.95,
    });
    this.heartGemMesh = new THREE.Mesh(gemGeom, gemMat);
    this.heartGemMesh.position.y = 1.8;
    this.heartGemMesh.castShadow = true;

    const gemLight = new THREE.PointLight(0xff0022, 2.5, 8);
    gemLight.position.y = 1.8;

    this.heartAltarMesh.add(base, this.heartGemMesh, gemLight);
    this.scene.add(this.heartAltarMesh);

    // Spawn Boss
    const warden = MonsterBuilder.createMonster('boss_warden', 'boss_warden', 'The Warden of Blackridge', 0, 0, -16, 'idle');
    this.monsterEntities.push(warden);
    this.scene.add(warden.mesh);
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
    if (this.keys[key] !== undefined) this.keys[key] = true;
    if (e.key === 'Shift') this.keys.shift = true;
    if (e.key === 'Control') this.keys.control = true;

    if (key === 'c') this.toggleCrouch();
    if (key === 'f') this.toggleFlashlight();
    if (key === 'b') this.reloadBattery();
    if (key === 'z' || key === 'r' || key === 'v') this.quickTurn();
    if (key === '1' && this.weapons[0]) this.switchWeapon(0);
    if (key === '2' && this.weapons[1]) this.switchWeapon(1);
    if (key === '3' && this.weapons[2]) this.switchWeapon(2);
    if (key === '4' && this.weapons[3]) this.switchWeapon(3);
    if (key === 'q' || key === 'h') this.useItem('medkit');
    if (key === 'x' || key === 'j') this.useItem('energy_drink');
    if (key === 'g' || key === 't' || key === 'tab') {
      if (key === 'tab') e.preventDefault();
      this.cycleQuickItem(1);
    }
    if (key === '[' || key === '{') {
      this.cycleQuickItem(-1);
    }
    if (key === ']' || key === '}') {
      this.cycleQuickItem(1);
    }
    if (key === 'u' || key === 'y') {
      this.consumeSelectedQuickItem();
    }
    if (key === 'e') this.handleInteract();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (this.keys[key] !== undefined) this.keys[key] = false;
    if (e.key === 'Shift') this.keys.shift = false;
    if (e.key === 'Control') this.keys.control = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked || this.isPaused) return;
    this.playerRot.yaw -= e.movementX * this.mouseSensitivity;
    this.playerRot.pitch -= e.movementY * this.mouseSensitivity;
    this.playerRot.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.playerRot.pitch));
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && this.isPointerLocked && !this.isPaused) {
      this.attack();
    }
  };

  public toggleCrouch() {
    this.isCrouched = !this.isCrouched;
    this.targetCameraY = this.isCrouched ? 0.85 : 1.6;
    if (this.isCrouched) {
      soundEngine.playFootstep(false);
    }
    this.callbacks.onCrouchChange?.(this.isCrouched, this.isHiding, this.currentHidingSpot?.name);
  }

  public setCrouch(crouch: boolean) {
    if (this.isCrouched === crouch) return;
    this.isCrouched = crouch;
    this.targetCameraY = this.isCrouched ? 0.85 : 1.6;
    this.callbacks.onCrouchChange?.(this.isCrouched, this.isHiding, this.currentHidingSpot?.name);
  }

  public toggleFlashlight() {
    if (!this.isFlashlightOn && this.flashlightBattery <= 0) {
      soundEngine.playFlashlightClick();
      this.callbacks.onHorrorStinger('Battery depleted! Find or insert a battery [B]');
      return;
    }
    this.isFlashlightOn = !this.isFlashlightOn;
    soundEngine.playFlashlightClick();
    if (this.flashlight) this.flashlight.visible = this.isFlashlightOn;
    if (this.torchInnerGlow) this.torchInnerGlow.visible = this.isFlashlightOn;
    this.callbacks.onFlashlightChange?.(this.isFlashlightOn, Math.round(this.flashlightBattery), this.maxFlashlightBattery);
  }

  public reloadBattery(): boolean {
    return this.useItem('battery');
  }

  public quickTurn() {
    if (this.isPaused || this.quickTurnCooldownTimer > 0) return;
    this.quickTurnCooldownTimer = 0.22;

    // Instantly rotate 180 degrees (Math.PI radians)
    this.playerRot.yaw += Math.PI;

    // Keep yaw normalized within [-PI, PI]
    while (this.playerRot.yaw > Math.PI) this.playerRot.yaw -= 2 * Math.PI;
    while (this.playerRot.yaw < -Math.PI) this.playerRot.yaw += 2 * Math.PI;

    // Subtle momentary camera roll impulse for physical kinetic feedback
    this.cameraRollImpulse = -0.06;

    // Immediately snap camera quaternion to new 180 direction
    const euler = new THREE.Euler(this.playerRot.pitch, this.playerRot.yaw, this.cameraRollImpulse, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // Immediately align flashlight spotlight and inner glow
    this.updateFlashlightAndViewmodel(0);

    // Play procedural quick-turn pivot sound
    soundEngine.playQuickTurn();

    // Trigger visual callback & HUD notification
    this.callbacks.onQuickTurn?.();
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

  public cycleQuickItem(direction: 1 | -1 = 1): 'medkit' | 'energy_drink' | 'battery' {
    this.selectedQuickItemIndex = (this.selectedQuickItemIndex + direction + this.quickAccessItemTypes.length) % this.quickAccessItemTypes.length;
    const selected = this.quickAccessItemTypes[this.selectedQuickItemIndex];
    soundEngine.playItemCycle();
    this.callbacks.onQuickItemSelected?.(selected);
    const item = this.inventory.find(i => i.type === selected);
    const count = item ? item.count : 0;
    const itemName = selected === 'medkit' ? 'Emergency Medkit' : (selected === 'energy_drink' ? 'Adrenaline Surge' : 'Heavy-Duty Battery');
    this.callbacks.onHorrorStinger(`Selected: ${itemName} (${count > 0 ? `x${count}` : 'Depleted'})`);
    return selected;
  }

  public setSelectedQuickItem(type: 'medkit' | 'energy_drink' | 'battery') {
    const idx = this.quickAccessItemTypes.indexOf(type);
    if (idx !== -1) {
      if (this.selectedQuickItemIndex !== idx) {
        soundEngine.playItemCycle();
      }
      this.selectedQuickItemIndex = idx;
      this.callbacks.onQuickItemSelected?.(type);
    }
  }

  public getSelectedQuickItem(): 'medkit' | 'energy_drink' | 'battery' {
    return this.quickAccessItemTypes[this.selectedQuickItemIndex];
  }

  public consumeSelectedQuickItem(): boolean {
    const currentType = this.quickAccessItemTypes[this.selectedQuickItemIndex];
    return this.useItem(currentType);
  }

  public useItem(type: 'medkit' | 'energy_drink' | 'battery'): boolean {
    const idx = this.quickAccessItemTypes.indexOf(type);
    if (idx !== -1) {
      this.selectedQuickItemIndex = idx;
      this.callbacks.onQuickItemSelected?.(type);
    }

    const item = this.inventory.find(i => i.type === type && i.count > 0);
    if (!item) {
      if (type === 'battery') {
        this.callbacks.onHorrorStinger('No spare batteries in inventory! Scavenge the hotel.');
      } else if (type === 'medkit') {
        this.callbacks.onHorrorStinger('No Medkits remaining! Search hotel medicine cabinets.');
      } else if (type === 'energy_drink') {
        this.callbacks.onHorrorStinger('No Adrenaline Drinks left! Look in vending machines.');
      }
      return false;
    }

    if (type === 'medkit') {
      if (this.health >= this.maxHealth) {
        this.callbacks.onHorrorStinger('Vitality already at 100% capacity.');
        return false;
      }
      this.health = Math.min(this.maxHealth, this.health + 50);
      item.count--;
      soundEngine.playItemPickup();
      this.callbacks.onHealthChange(this.health, this.maxHealth);
      this.callbacks.onInventoryChange(this.inventory);
      this.callbacks.onHorrorStinger('Applied Medkit! +50 Health restored.');
      return true;
    } else if (type === 'energy_drink') {
      this.stamina = this.maxStamina;
      this.health = Math.min(this.maxHealth, this.health + 15);
      this.speedBoostTimer = 15;
      item.count--;
      soundEngine.playItemPickup();
      this.callbacks.onHealthChange(this.health, this.maxHealth);
      this.callbacks.onStaminaChange(this.stamina, this.maxStamina);
      this.callbacks.onInventoryChange(this.inventory);
      this.callbacks.onHorrorStinger('Adrenaline Consumed! Stamina full & sprint speed boosted for 15s.');
      return true;
    } else if (type === 'battery') {
      if (this.flashlightBattery >= this.maxFlashlightBattery) {
        this.callbacks.onHorrorStinger('Flashlight battery is already at 100% capacity.');
        return false;
      }
      this.flashlightBattery = Math.min(this.maxFlashlightBattery, this.flashlightBattery + 60);
      item.count--;
      soundEngine.playBatteryReload();
      if (!this.isFlashlightOn) {
        this.isFlashlightOn = true;
        if (this.flashlight) this.flashlight.visible = true;
        if (this.torchInnerGlow) this.torchInnerGlow.visible = true;
      }
      this.callbacks.onInventoryChange(this.inventory);
      this.callbacks.onFlashlightChange?.(this.isFlashlightOn, Math.round(this.flashlightBattery), this.maxFlashlightBattery);
      this.callbacks.onHorrorStinger('Heavy-Duty Battery loaded! Flashlight +60% charged.');
      return true;
    }
    return false;
  }

  private attack() {
    if (this.weaponCooldownTimer > 0) return;
    const weapon = this.weapons[this.currentWeaponIndex];
    if (!weapon) return;

    if (weapon.isRanged && weapon.ammo <= 0) {
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
      this._scratchVec1.set(cam.x, cam.y, cam.z);
      if (this._scratchVec1.distanceTo(this.playerPos) <= weapon.range + 1.2) {
        const dirToCam = this._scratchVec1.sub(this.playerPos).normalize();
        this.camera.getWorldDirection(this._scratchCamDir);
        if (dirToCam.dot(this._scratchCamDir) > 0.8) {
          this.hitCamera(cam, weapon.damage);
        }
      }
    });

    // Check Monsters Hit
    this.monsterEntities.forEach((m) => {
      if (m.isDead) return;
      this._scratchVec1.copy(m.mesh.position);
      if (this._scratchVec1.distanceTo(this.playerPos) <= weapon.range + 1.5) {
        const dirToM = this._scratchVec1.sub(this.playerPos).normalize();
        this.camera.getWorldDirection(this._scratchCamDir);
        if (dirToM.dot(this._scratchCamDir) > 0.7) {
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
    this.particlePool.createSparks(cam.x, cam.y, cam.z, 8);

    if (cam.health <= 0) {
      cam.isDestroyed = true;
      cam.spotLight.visible = false;
      cam.lightMesh.material = new THREE.MeshBasicMaterial({ color: 0x222222 });
      soundEngine.playCameraDestroyed();
      this.particlePool.createExplosion(cam.x, cam.y, cam.z, 10);

      this.destroyedCamerasCount++;
      this.callbacks.onCamerasChange(this.destroyedCamerasCount, this.totalCamerasCount);

      const camObj = this.floorObjectives.find(o => o.id === 'cams');
      if (camObj) {
        const isDone = this.destroyedCamerasCount >= this.totalCamerasCount;
        this.updateObjective('cams', { current: this.destroyedCamerasCount, completed: isDone });
      }
    }
  }

  private hitMonster(m: MonsterEntity, dmg: number, isRanged: boolean = false) {
    m.health -= dmg;
    m.flinchTimer = 0.3;
    soundEngine.playPipeHit();
    this.particlePool.createBlood(m.mesh.position.x, m.mesh.position.y + 0.8, m.mesh.position.z, 8);

    if (isRanged) {
      m.stunTimer = 10.0;
      soundEngine.playMonsterStunned();
      this.particlePool.createStunShockwave(m.mesh.position.x, m.mesh.position.y + 0.6, m.mesh.position.z, 10);
      this.callbacks.onHorrorStinger('Monster shot & stunned for 10s! Run past!');
    }

    if (m.health <= 0) {
      m.isDead = true;
      m.state = 'dead';
      soundEngine.playCrawlerScreech();
      this.scene.remove(m.mesh);

      if (m.type === 'boss_warden') {
        this.callbacks.onHorrorStinger('The Warden has collapsed! Extract the Aurelia Heart Jewel!');
        this.updateObjective('boss', { completed: true });
        this.createItemPickup('aurelia_heart_jewel', 'aurelia_heart', 'The Aurelia Heart Jewel', 0, 1.8, -22);
      }
    } else if (m.stunTimer <= 0) {
      m.state = 'chase';
      soundEngine.playMonsterGrowl(1.3);
    }
  }

  private handleInteract() {
    // 1. Interactive World Objects
    for (const obj of this.interactiveObjects) {
      if (obj.interacted) continue;
      const dist = obj.position.distanceTo(this.playerPos);
      if (dist < 2.6) {
        obj.interacted = true;
        obj.onInteract();
        return;
      }
    }

    // 2. Item Pickups
    for (const item of this.itemEntities) {
      if (item.pickedUp) continue;
      const dist = item.mesh.position.distanceTo(this.playerPos);
      if (dist < 2.6) {
        this.pickupItem(item);
        return;
      }
    }

    // 3. Staircase Exit
    if (this.stairsDoorMesh) {
      const dist = this.stairsDoorMesh.position.distanceTo(this.playerPos);
      if (dist < 3.0) {
        if (this.isStairsUnlocked) {
          if (this.currentFloor < 5) {
            this.loadFloor(this.currentFloor + 1);
          } else {
            this.updateObjective('escape', { completed: true });
            this.callbacks.onVictory();
          }
        } else {
          soundEngine.playFlashlightClick();
          this.callbacks.onHorrorStinger('Staircase locked! Complete all floor objectives first.');
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
      this.updateObjective('pistol', { completed: true });
      this.callbacks.onHorrorStinger('Acquired Tactical 9mm Pistol! Shots stun monsters for 10s!');
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
    } else if (item.type === 'keycard') {
      this.updateObjective('keycard', { completed: true });
      this.callbacks.onHorrorStinger('Master Keycard acquired!');
    } else if (item.type === 'sigil') {
      this.updateObjective('sigil', { completed: true });
      this.callbacks.onHorrorStinger('Collected Ancient Sigil Tablet!');
    } else if (item.type === 'seal') {
      this.updateObjective('seal', { completed: true });
      this.callbacks.onHorrorStinger('Penthouse Master Seal Key acquired!');
    } else if (item.type === 'aurelia_heart') {
      soundEngine.playAureliaHeartExtract();
      this.inventory.push({
        id: 'aurelia_heart',
        type: 'aurelia_heart',
        name: 'The Aurelia Heart Jewel',
        description: 'Supernatural jewel core. Escape through the emergency vault before sunrise!',
        count: 1,
      });
      this.callbacks.onInventoryChange(this.inventory);
      this.updateObjective('heart', { completed: true });
      this.callbacks.onHorrorStinger('Aurelia Heart Jewel extracted! Escape Blackridge Hotel through the vault staircase!');
    } else if (item.type === 'ammo') {
      const pis = this.weapons.find(w => w.id === 'pistol');
      if (pis) pis.ammo = Math.min(pis.maxAmmo, pis.ammo + 15);
      const rev = this.weapons.find(w => w.id === 'revolver');
      if (rev) rev.ammo = Math.min(rev.maxAmmo, rev.ammo + 6);
      const shot = this.weapons.find(w => w.id === 'shotgun');
      if (shot) shot.ammo = Math.min(shot.maxAmmo, shot.ammo + 4);
      this.callbacks.onWeaponChange(this.weapons[this.currentWeaponIndex], this.weapons);
      this.callbacks.onHorrorStinger('+Ammo added to reserves.');
    } else if (item.type === 'battery') {
      soundEngine.playBatteryPickup();
      const invBatt = this.inventory.find(i => i.type === 'battery');
      if (invBatt) {
        invBatt.count++;
      } else {
        this.inventory.push({
          id: 'battery',
          type: 'battery',
          name: 'Flashlight Battery',
          description: 'Heavy-Duty Cell. Restores Flashlight Battery +60% [B]',
          count: 1,
        });
      }
      this.callbacks.onInventoryChange(this.inventory);
      const locText = item.locationName ? ` (${item.locationName})` : '';
      this.callbacks.onHorrorStinger(`Picked up Flashlight Battery (+60%)${locText}! Press [B] to insert.`);
    } else {
      const invItem = this.inventory.find(i => i.type === item.type);
      if (invItem) invItem.count++;
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
    // 1. Time progression
    this.totalGameSeconds += dt;
    this.gameTimeProgress = Math.min(1.0, this.totalGameSeconds / this.maxNightSeconds);
    const totalMinutes = Math.floor(this.gameTimeProgress * 360);
    const hour = (12 + Math.floor(totalMinutes / 60)) % 12 || 12;
    const minute = totalMinutes % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} AM`;
    this.callbacks.onTimeChange(timeStr, this.gameTimeProgress);

    if (this.totalGameSeconds >= this.maxNightSeconds) {
      this.callbacks.onGameOver('timed_out');
      return;
    }

    // 2. Weapon Cooldown
    if (this.weaponCooldownTimer > 0) this.weaponCooldownTimer -= dt * 1000;

    // 3. Movement & Crouch Height Interpolation
    this.updatePlayerMovement(dt);

    // 4. Flashlight & Viewmodel
    this.updateFlashlightAndViewmodel(dt);

    // 5. Cameras
    this.updateCameras(dt);

    // 6. Monsters AI & Separation
    this.updateMonsters(dt);

    // 7. Paranormal Events
    this.updateParanormalEvents(dt);

    // 8. Particles
    this.particlePool.update(dt);

    // 9. Interaction prompt
    this.updateInteractionPrompt();

    // 10. Dynamic Heartbeat & Horror Tension Telemetry
    this.updateHeartbeatAndTension(dt);
  }

  private updateHeartbeatAndTension(dt: number) {
    // 1. Calculate closest living monster and alert state
    let closestDist = 999;
    let hasAggressiveMonster = false;

    for (let i = 0; i < this.monsterEntities.length; i++) {
      const m = this.monsterEntities[i];
      if (m.isDead) continue;
      const d = m.mesh.position.distanceTo(this.playerPos);
      if (d < closestDist) {
        closestDist = d;
      }
      if (m.state === 'chase' || m.state === 'attack') {
        hasAggressiveMonster = true;
      }
    }

    const nearestDist = closestDist < 60 ? closestDist : null;
    this.nearestLivingMonsterDistance = nearestDist;

    // 2. Proximity Tension Component (0.0 to 1.0)
    let proximityTension = 0;
    if (nearestDist !== null) {
      if (nearestDist < 18) {
        proximityTension = Math.max(0, Math.min(1.0, Math.pow((18 - nearestDist) / 16, 1.2)));
      }
      if (hasAggressiveMonster && nearestDist < 20) {
        proximityTension = Math.max(proximityTension, 0.7 + Math.max(0, (15 - nearestDist) / 15) * 0.3);
      }
    }

    // 3. Hiding Tension Component (holding breath in locker / under desk with heightened senses)
    let hidingTension = 0;
    if (this.isHiding) {
      // Base tension for being trapped in a hiding enclosure
      hidingTension = 0.45;
      if (nearestDist !== null && nearestDist < 14) {
        // As monster stalks right past the hiding spot, cardiac tension spikes dramatically
        const stalkProximity = Math.max(0, Math.min(1.0, (14 - nearestDist) / 12));
        hidingTension = 0.55 + stalkProximity * 0.45;
      }
    }

    // 4. Low Health Stress Component
    let healthTension = 0;
    if (this.health < 45) {
      healthTension = ((45 - this.health) / 45) * 0.75;
    }

    // 5. Combine and smoothly interpolate tension & BPM
    const targetTension = Math.min(1.0, Math.max(proximityTension, hidingTension, healthTension));
    this.currentTensionLevel = THREE.MathUtils.lerp(this.currentTensionLevel, targetTension, dt * 3.2);

    // Dynamic BPM Curve: 66 BPM (Rest) -> 172 BPM (Extreme Terror / Hiding near predator)
    const targetBPM = 66 + Math.pow(this.currentTensionLevel, 0.85) * 106;
    this.currentHeartbeatBPM = THREE.MathUtils.lerp(this.currentHeartbeatBPM, targetBPM, dt * 3.8);

    // Heartbeat cadence (seconds between beats)
    const beatInterval = 60 / Math.max(50, this.currentHeartbeatBPM);
    this.heartbeatTimer += dt;
    this.continuousTelemetryTimer += dt;

    if (this.heartbeatTimer >= beatInterval) {
      this.heartbeatTimer = 0;
      this.heartbeatPulseCount++;

      const isAudible = this.currentTensionLevel > 0.06 || this.isHiding || this.health < 45 || (nearestDist !== null && nearestDist < 15);
      if (isAudible) {
        const soundIntensity = 0.55 + this.currentTensionLevel * 1.35;
        soundEngine.playHeartbeat(soundIntensity, this.isHiding, Math.round(this.currentHeartbeatBPM));
      }

      this.callbacks.onHeartbeat?.({
        bpm: Math.round(this.currentHeartbeatBPM),
        tension: this.currentTensionLevel,
        isHiding: this.isHiding,
        isNearMonster: nearestDist !== null && nearestDist < 14,
        nearestMonsterDist: nearestDist !== null ? Math.round(nearestDist * 10) / 10 : null,
        pulseTrigger: this.heartbeatPulseCount,
      });
    } else if (this.continuousTelemetryTimer > 0.15) {
      // Periodic telemetry updates for smooth HUD gauges between beats
      this.continuousTelemetryTimer = 0;
      this.callbacks.onHeartbeat?.({
        bpm: Math.round(this.currentHeartbeatBPM),
        tension: this.currentTensionLevel,
        isHiding: this.isHiding,
        isNearMonster: nearestDist !== null && nearestDist < 14,
        nearestMonsterDist: nearestDist !== null ? Math.round(nearestDist * 10) / 10 : null,
        pulseTrigger: this.heartbeatPulseCount,
      });
    }
  }

  private updatePlayerMovement(dt: number) {
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt;
    if (this.quickTurnCooldownTimer > 0) this.quickTurnCooldownTimer -= dt;
    this.cameraRollImpulse = THREE.MathUtils.lerp(this.cameraRollImpulse, 0, dt * 18);

    // Camera height smooth interpolation
    this.currentCameraY = THREE.MathUtils.lerp(this.currentCameraY, this.targetCameraY, dt * 12);
    this.playerPos.y = this.currentCameraY;

    // Check if player is crouched and inside any hiding spot
    let inHidingSpot: HidingSpotEntity | null = null;
    if (this.isCrouched) {
      for (const spot of this.hidingSpots) {
        if (
          this.playerPos.x >= spot.bounds.minX &&
          this.playerPos.x <= spot.bounds.maxX &&
          this.playerPos.z >= spot.bounds.minZ &&
          this.playerPos.z <= spot.bounds.maxZ
        ) {
          inHidingSpot = spot;
          break;
        }
      }
    }

    const wasHiding = this.isHiding;
    this.isHiding = inHidingSpot !== null;
    this.currentHidingSpot = inHidingSpot;

    if (wasHiding !== this.isHiding) {
      this.callbacks.onCrouchChange?.(this.isCrouched, this.isHiding, inHidingSpot?.name);
    }

    // Sprinting logic
    this.isSprinting = !this.isCrouched && this.keys.shift && (this.keys.w || this.keys.s || this.keys.a || this.keys.d) && this.stamina > 5;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 25);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 18);
    }
    this.callbacks.onStaminaChange(this.stamina, this.maxStamina);

    let moveSpeed = this.isCrouched ? 1.7 : (this.isSprinting ? 5.2 : 3.0);
    if (this.speedBoostTimer > 0) moveSpeed *= 1.3;

    const moveVector = this._scratchVec1.set(0, 0, 0);
    if (this.keys.w) moveVector.z -= 1;
    if (this.keys.s) moveVector.z += 1;
    if (this.keys.a) moveVector.x -= 1;
    if (this.keys.d) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRot.yaw);

      const nextX = this.playerPos.x + moveVector.x * moveSpeed * dt;
      const nextZ = this.playerPos.z + moveVector.z * moveSpeed * dt;

      const playerRadius = this.isCrouched ? 0.28 : 0.35;
      if (!this.checkWallCollision(nextX, this.playerPos.z, playerRadius)) {
        this.playerPos.x = nextX;
      }
      if (!this.checkWallCollision(this.playerPos.x, nextZ, playerRadius)) {
        this.playerPos.z = nextZ;
      }

      // Footstep audio: silent when crouching
      if (!this.isCrouched) {
        const stepCadence = this.isSprinting ? 0.28 : 0.48;
        this.footstepTimer += dt;
        if (this.footstepTimer >= stepCadence) {
          this.footstepTimer = 0;
          soundEngine.playFootstep(this.isSprinting);
        }
      }
    } else {
      this.footstepTimer = 0.38;
    }

    this.camera.position.copy(this.playerPos);
    const euler = new THREE.Euler(this.playerRot.pitch, this.playerRot.yaw, this.cameraRollImpulse, 'YXZ');
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
    if (this.flashlight && this.flashlightTarget && this.torchInnerGlow) {
      this.flashlight.position.copy(this.playerPos);
      this.torchInnerGlow.position.copy(this.playerPos);
      this.camera.getWorldDirection(this._scratchCamDir);
      this.flashlightTarget.position.copy(this.playerPos).add(this._scratchCamDir.multiplyScalar(10));

      if (this.flickerSoundCooldown > 0) {
        this.flickerSoundCooldown -= dt;
      }

      // Flashlight Battery Drain & Low Power Flicker
      if (this.isFlashlightOn) {
        this.flashlightBattery = Math.max(0, this.flashlightBattery - this.batteryDrainRate * dt);

        if (this.flashlightBattery <= 0) {
          this.isFlashlightOn = false;
          this.flashlight.visible = false;
          this.torchInnerGlow.visible = false;
          soundEngine.playFlashlightClick();
          soundEngine.playFlashlightFlicker();
          this.callbacks.onHorrorStinger('Flashlight battery depleted! Press [B] to insert spare battery.');
          this.callbacks.onFlashlightChange?.(false, 0, this.maxFlashlightBattery);
        } else if (this.flashlightBattery < 20) {
          // Low battery visual flickering effect
          // Severity scales from 0 (at 20% battery) to 1.0 (at 0% battery)
          const severity = (20 - this.flashlightBattery) / 20;
          this.flashlightFlickerTimer += dt;
          this.flickerStateTimer += dt;

          // Color shifts from clean white (0xfffaed) to dying tungsten amber/orange (0xee6611) as voltage collapses
          this.flashlight.color.copy(this.baseFlashlightColor).lerp(this.dyingFlashlightColor, severity * 0.85);
          this.torchInnerGlow.color.copy(this.baseFlashlightColor).lerp(this.dyingFlashlightColor, severity * 0.9);

          // Interval between erratic flicker pulses gets shorter as battery dies
          const flickerThreshold = Math.max(0.06, 0.45 - severity * 0.35 + (Math.random() * 0.25));

          if (this.flashlightFlickerTimer > flickerThreshold) {
            this.flashlightFlickerTimer = 0;

            const roll = Math.random();
            let flickerIntensityMultiplier = 1.0;
            let throwDistMultiplier = 1.0;

            if (roll < 0.28 + severity * 0.4) {
              // 1. Sudden pitch-black blackout / dead drop (lasts 1-2 frames)
              flickerIntensityMultiplier = 0.02 + Math.random() * 0.08;
              throwDistMultiplier = 0.2;
              if (this.flickerSoundCooldown <= 0 && Math.random() < 0.45) {
                soundEngine.playFlashlightFlicker();
                this.flickerSoundCooldown = 0.35;
              }
            } else if (roll < 0.65 + severity * 0.25) {
              // 2. Brownout dimming dip (filament struggling under weak current)
              flickerIntensityMultiplier = 0.18 + Math.random() * 0.35;
              throwDistMultiplier = 0.4 + Math.random() * 0.3;
            } else {
              // 3. Stuttering surge recovery (brief flash of light)
              flickerIntensityMultiplier = 0.75 + Math.random() * 0.4;
              throwDistMultiplier = 0.85 + Math.random() * 0.25;
            }

            // Apply calculated visual properties to Three.js lighting
            const nominalIntensity = 7.0 * (1 - severity * 0.45);
            this.flashlight.intensity = nominalIntensity * flickerIntensityMultiplier;
            this.torchInnerGlow.intensity = 1.8 * (1 - severity * 0.45) * flickerIntensityMultiplier;
            this.flashlight.distance = 48 * (1 - severity * 0.55) * throwDistMultiplier;
            
            // Jitter beam angle to simulate filament instability
            this.flashlight.angle = (Math.PI / 4.0) * (0.88 + Math.random() * 0.2);
            this.flashlight.penumbra = 0.35 + Math.random() * 0.3;
          }
        } else {
          // Normal, healthy battery state - restore baseline crisp optics
          this.flashlight.intensity = 7.0;
          this.flashlight.distance = 48;
          this.flashlight.angle = Math.PI / 4.0;
          this.flashlight.penumbra = 0.35;
          this.flashlight.color.setHex(0xfffaed);
          this.torchInnerGlow.intensity = 1.8;
          this.torchInnerGlow.distance = 14;
          this.torchInnerGlow.color.setHex(0xfff5dc);
        }

        const currentInt = Math.round(this.flashlightBattery);
        if (currentInt !== this.lastBatterySent) {
          this.lastBatterySent = currentInt;
          this.callbacks.onFlashlightChange?.(this.isFlashlightOn, currentInt, this.maxFlashlightBattery);
        }
      }
    }
  }

  private updateCameras(dt: number) {
    const time = performance.now() * 0.001;
    this.cameraEntities.forEach((cam) => {
      if (cam.isDestroyed) return;
      const scanAngle = Math.sin(time * 0.8 + cam.scanTime) * 0.6;
      cam.mesh.rotation.y = cam.baseRotY + scanAngle;
    });
  }

  private updateMonsters(dt: number) {
    const time = performance.now() * 0.005;
    let crosshairTargetMonster: MonsterEntity | null = null;
    let closestAimDist = 999;

    this.camera.getWorldDirection(this._scratchCamDir);

    for (let idx = 0; idx < this.monsterEntities.length; idx++) {
      const m = this.monsterEntities[idx];
      if (m.isDead) continue;

      const mPos = m.mesh.position;
      const distToPlayer = mPos.distanceTo(this.playerPos);

      // Update 3D Health Bar Billboard & Scale
      if (m.healthBarGroup && m.healthBarFill) {
        m.healthBarGroup.quaternion.copy(this.camera.quaternion);
        const hpFrac = Math.max(0, m.health / m.maxHealth);
        m.healthBarFill.scale.x = hpFrac;
      }

      // Check crosshair aim
      this._scratchVec1.copy(mPos).sub(this.playerPos).normalize();
      const dot = this._scratchCamDir.dot(this._scratchVec1);
      if (dot > 0.75 && distToPlayer < 24 && distToPlayer < closestAimDist) {
        closestAimDist = distToPlayer;
        crosshairTargetMonster = m;
      }

      // 1. Stun Pause (10s when shot)
      if (m.stunTimer > 0) {
        m.stunTimer -= dt;
        m.mesh.position.x += (Math.random() - 0.5) * 0.008;
        m.mesh.position.z += (Math.random() - 0.5) * 0.008;
        if (m.eyeLight) {
          m.eyeLight.color.setHex(Math.random() > 0.5 ? 0x00ffee : 0x331122);
          m.eyeLight.intensity = 0.8;
        }
        continue;
      } else if (m.eyeLight) {
        m.eyeLight.color.setHex(m.type === 'boss_warden' ? 0xff0033 : 0xff2200);
        m.eyeLight.intensity = 0.9;
      }

      // 2. Torch Photophobia Immobilization (Floors 3 & 4)
      let isTorchFrozen = false;
      if (this.isFlashlightOn && (this.currentFloor === 3 || this.currentFloor === 4)) {
        if (dot > 0.62 && distToPlayer < 32) {
          isTorchFrozen = true;
        }
      }

      if (isTorchFrozen) {
        m.mesh.position.x += (Math.random() - 0.5) * 0.004;
        m.mesh.position.z += (Math.random() - 0.5) * 0.004;
        if (m.eyeLight) {
          m.eyeLight.color.setHex(0xffffff);
          m.eyeLight.intensity = 1.3;
        }
        if (Math.random() < 0.015) {
          soundEngine.playMonsterTorchPetrified();
        }
        continue;
      }

      // Flinch
      if (m.flinchTimer > 0) {
        m.flinchTimer -= dt;
        continue;
      }

      // Limb Animations
      if (m.type === 'crawler') {
        m.animLegs?.forEach((leg, i) => {
          leg.rotation.x = Math.sin(time * 3 + i * 0.9) * 0.35;
        });
      } else if (m.type === 'stalker' || m.type === 'brute' || m.type === 'boss_warden') {
        m.animArms?.forEach((arm, i) => {
          arm.rotation.x = Math.sin(time * 2.5 + i * Math.PI) * 0.4;
        });
      }

      // Crawler Ceiling Mechanics
      if (m.state === 'ceiling_crawl') {
        if (distToPlayer < 4.5 || (distToPlayer < 9 && this.isFlashlightOn)) {
          m.state = 'chase';
          soundEngine.playCrawlerScreech();
          this.callbacks.onHorrorStinger('Crawler dropping from ceiling!');
        } else {
          mPos.y = 3.2;
          m.mesh.rotation.x = Math.PI;
          continue;
        }
      }

      m.mesh.rotation.x = 0;
      mPos.y = m.type === 'boss_warden' ? 0 : (m.type === 'crawler' ? 0.3 : (m.type === 'phantom' ? 0.6 : 0.6));

      // 3. Stealth Hiding & Aggro Detection
      let canDetectPlayer = true;
      let aggroThreshold = m.type === 'boss_warden' ? 28 : 14;

      if (this.isHiding) {
        if (!this.isFlashlightOn) {
          // Completely hidden! Monsters cannot see player
          canDetectPlayer = false;
          if (m.state === 'chase') {
            m.state = 'patrol';
            soundEngine.playMonsterGrowl(0.9);
          }
        } else {
          // Flashlight gives away position if monster gets close
          if (distToPlayer > 5.5) {
            canDetectPlayer = false;
          }
        }
      } else if (this.isCrouched && !this.isFlashlightOn) {
        // Crouched stealth creeping in the dark
        aggroThreshold = 5.5;
      }

      if (canDetectPlayer && distToPlayer < aggroThreshold) {
        m.state = 'chase';
      }

      if (m.state === 'chase' && canDetectPlayer) {
        const dirX = this.playerPos.x - mPos.x;
        const dirZ = this.playerPos.z - mPos.z;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const angle = Math.atan2(dirX, dirZ);
        m.mesh.rotation.y = angle;

        // Collision Separation: Strict minimum radius so monster NEVER sticks to player
        const minDist = m.type === 'boss_warden' ? 2.4 : 1.35;
        if (distToPlayer < minDist && len > 0.001) {
          // Push monster firmly away along outward vector
          const overlap = minDist - distToPlayer;
          mPos.x -= (dirX / len) * (overlap + 0.1);
          mPos.z -= (dirZ / len) * (overlap + 0.1);

          // Attack player on cooldown
          m.attackCooldown -= dt;
          if (m.attackCooldown <= 0) {
            m.attackCooldown = m.type === 'boss_warden' ? 1.8 : 1.2;
            this.damagePlayer(m.damage, mPos);
            soundEngine.playMonsterGrowl(1.5);
          }
        } else if (len > 0.001) {
          mPos.x += (dirX / len) * m.speed * dt;
          mPos.z += (dirZ / len) * m.speed * dt;
        }
      } else {
        // Simple ambient patrol sway
        mPos.x += Math.sin(time + idx) * 0.008;
      }

      // Monster-to-monster separation physics to prevent clumping
      for (let j = idx + 1; j < this.monsterEntities.length; j++) {
        const other = this.monsterEntities[j];
        if (other.isDead) continue;
        const sepDist = mPos.distanceTo(other.mesh.position);
        if (sepDist < 1.4 && sepDist > 0.001) {
          const sepPush = (1.4 - sepDist) * 0.5;
          const sx = (mPos.x - other.mesh.position.x) / sepDist;
          const sz = (mPos.z - other.mesh.position.z) / sepDist;
          mPos.x += sx * sepPush;
          mPos.z += sz * sepPush;
          other.mesh.position.x -= sx * sepPush;
          other.mesh.position.z -= sz * sepPush;
        }
      }
    }

    // Send target monster to HUD
    if (this.currentFloor === 5) {
      const boss = this.monsterEntities.find(m => m.type === 'boss_warden' && !m.isDead);
      if (boss) {
        this.callbacks.onTargetMonsterChange?.({
          name: boss.name,
          type: boss.type,
          health: boss.health,
          maxHealth: boss.maxHealth,
          isBoss: true,
        });
      } else {
        this.callbacks.onTargetMonsterChange?.(null);
      }
    } else if (crosshairTargetMonster) {
      this.callbacks.onTargetMonsterChange?.({
        name: crosshairTargetMonster.name,
        type: crosshairTargetMonster.type,
        health: crosshairTargetMonster.health,
        maxHealth: crosshairTargetMonster.maxHealth,
        isBoss: crosshairTargetMonster.type === 'boss_warden',
      });
    } else {
      this.callbacks.onTargetMonsterChange?.(null);
    }
  }

  private damagePlayer(amount: number, attackerPos?: THREE.Vector3) {
    this.health = Math.max(0, this.health - amount);
    soundEngine.playPlayerHurt();
    this.callbacks.onDamageFlash();
    this.callbacks.onHealthChange(this.health, this.maxHealth);

    // Apply knockback impulse away from monster to break collision stickiness
    if (attackerPos) {
      const dirX = this.playerPos.x - attackerPos.x;
      const dirZ = this.playerPos.z - attackerPos.z;
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
      if (len > 0.001) {
        const kbX = (dirX / len) * 0.6;
        const kbZ = (dirZ / len) * 0.6;
        if (!this.checkWallCollision(this.playerPos.x + kbX, this.playerPos.z + kbZ, 0.35)) {
          this.playerPos.x += kbX;
          this.playerPos.z += kbZ;
        }
      }
    }

    if (this.health <= 0) {
      this.callbacks.onGameOver('died');
    }
  }

  private updateParanormalEvents(dt: number) {
    this.paranormalTimer += dt;
    if (this.paranormalTimer >= this.nextParanormalInterval) {
      this.paranormalTimer = 0;
      this.nextParanormalInterval = 10 + Math.random() * 8;
      this.triggerRandomParanormalEvent();
    }

    for (const prop of this.paranormalProps) {
      if (prop.state !== 'animating') continue;
      prop.animTimer += dt;

      if (prop.type === 'chair') {
        const t = Math.min(1.0, prop.animTimer / 1.6);
        prop.mesh.position.x = prop.initialPos.x + Math.sin(t * Math.PI) * 1.4;
        prop.mesh.position.z = prop.initialPos.z - t * 1.8;
        if (t >= 1.0) prop.state = 'done';
      } else if (prop.type === 'tv') {
        const flicker = Math.sin(prop.animTimer * 25) > 0;
        if (prop.light) prop.light.intensity = flicker ? 2.5 : 0.8;
        if (prop.animTimer > 5.0) {
          if (prop.light) prop.light.intensity = 0;
          prop.state = 'done';
        }
      } else if (prop.type === 'rolling_object') {
        const t = Math.min(1.0, prop.animTimer / 2.5);
        prop.mesh.position.z = prop.initialPos.z + t * 4.5;
        if (t >= 1.0) prop.state = 'done';
      }
    }
  }

  private triggerRandomParanormalEvent() {
    const eventType = Math.floor(Math.random() * 8);
    switch (eventType) {
      case 0:
        soundEngine.playFootstepsBehind();
        break;
      case 1:
        soundEngine.playCeilingCrawl();
        break;
      case 2:
        soundEngine.playBreathingClose();
        break;
      case 3:
        soundEngine.playDoorCreakSlow();
        break;
      case 4:
        soundEngine.playHallwaySprint();
        break;
      case 5:
        soundEngine.playWallScratching();
        break;
      case 6:
        soundEngine.playChildLaugh();
        break;
      case 7: {
        const idleChairs = this.paranormalProps.filter(p => p.type === 'chair' && p.state === 'idle');
        if (idleChairs.length > 0) {
          const c = idleChairs[Math.floor(Math.random() * idleChairs.length)];
          c.state = 'animating';
          c.animTimer = 0;
          soundEngine.playChairScrape();
        } else {
          soundEngine.playChairScrape();
        }
        break;
      }
    }
  }

  private updateInteractionPrompt() {
    let prompt: string | null = null;

    // 1. Interactive World Objects
    for (const obj of this.interactiveObjects) {
      if (obj.interacted) continue;
      if (obj.position.distanceTo(this.playerPos) < 2.6) {
        prompt = obj.promptText;
        break;
      }
    }

    // 2. Item Pickups
    if (!prompt) {
      for (const item of this.itemEntities) {
        if (item.pickedUp) continue;
        if (item.mesh.position.distanceTo(this.playerPos) < 2.6) {
          prompt = `[E] Pick up ${item.name}`;
          break;
        }
      }
    }

    // 3. Staircase Door
    if (!prompt && this.stairsDoorMesh) {
      if (this.stairsDoorMesh.position.distanceTo(this.playerPos) < 3.0) {
        prompt = this.isStairsUnlocked
          ? (this.currentFloor < 5 ? '[E] Ascend to Next Floor' : '[E] Escape Blackridge Hotel (Victory!)')
          : '[LOCKED] Complete all floor tasks to unlock staircase';
      }
    }

    // 4. Hiding Spot prompt if nearby but not crouched
    if (!prompt && !this.isCrouched) {
      for (const spot of this.hidingSpots) {
        if (
          this.playerPos.x >= spot.bounds.minX - 0.4 &&
          this.playerPos.x <= spot.bounds.maxX + 0.4 &&
          this.playerPos.z >= spot.bounds.minZ - 0.4 &&
          this.playerPos.z <= spot.bounds.maxZ + 0.4
        ) {
          prompt = `[C] Crouch to Hide inside ${spot.name}`;
          break;
        }
      }
    }

    this.callbacks.onInteractPrompt(prompt);
  }

  public restartFloor() {
    this.health = 100;
    this.stamina = 100;
    this.flashlightBattery = Math.max(75, this.flashlightBattery);
    this.isFlashlightOn = true;
    if (this.flashlight) this.flashlight.visible = true;
    if (this.torchInnerGlow) this.torchInnerGlow.visible = true;
    this.callbacks.onFlashlightChange?.(this.isFlashlightOn, Math.round(this.flashlightBattery), this.maxFlashlightBattery);
    this.loadFloor(this.currentFloor);
  }

  public restartFullGame() {
    this.health = 100;
    this.stamina = 100;
    this.flashlightBattery = 100;
    this.isFlashlightOn = true;
    if (this.flashlight) this.flashlight.visible = true;
    if (this.torchInnerGlow) this.torchInnerGlow.visible = true;
    this.totalGameSeconds = 0;
    this.weapons = [
      { id: 'pipe', name: 'Lead Pipe', damage: 35, range: 2.8, ammo: 1, maxAmmo: 1, isRanged: false, cooldown: 500 },
    ];
    this.currentWeaponIndex = 0;
    this.inventory = [
      { id: 'medkit', type: 'medkit', name: 'Emergency Medkit', description: 'Restores +50 Health', count: 1 },
      { id: 'energy_drink', type: 'energy_drink', name: 'Stamina Surge Drink', description: 'Restores stamina & boosts speed for 15s', count: 1 },
      { id: 'battery', type: 'battery', name: 'Flashlight Battery', description: 'Heavy-Duty Cell. Restores Flashlight Battery +60% [B]', count: 1 },
    ];
    this.callbacks.onFlashlightChange?.(this.isFlashlightOn, 100, this.maxFlashlightBattery);
    this.callbacks.onInventoryChange(this.inventory);
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
