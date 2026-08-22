import * as THREE from 'three';
import { HidingSpotEntity, InteractiveWorldObject, WallBox } from './EntityTypes';
import { TextureGenerator } from './TextureGenerator';

export interface LevelBuildResult {
  walls: WallBox[];
  interactiveObjects: InteractiveWorldObject[];
  hidingSpots: HidingSpotEntity[];
  stairsDoorMesh: THREE.Group;
  stairsLight: THREE.PointLight;
}

export class RoomBuilder {
  public static buildFloor(
    scene: THREE.Scene,
    floor: number,
    onInteractiveTask: (taskId: string) => void
  ): LevelBuildResult {
    const walls: WallBox[] = [];
    const interactiveObjects: InteractiveWorldObject[] = [];
    const hidingSpots: HidingSpotEntity[] = [];

    const addWallBox = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      walls.push({ minX, maxX, minZ, maxZ });
    };

    // Textures per floor
    const wallTex = TextureGenerator.getWallpaper(floor);
    const floorTex = TextureGenerator.getFloorTexture(floor);
    const ceilTex = TextureGenerator.getCeilingTexture();

    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.1 });
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.45, metalness: 0.15 });
    const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95 });

    let corridorWidth = 7.4;
    let corridorLength = 56;
    const wallHeight = 4.2;
    const wallThickness = 0.4;

    if (floor === 2) {
      corridorWidth = 6.4;
      corridorLength = 54;
    } else if (floor === 3) {
      corridorWidth = 8.5;
      corridorLength = 58;
    } else if (floor === 4) {
      corridorWidth = 6.8;
      corridorLength = 54;
    } else if (floor === 5) {
      corridorWidth = 14.0;
      corridorLength = 36;
    }

    const halfW = corridorWidth / 2;

    // 1. Floor & Ceiling Planks
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth + 24, corridorLength + 16), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -corridorLength / 2 + 4);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth + 24, corridorLength + 16), ceilMat);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(0, wallHeight, -corridorLength / 2 + 4);
    ceilMesh.receiveShadow = true;
    scene.add(ceilMesh);

    // 2. Velvet Carpet Runner
    const carpetMat = new THREE.MeshStandardMaterial({
      color: floor === 1 ? 0x7c1d28 : (floor === 2 ? 0x661a22 : (floor === 3 ? 0x22362a : (floor === 4 ? 0x3d102c : 0x2a040b))),
      roughness: 0.8,
    });
    const carpetMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, corridorLength + 6), carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.015, -corridorLength / 2 + 4);
    carpetMesh.receiveShadow = true;
    scene.add(carpetMesh);

    // 3. Hallway Boundary Walls with Doorways
    for (let z = 6; z > -corridorLength; z -= 6) {
      // Left Wall segments
      const isDoorwayL = (floor === 1 && z <= -10 && z >= -14) || (floor === 2 && z <= -12 && z >= -16) || (floor === 3 && z <= -12 && z >= -16) || (floor === 4 && z <= -12 && z >= -16);
      if (!isDoorwayL) {
        const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 6), wallMat);
        wallLeft.position.set(-halfW, wallHeight / 2, z - 3);
        wallLeft.castShadow = true;
        wallLeft.receiveShadow = true;
        scene.add(wallLeft);
        addWallBox(-halfW - wallThickness / 2, -halfW + wallThickness / 2, z - 6, z);
      }

      // Right Wall segments
      const isDoorwayR = (floor === 1 && z <= -26 && z >= -30) || (floor === 2 && z <= -30 && z >= -34) || (floor === 3 && z <= -30 && z >= -34) || (floor === 4 && z <= -28 && z >= -32);
      if (!isDoorwayR) {
        const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 6), wallMat);
        wallRight.position.set(halfW, wallHeight / 2, z - 3);
        wallRight.castShadow = true;
        wallRight.receiveShadow = true;
        scene.add(wallRight);
        addWallBox(halfW - wallThickness / 2, halfW + wallThickness / 2, z - 6, z);
      }
    }

    // Back Wall (Entrance)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth + 4, wallHeight, wallThickness), wallMat);
    backWall.position.set(0, wallHeight / 2, 6);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    addWallBox(-corridorWidth / 2 - 2, corridorWidth / 2 + 2, 6 - wallThickness / 2, 6 + wallThickness / 2);

    // 4. Chandeliers & Wall Sconces with Dynamic Soft Shadows
    const chandelierSpacing = floor === 5 ? 12 : 10;
    const isDarkFloor = floor >= 4;
    for (let cz = 2.0; cz > -corridorLength; cz -= chandelierSpacing) {
      RoomBuilder.createChandelier(scene, 0, 3.1, cz, floor);
    }
    for (let sz = 3.5; sz > -corridorLength; sz -= 7) {
      RoomBuilder.createSconce(scene, -halfW + 0.15, 2.3, sz, Math.PI / 2, isDarkFloor ? 0.45 : 0.85, isDarkFloor ? 6.0 : 8.5);
      RoomBuilder.createSconce(scene, halfW - 0.15, 2.3, sz - 3.5, -Math.PI / 2, isDarkFloor ? 0.45 : 0.85, isDarkFloor ? 6.0 : 8.5);
    }

    // 4.1 Rich Hotel Hallway Architecture (Doors, Paintings, Moldings, Tables)
    if (floor < 5) {
      RoomBuilder.createHallwayDecorations(scene, floor, corridorLength, halfW);
    }

    // 5. Far End Staircase / Vault Exit Door
    const { stairsDoorMesh, stairsLight } = RoomBuilder.createStaircaseExit(scene, 0, -corridorLength + 2, floor, addWallBox);

    // 6. Distinct Room Designs, Interactive Tasks & Stealth Hiding Spots per Floor
    if (floor === 1) {
      // Reception Lobby Front Desk Hiding Spot (Under-Desk Counter)
      RoomBuilder.createUnderDeskCounter(scene, 1.8, 0, -6, 0, 'hide_fl1_desk', 'Reception Counter (Crouch to Hide)', hidingSpots, addWallBox);

      // Lobby Antique Wardrobe Closet Hiding Spot
      RoomBuilder.createWardrobeCloset(scene, -halfW + 0.8, 0, -20, 0, 'hide_fl1_wardrobe', 'Lobby Antique Wardrobe (Crouch to Hide)', hidingSpots, addWallBox);

      // Room 1 (Left, z = -12): Security Monitoring Command Station
      RoomBuilder.createSideRoom(scene, -halfW - 4.5, 0, -12, 8.5, 8.5, wallMat, floorMat, ceilMat, addWallBox);
      RoomBuilder.createDeskLamp(scene, -halfW - 5.5, 0.9, -12, 0x55ffaa, 1.2); // Creepy green monitor desk lamp
      RoomBuilder.createCRTMonitorBank(scene, -halfW - 8.0, 1.5, -12);
      RoomBuilder.createWardrobeCloset(scene, -halfW - 7.5, 0, -9, 0, 'hide_fl1_sec_wardrobe', 'Security Storage Closet (Crouch to Hide)', hidingSpots, addWallBox);

      // Room 2 (Right, z = -28): Lounge & Electrical Breaker Panel
      RoomBuilder.createSideRoom(scene, halfW + 4.5, 0, -28, 8.5, 8.5, wallMat, floorMat, ceilMat, addWallBox);
      RoomBuilder.createDeskLamp(scene, halfW + 4.0, 0.9, -28, 0xffbb66, 1.0); // Amber vintage lamp
      const breaker = RoomBuilder.createBreakerPanel(scene, halfW + 8.2, 1.6, -28, () => onInteractiveTask('breaker'));
      interactiveObjects.push(breaker);
    } else if (floor === 2) {
      // Corridor Metal Armory Locker Hiding Spot
      RoomBuilder.createMetalLockerHiding(scene, -halfW + 0.8, 0, -22, 0, 'hide_fl2_corridor_locker', 'Corridor Metal Locker (Crouch to Hide)', hidingSpots, addWallBox);

      // Room 202 (Left, z = -14): Detective's Suite & Armory Cache
      RoomBuilder.createSideRoom(scene, -halfW - 4.2, 0, -14, 8.0, 8.0, wallMat, floorMat, ceilMat, addWallBox);
      RoomBuilder.createFourPosterBed(scene, -halfW - 5.5, 0, -16);
      RoomBuilder.createUnderBedHiding(scene, -halfW - 5.5, 0, -16, 'hide_fl2_bed', 'Under Suite Bed (Crouch to Hide)', hidingSpots);
      RoomBuilder.createDeskLamp(scene, -halfW - 6.8, 0.9, -12, 0xffaa44, 1.1); // Creepy amber lamp
      RoomBuilder.createMetalLockerHiding(scene, -halfW - 7.2, 0, -12, 0, 'hide_fl2_suite_locker', 'Armory Locker (Crouch to Hide)', hidingSpots, addWallBox);

      // Room 204 (Right, z = -32): Decaying Master Bath & Firewall Switch
      RoomBuilder.createSideRoom(scene, halfW + 4.2, 0, -32, 8.0, 8.0, wallMat, floorMat, ceilMat, addWallBox);
      RoomBuilder.createClawfootTub(scene, halfW + 6.0, 0, -34);
      RoomBuilder.createDeskLamp(scene, halfW + 3.8, 0.9, -30, 0xee5533, 1.0); // Ominous red lamp
      const firewall = RoomBuilder.createFirewallConsole(scene, halfW + 7.8, 1.5, -32, () => onInteractiveTask('firewall'));
      interactiveObjects.push(firewall);
    } else if (floor === 3) {
      // Corridor Gothic Wardrobe Hiding Spot
      RoomBuilder.createWardrobeCloset(scene, halfW - 0.8, 0, -20, Math.PI, 'hide_fl3_hall_wardrobe', 'Gothic Hallway Wardrobe (Crouch to Hide)', hidingSpots, addWallBox);

      // Left (z = -14): Grand Ballroom Stage & Piano
      RoomBuilder.createSideRoom(scene, -halfW - 5.5, 0, -14, 10.5, 10.5, wallMat, floorMat, ceilMat, addWallBox);
      const piano = RoomBuilder.createGrandPiano(scene, -halfW - 6.0, 0, -14, () => onInteractiveTask('piano'));
      interactiveObjects.push(piano);
      RoomBuilder.createUnderPianoHiding(scene, -halfW - 6.0, 0, -14, 'hide_fl3_piano', 'Under Grand Piano (Crouch to Hide)', hidingSpots);
      RoomBuilder.createDeskLamp(scene, -halfW - 4.2, 0.9, -17, 0x77dd88, 1.1);

      // Right (z = -32): Gothic Archive Library
      RoomBuilder.createSideRoom(scene, halfW + 5.5, 0, -32, 10.5, 10.5, wallMat, floorMat, ceilMat, addWallBox);
      RoomBuilder.createBookshelfRow(scene, halfW + 6.0, 0, -30);
      RoomBuilder.createBookshelfRow(scene, halfW + 6.0, 0, -34);
      RoomBuilder.createDeskLamp(scene, halfW + 4.0, 0.9, -32, 0x44ffaa, 1.2); // Green banker lamp
      RoomBuilder.createWardrobeCloset(scene, halfW + 9.5, 0, -32, -Math.PI / 2, 'hide_fl3_lib_wardrobe', 'Archive Double Wardrobe (Crouch to Hide)', hidingSpots, addWallBox);
    } else if (floor === 4) {
      // Corridor Bio-Lock Partition Hiding Spot
      RoomBuilder.createMetalLockerHiding(scene, -halfW + 0.8, 0, -20, 0, 'hide_fl4_corridor_locker', 'Containment Steel Locker (Crouch to Hide)', hidingSpots, addWallBox);

      // Left (z = -14): Occult Containment Ward
      RoomBuilder.createSideRoom(scene, -halfW - 4.5, 0, -14, 8.5, 8.5, wallMat, floorMat, ceilMat, addWallBox);
      RoomBuilder.createContainmentCylinders(scene, -halfW - 6.0, 0, -14);
      RoomBuilder.createUnderGurneyHiding(scene, -halfW - 3.5, 0, -12, 'hide_fl4_gurney', 'Under Autopsy Gurney (Crouch to Hide)', hidingSpots);
      RoomBuilder.createDeskLamp(scene, -halfW - 4.0, 0.9, -12, 0x9922ff, 1.3); // Eerie violet occult lamp

      // Right (z = -30): Alchemy Ritual Chamber with Blood Altar
      RoomBuilder.createSideRoom(scene, halfW + 4.5, 0, -30, 8.5, 8.5, wallMat, floorMat, ceilMat, addWallBox);
      const altar = RoomBuilder.createBloodAltar(scene, halfW + 5.0, 0, -30, 'altar_1', () => onInteractiveTask('altar'));
      interactiveObjects.push(altar);
      RoomBuilder.createDeskLamp(scene, halfW + 7.5, 0.9, -30, 0xff0044, 1.4); // Blood red altar lamp
    } else if (floor === 5) {
      // Obsidian Sanctuary Dais & Obelisks
      RoomBuilder.createSanctuaryArena(scene, corridorWidth, corridorLength);
    }

    return { walls, interactiveObjects, hidingSpots, stairsDoorMesh, stairsLight };
  }

  // --- HIDING SPOTS BUILDERS ---
  public static createWardrobeCloset(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    rotY: number,
    id: string,
    name: string,
    hidingSpots: HidingSpotEntity[],
    addWallBox: (minX: number, maxX: number, minZ: number, maxZ: number) => void
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2b1810, roughness: 0.7 });
    const interiorMat = new THREE.MeshStandardMaterial({ color: 0x140a06, roughness: 0.9 });

    // Back & Side walls
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.08), woodMat);
    back.position.set(0, 1.4, -0.45);
    back.castShadow = true;
    back.receiveShadow = true;

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 1.0), woodMat);
    sideL.position.set(-0.66, 1.4, 0);
    sideL.castShadow = true;
    sideL.receiveShadow = true;

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 1.0), woodMat);
    sideR.position.set(0.66, 1.4, 0);
    sideR.castShadow = true;
    sideR.receiveShadow = true;

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.0), woodMat);
    top.position.set(0, 2.85, 0);
    top.castShadow = true;

    // Half-open Louver Doors (allows player to slip in while crouched)
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.7, 0.06), woodMat);
    doorL.position.set(-0.55, 1.38, 0.52);
    doorL.rotation.y = 0.8;
    doorL.castShadow = true;

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.7, 0.06), woodMat);
    doorR.position.set(0.55, 1.38, 0.52);
    doorR.rotation.y = -0.75;
    doorR.castShadow = true;

    // Interior floor
    const iFloor = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), interiorMat);
    iFloor.rotation.x = -Math.PI / 2;
    iFloor.position.set(0, 0.02, 0);
    iFloor.receiveShadow = true;

    // Subtle stealth aura indicator
    const stealthRing = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    stealthRing.rotation.x = -Math.PI / 2;
    stealthRing.position.set(0, 0.03, 0);

    group.add(back, sideL, sideR, top, doorL, doorR, iFloor, stealthRing);
    scene.add(group);

    addWallBox(x - 0.7, x + 0.7, z - 0.5, z - 0.35);

    hidingSpots.push({
      id,
      name,
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      type: 'wardrobe_closet',
      bounds: { minX: x - 0.75, maxX: x + 0.75, minZ: z - 0.65, maxZ: z + 0.65 },
    });
  }

  public static createMetalLockerHiding(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    rotY: number,
    id: string,
    name: string,
    hidingSpots: HidingSpotEntity[],
    addWallBox: (minX: number, maxX: number, minZ: number, maxZ: number) => void
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x272c32, metalness: 0.85, roughness: 0.35 });

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 0.06), metalMat);
    back.position.set(0, 1.3, -0.4);
    back.castShadow = true;

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.9), metalMat);
    sideL.position.set(-0.52, 1.3, 0);
    sideL.castShadow = true;

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.9), metalMat);
    sideR.position.set(0.52, 1.3, 0);
    sideR.castShadow = true;

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.5, 0.04), metalMat);
    door.position.set(-0.4, 1.3, 0.46);
    door.rotation.y = 0.85;
    door.castShadow = true;

    const stealthRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.45, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    stealthRing.rotation.x = -Math.PI / 2;
    stealthRing.position.set(0, 0.03, 0);

    group.add(back, sideL, sideR, door, stealthRing);
    scene.add(group);

    addWallBox(x - 0.55, x + 0.55, z - 0.45, z - 0.35);

    hidingSpots.push({
      id,
      name,
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      type: 'wardrobe_closet',
      bounds: { minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.55, maxZ: z + 0.55 },
    });
  }

  public static createUnderDeskCounter(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    rotY: number,
    id: string,
    name: string,
    hidingSpots: HidingSpotEntity[],
    addWallBox: (minX: number, maxX: number, minZ: number, maxZ: number) => void
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x341d14, roughness: 0.6 });

    // Counter Top
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), woodMat);
    top.position.set(0, 1.1, 0);
    top.castShadow = true;
    top.receiveShadow = true;

    // Front Panel (facing lobby)
    const front = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.08), woodMat);
    front.position.set(0, 0.55, 0.56);
    front.castShadow = true;
    front.receiveShadow = true;

    // Side Panels
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.2), woodMat);
    sideL.position.set(-1.16, 0.55, 0);
    sideL.castShadow = true;
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.2), woodMat);
    sideR.position.set(1.16, 0.55, 0);
    sideR.castShadow = true;

    // Stealth Ring underneath
    const stealthRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.65, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    stealthRing.rotation.x = -Math.PI / 2;
    stealthRing.position.set(0, 0.02, -0.1);

    group.add(top, front, sideL, sideR, stealthRing);
    scene.add(group);

    addWallBox(x - 1.2, x + 1.2, z + 0.45, z + 0.65);

    hidingSpots.push({
      id,
      name,
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      type: 'under_desk',
      bounds: { minX: x - 1.1, maxX: x + 1.1, minZ: z - 0.7, maxZ: z + 0.4 },
    });
  }

  public static createUnderBedHiding(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    id: string,
    name: string,
    hidingSpots: HidingSpotEntity[]
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stealthRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    stealthRing.rotation.x = -Math.PI / 2;
    stealthRing.position.set(0, 0.02, 0);
    group.add(stealthRing);
    scene.add(group);

    hidingSpots.push({
      id,
      name,
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      type: 'under_bed',
      bounds: { minX: x - 1.1, maxX: x + 1.1, minZ: z - 1.3, maxZ: z + 1.3 },
    });
  }

  public static createUnderPianoHiding(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    id: string,
    name: string,
    hidingSpots: HidingSpotEntity[]
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stealthRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    stealthRing.rotation.x = -Math.PI / 2;
    stealthRing.position.set(0, 0.02, 0);
    group.add(stealthRing);
    scene.add(group);

    hidingSpots.push({
      id,
      name,
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      type: 'behind_partition',
      bounds: { minX: x - 0.9, maxX: x + 0.9, minZ: z - 1.1, maxZ: z + 1.1 },
    });
  }

  public static createUnderGurneyHiding(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    id: string,
    name: string,
    hidingSpots: HidingSpotEntity[]
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.9, roughness: 0.2 });

    // Stretcher table top
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 2.2), steelMat);
    table.position.y = 0.9;
    table.castShadow = true;
    table.receiveShadow = true;

    // Legs
    for (const lx of [-0.48, 0.48]) {
      for (const lz of [-0.95, 0.95]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), steelMat);
        leg.position.set(lx, 0.45, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    const stealthRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.65, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    stealthRing.rotation.x = -Math.PI / 2;
    stealthRing.position.set(0, 0.02, 0);

    group.add(table, stealthRing);
    scene.add(group);

    hidingSpots.push({
      id,
      name,
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      type: 'under_gurney',
      bounds: { minX: x - 0.6, maxX: x + 0.6, minZ: z - 1.1, maxZ: z + 1.1 },
    });
  }

  // --- LIGHTING & PROPS ---
  public static createDeskLamp(scene: THREE.Scene, x: number, y: number, z: number, colorHex: number, intensity = 1.0) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, y, z);

    // Brass base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 12), baseMat);
    base.castShadow = true;
    lampGroup.add(base);

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), baseMat);
    stem.position.y = 0.18;
    stem.castShadow = true;
    lampGroup.add(stem);

    // Shade
    const shadeMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 12, 1, true), shadeMat);
    shade.position.y = 0.36;
    shade.castShadow = true;
    lampGroup.add(shade);

    // Point Light for atmospheric illumination
    const light = new THREE.PointLight(colorHex, intensity, 7.5, 1.6);
    light.position.y = 0.32;
    lampGroup.add(light);

    scene.add(lampGroup);
  }

  public static createBreakerPanel(scene: THREE.Scene, x: number, y: number, z: number, onInteract: () => void): InteractiveWorldObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Metal box
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x333b42, metalness: 0.8, roughness: 0.4 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.15), boxMat);
    box.castShadow = true;
    group.add(box);

    // Red lever
    const leverMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3 });
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), leverMat);
    lever.position.set(0, 0, 0.1);
    lever.rotation.z = -0.6;
    lever.castShadow = true;
    group.add(lever);

    // Indicator Light
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    indicator.position.set(0.18, 0.25, 0.08);
    group.add(indicator);

    // Glowing task marker beacon
    const beacon = new THREE.PointLight(0xffaa22, 0.8, 2.5);
    beacon.position.set(0, -0.4, 0.2);
    group.add(beacon);

    scene.add(group);

    return {
      id: 'breaker_panel',
      type: 'breaker',
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      interacted: false,
      promptText: '[E] Pull Electrical Breaker Switch',
      onInteract: () => {
        lever.rotation.z = 0.6;
        indicator.material = new THREE.MeshBasicMaterial({ color: 0x22ff44 });
        beacon.color.setHex(0x22ff44);
        onInteract();
      },
    };
  }

  public static createFirewallConsole(scene: THREE.Scene, x: number, y: number, z: number, onInteract: () => void): InteractiveWorldObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, metalness: 0.9, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.12), consoleMat);
    body.castShadow = true;
    group.add(body);

    const screenMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), screenMat);
    screen.position.set(0, 0.15, 0.065);
    group.add(screen);

    const beacon = new THREE.PointLight(0xff3322, 0.9, 3.0);
    beacon.position.set(0, 0, 0.2);
    group.add(beacon);

    scene.add(group);

    return {
      id: 'firewall_console',
      type: 'firewall',
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      interacted: false,
      promptText: '[E] Disarm Magnetic Firewall Terminal',
      onInteract: () => {
        screen.material = new THREE.MeshBasicMaterial({ color: 0x00ffee });
        beacon.color.setHex(0x00ffee);
        onInteract();
      },
    };
  }

  public static createGrandPiano(scene: THREE.Scene, x: number, y: number, z: number, onInteract: () => void): InteractiveWorldObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Polished Black Lacquer Piano Body
    const pianoMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0d, roughness: 0.15, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.2), pianoMat);
    body.position.y = 0.75;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Keyboard keys
    const keys = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, emissive: 0x224433, emissiveIntensity: 0.3 })
    );
    keys.position.set(0, 0.75, 1.15);
    keys.castShadow = true;
    group.add(keys);

    const beacon = new THREE.PointLight(0x77dd88, 1.0, 3.5);
    beacon.position.set(0, 1.2, 1.15);
    group.add(beacon);

    scene.add(group);

    return {
      id: 'grand_piano',
      type: 'piano',
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      interacted: false,
      promptText: '[E] Play Grand Piano Chord',
      onInteract: () => {
        beacon.color.setHex(0x00ffee);
        onInteract();
      },
    };
  }

  public static createBloodAltar(scene: THREE.Scene, x: number, y: number, z: number, id: string, onInteract: () => void): InteractiveWorldObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1f161a, roughness: 0.9 });
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.9, 12), stoneMat);
    altar.position.y = 0.45;
    altar.castShadow = true;
    altar.receiveShadow = true;
    group.add(altar);

    const runeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const rune = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 16), runeMat);
    rune.rotation.x = Math.PI / 2;
    rune.position.y = 0.92;
    group.add(rune);

    const light = new THREE.PointLight(0xff0022, 1.4, 4.5);
    light.position.y = 1.1;
    group.add(light);

    scene.add(group);

    return {
      id,
      type: 'altar',
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      interacted: false,
      promptText: '[E] Cleanse Blood Altar',
      onInteract: () => {
        rune.material = new THREE.MeshBasicMaterial({ color: 0x44ddff });
        light.color.setHex(0x44ddff);
        onInteract();
      },
    };
  }

  public static createCRTMonitorBank(scene: THREE.Scene, x: number, y: number, z: number) {
    const bankGroup = new THREE.Group();
    bankGroup.position.set(x, y, z);

    const casingMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.6 });
    const crtMat = new THREE.MeshBasicMaterial({ color: 0x55aa88 });

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const mon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.35), casingMat);
        mon.position.set((c - 1) * 0.55, (r - 0.5) * 0.48, 0);
        mon.castShadow = true;
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), crtMat);
        screen.position.set((c - 1) * 0.55, (r - 0.5) * 0.48, 0.18);
        bankGroup.add(mon, screen);
      }
    }

    const glow = new THREE.PointLight(0x44ddaa, 1.4, 6);
    glow.position.set(0, 0, 0.6);
    bankGroup.add(glow);

    scene.add(bankGroup);
  }

  public static createFourPosterBed(scene: THREE.Scene, x: number, y: number, z: number) {
    const bed = new THREE.Group();
    bed.position.set(x, y, z);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x24140d, roughness: 0.7 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x55111b, roughness: 0.8 });

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 2.4), sheetMat);
    mattress.position.y = 0.4;
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    bed.add(mattress);

    for (const px of [-1.0, 1.0]) {
      for (const pz of [-1.2, 1.2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), woodMat);
        post.position.set(px, 1.1, pz);
        post.castShadow = true;
        bed.add(post);
      }
    }
    scene.add(bed);
  }

  public static createClawfootTub(scene: THREE.Scene, x: number, y: number, z: number) {
    const tub = new THREE.Group();
    tub.position.set(x, y, z);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, metalness: 0.8, roughness: 0.3 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x55000a, roughness: 0.1 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.8), ironMat);
    body.position.y = 0.35;
    body.castShadow = true;
    body.receiveShadow = true;
    const fluid = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.6), bloodMat);
    fluid.rotation.x = -Math.PI / 2;
    fluid.position.y = 0.5;
    tub.add(body, fluid);
    scene.add(tub);
  }

  public static createBookshelfRow(scene: THREE.Scene, x: number, y: number, z: number) {
    const shelf = new THREE.Group();
    shelf.position.set(x, y, z);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x22130c, roughness: 0.7 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 3.0), woodMat);
    frame.position.y = 1.6;
    frame.castShadow = true;
    frame.receiveShadow = true;
    shelf.add(frame);
    scene.add(shelf);
  }

  public static createContainmentCylinders(scene: THREE.Scene, x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x225544, transparent: true, opacity: 0.5, roughness: 0.1 });
    for (let i = 0; i < 3; i++) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.2, 12), glassMat);
      cyl.position.set((i - 1) * 1.4, 1.1, 0);
      cyl.castShadow = true;
      const light = new THREE.PointLight(0x22ff88, 0.8, 4);
      light.position.set((i - 1) * 1.4, 1.1, 0);
      group.add(cyl, light);
    }
    scene.add(group);
  }

  public static createSanctuaryArena(scene: THREE.Scene, w: number, l: number) {
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x0a0508, roughness: 0.3, metalness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rad = 7.0;
      const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), obsidianMat);
      obelisk.position.set(Math.cos(angle) * rad, 2.0, -18 + Math.sin(angle) * rad);
      obelisk.castShadow = true;
      obelisk.receiveShadow = true;
      scene.add(obelisk);
    }
  }

  public static createSideRoom(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    w: number,
    l: number,
    wallMat: THREE.Material,
    floorMat: THREE.Material,
    ceilMat: THREE.Material,
    addWallBox: (minX: number, maxX: number, minZ: number, maxZ: number) => void
  ) {
    const halfW = w / 2;
    const halfL = l / 2;
    const wallH = 4.2;
    const wallThick = 0.4;

    // Room Floor & Ceiling
    const rFloor = new THREE.Mesh(new THREE.PlaneGeometry(w, l), floorMat);
    rFloor.rotation.x = -Math.PI / 2;
    rFloor.position.set(x, y + 0.005, z);
    rFloor.receiveShadow = true;
    scene.add(rFloor);

    const rCeil = new THREE.Mesh(new THREE.PlaneGeometry(w, l), ceilMat);
    rCeil.rotation.x = Math.PI / 2;
    rCeil.position.set(x, y + wallH, z);
    rCeil.receiveShadow = true;
    scene.add(rCeil);

    // Left Wall
    const wLeft = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, l), wallMat);
    wLeft.position.set(x - halfW, y + wallH / 2, z);
    wLeft.castShadow = true;
    wLeft.receiveShadow = true;
    scene.add(wLeft);
    addWallBox(x - halfW - wallThick / 2, x - halfW + wallThick / 2, z - halfL, z + halfL);

    // Right Wall
    const wRight = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, l), wallMat);
    wRight.position.set(x + halfW, y + wallH / 2, z);
    wRight.castShadow = true;
    wRight.receiveShadow = true;
    scene.add(wRight);
    addWallBox(x + halfW - wallThick / 2, x + halfW + wallThick / 2, z - halfL, z + halfL);

    // Back Wall
    const wBack = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallThick), wallMat);
    wBack.position.set(x, y + wallH / 2, z - halfL);
    wBack.castShadow = true;
    wBack.receiveShadow = true;
    scene.add(wBack);
    addWallBox(x - halfW, x + halfW, z - halfL - wallThick / 2, z - halfL + wallThick / 2);
  }

  public static createChandelier(scene: THREE.Scene, x: number, y: number, z: number, floor: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xcaa048, metalness: 0.85, roughness: 0.25 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 16), brassMat);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    group.add(ring);

    const isDark = floor >= 4;
    const light = new THREE.PointLight(isDark ? 0xdd5544 : 0xfff0d0, isDark ? 0.6 : 1.3, isDark ? 10 : 16, 1.5);
    group.add(light);

    scene.add(group);
  }

  public static createSconce(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    rotY: number,
    intensity = 0.8,
    dist = 8.5
  ) {
    const sconce = new THREE.Group();
    sconce.position.set(x, y, z);
    sconce.rotation.y = rotY;

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xcaa048, metalness: 0.9, roughness: 0.2 });
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), brassMat);
    mount.castShadow = true;
    sconce.add(mount);

    const light = new THREE.PointLight(0xffe6b0, intensity, dist, 1.8);
    light.position.set(0, 0, 0.15);
    sconce.add(light);

    scene.add(sconce);
  }

  public static createStaircaseExit(
    scene: THREE.Scene,
    x: number,
    z: number,
    floor: number,
    addWallBox: (minX: number, maxX: number, minZ: number, maxZ: number) => void
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.7 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), frameMat);
    frame.position.y = 1.6;
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.6 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.1), doorMat);
    door.position.y = 1.5;
    door.castShadow = true;
    door.receiveShadow = true;
    group.add(door);

    // Indicator Light
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bulbMat);
    bulb.name = 'stairs_bulb';
    bulb.position.set(0, 3.0, 0.2);
    group.add(bulb);

    const stairsLight = new THREE.PointLight(0xff1122, 1.5, 6.0);
    stairsLight.position.set(0, 3.0, 0.3);
    group.add(stairsLight);

    scene.add(group);
    addWallBox(x - 1.2, x + 1.2, z - 0.2, z + 0.2);

    return { stairsDoorMesh: group, stairsLight };
  }

  public static createHallwayDecorations(
    scene: THREE.Scene,
    floor: number,
    corridorLength: number,
    halfW: number
  ) {
    const woodTrimMat = new THREE.MeshStandardMaterial({ color: 0x24150e, roughness: 0.6 });

    // 1. Crown Moldings & Baseboard Trims along the full hallway length
    const trimGeom = new THREE.BoxGeometry(0.12, 0.16, corridorLength + 8);
    const leftBase = new THREE.Mesh(trimGeom, woodTrimMat);
    leftBase.position.set(-halfW + 0.06, 0.08, -corridorLength / 2 + 4);
    const rightBase = new THREE.Mesh(trimGeom, woodTrimMat);
    rightBase.position.set(halfW - 0.06, 0.08, -corridorLength / 2 + 4);
    const leftCrown = new THREE.Mesh(trimGeom, woodTrimMat);
    leftCrown.position.set(-halfW + 0.06, 4.12, -corridorLength / 2 + 4);
    const rightCrown = new THREE.Mesh(trimGeom, woodTrimMat);
    rightCrown.position.set(halfW - 0.06, 4.12, -corridorLength / 2 + 4);
    scene.add(leftBase, rightBase, leftCrown, rightCrown);

    // 2. Hotel Room Doors with Brass Number Plates along the hallway
    const roomPrefix = floor * 100;
    const doorSpots = [
      { side: -1, z: -4, num: `${roomPrefix + 1}` },
      { side: 1, z: -6, num: `${roomPrefix + 2}` },
      { side: -1, z: -20, num: `${roomPrefix + 3}` },
      { side: 1, z: -22, num: `${roomPrefix + 4}` },
      { side: -1, z: -36, num: `${roomPrefix + 5}` },
      { side: 1, z: -38, num: `${roomPrefix + 6}` },
      { side: -1, z: -46, num: `${roomPrefix + 7}` },
      { side: 1, z: -48, num: `${roomPrefix + 8}` },
    ];

    doorSpots.forEach((d) => {
      // Don't place decorative door over doorway openings
      const isOverDoorwayL = (floor === 1 && d.z <= -10 && d.z >= -14) || (floor >= 2 && d.z <= -12 && d.z >= -16);
      const isOverDoorwayR = (floor === 1 && d.z <= -26 && d.z >= -30) || (floor >= 2 && d.z <= -30 && d.z >= -34);
      if ((d.side === -1 && isOverDoorwayL) || (d.side === 1 && isOverDoorwayR)) return;

      const doorTex = TextureGenerator.getDoorTexture(d.num);
      const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.6 });
      const doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8), doorMat);
      doorMesh.position.set(d.side * (halfW - 0.02), 1.4, d.z);
      doorMesh.rotation.y = d.side === -1 ? Math.PI / 2 : -Math.PI / 2;
      doorMesh.receiveShadow = true;

      // Wooden door frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f110a, roughness: 0.7 });
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.55), frameMat);
      frameTop.position.set(d.side * (halfW - 0.05), 2.84, d.z);
      const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.08), frameMat);
      frameLeft.position.set(d.side * (halfW - 0.05), 1.4, d.z - 0.72);
      const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.08), frameMat);
      frameRight.position.set(d.side * (halfW - 0.05), 1.4, d.z + 0.72);

      scene.add(doorMesh, frameTop, frameLeft, frameRight);
    });

    // 3. Ornate Victorian Framed Paintings
    const paintingSpots = [
      { side: -1, z: -8, pid: 0 },
      { side: 1, z: -12, pid: 1 },
      { side: -1, z: -24, pid: 2 },
      { side: 1, z: -16, pid: 0 },
      { side: -1, z: -40, pid: 1 },
      { side: 1, z: -42, pid: 2 },
      { side: -1, z: -50, pid: 0 },
      { side: 1, z: -52, pid: 1 },
    ];

    paintingSpots.forEach((p) => {
      const pTex = TextureGenerator.getPaintingTexture(p.pid + floor * 2);
      const pMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.5 });
      const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), pMat);
      pMesh.position.set(p.side * (halfW - 0.03), 2.2, p.z);
      pMesh.rotation.y = p.side === -1 ? Math.PI / 2 : -Math.PI / 2;
      pMesh.receiveShadow = true;

      // Outer Gold Gilded Bevel Frame
      const goldFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.48, 1.18),
        new THREE.MeshStandardMaterial({ color: 0x9e782f, metalness: 0.75, roughness: 0.3 })
      );
      goldFrame.position.set(p.side * (halfW - 0.04), 2.2, p.z);
      goldFrame.castShadow = true;

      scene.add(pMesh, goldFrame);
    });

    // 4. Antique Hallway Consoles & Side Tables with Rotary Telephones
    const tableSpots = [
      { side: 1, z: -14 },
      { side: -1, z: -32 },
    ];

    tableSpots.forEach((t) => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(t.side * (halfW - 0.5), 0, t.z);
      tableGroup.rotation.y = t.side === 1 ? -Math.PI / 2 : Math.PI / 2;

      // Table top & legs
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.2), woodTrimMat);
      top.position.y = 0.85;
      top.castShadow = true;
      tableGroup.add(top);

      for (const lx of [-0.25, 0.25]) {
        for (const lz of [-0.5, 0.5]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.85, 8), woodTrimMat);
          leg.position.set(lx, 0.425, lz);
          leg.castShadow = true;
          tableGroup.add(leg);
        }
      }

      // Vintage Rotary Telephone
      const phoneMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 });
      const phoneBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.24), phoneMat);
      phoneBase.position.set(0, 0.93, 0);
      phoneBase.castShadow = true;

      const handset = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), phoneMat);
      handset.rotation.z = Math.PI / 2;
      handset.position.set(0, 0.99, 0);
      handset.castShadow = true;

      tableGroup.add(phoneBase, handset);
      scene.add(tableGroup);
    });

    // 5. Grandfather Clock
    const clockGroup = new THREE.Group();
    clockGroup.position.set(-halfW + 0.45, 0, -2);
    clockGroup.rotation.y = Math.PI / 2;

    const clockBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, 0.45), woodTrimMat);
    clockBody.position.y = 1.6;
    clockBody.castShadow = true;
    clockBody.receiveShadow = true;

    const clockFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xfffdd0, roughness: 0.4 })
    );
    clockFace.position.set(0, 2.4, 0.23);

    const brassPendulum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: 0xcaa048, metalness: 0.9, roughness: 0.2 })
    );
    brassPendulum.position.set(0, 1.2, 0.15);

    clockGroup.add(clockBody, clockFace, brassPendulum);
    scene.add(clockGroup);
  }
}
