import * as THREE from 'three';
import { MonsterEntity } from './EntityTypes';

export class MonsterBuilder {
  public static createMonster(
    id: string,
    type: 'crawler' | 'stalker' | 'brute' | 'phantom' | 'boss_warden',
    name: string,
    x: number,
    y: number,
    z: number,
    state: 'idle' | 'patrol' | 'chase' | 'attack' | 'ceiling_crawl' | 'flee' | 'dead' = 'patrol'
  ): MonsterEntity {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.name = `monster_${id}`;

    let eyeLight: THREE.PointLight | undefined;
    let maxHp = 80;
    let speed = 2.4;
    let damage = 20;

    let animLegs: THREE.Mesh[] | undefined;
    let animArms: THREE.Mesh[] | undefined;
    let animMandibles: THREE.Mesh[] | undefined;
    let animTendrils: THREE.Mesh[] | undefined;
    let animHead: THREE.Mesh | THREE.Group | undefined;

    // Materials
    const fleshMat = new THREE.MeshStandardMaterial({
      color: 0x1f1418,
      roughness: 0.85,
      metalness: 0.1,
    });
    const chitinMat = new THREE.MeshStandardMaterial({
      color: 0x151214,
      roughness: 0.4,
      metalness: 0.6,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });

    if (type === 'crawler') {
      maxHp = 60;
      speed = 3.6;
      damage = 18;

      // Flattened spider/arachnid torso
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), chitinMat);
      body.scale.set(1.2, 0.5, 1.4);
      body.position.y = 0.3;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Head & Mandibles
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), chitinMat);
      head.position.set(0, 0.28, 0.42);
      head.castShadow = true;
      head.receiveShadow = true;
      group.add(head);

      const mandL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), chitinMat);
      mandL.rotation.x = Math.PI / 2;
      mandL.position.set(-0.1, 0.24, 0.6);
      mandL.castShadow = true;
      const mandR = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), chitinMat);
      mandR.rotation.x = Math.PI / 2;
      mandR.position.set(0.1, 0.24, 0.6);
      mandR.castShadow = true;
      group.add(mandL, mandR);
      animMandibles = [mandL, mandR];

      // Red cluster eyes
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), eyeMat);
      eyeL.position.set(-0.07, 0.32, 0.54);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), eyeMat);
      eyeR.position.set(0.07, 0.32, 0.54);
      group.add(eyeL, eyeR);

      eyeLight = new THREE.PointLight(0xff0022, 0.8, 4);
      eyeLight.position.set(0, 0.35, 0.55);
      group.add(eyeLight);

      // 6 articulated jointed legs
      animLegs = [];
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const zOff = (Math.floor(i / 2) - 1) * 0.25;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.6, 6), chitinMat);
        leg.position.set(side * 0.38, 0.22, zOff);
        leg.rotation.z = side * (Math.PI / 3.5);
        leg.castShadow = true;
        group.add(leg);
        animLegs.push(leg);
      }
    } else if (type === 'stalker') {
      maxHp = 100;
      speed = 4.2;
      damage = 25;

      // Elongated slender nightmare humanoid
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.0, 8), fleshMat);
      torso.position.y = 1.3;
      torso.castShadow = true;
      torso.receiveShadow = true;
      group.add(torso);

      // Gaunt head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), fleshMat);
      head.position.set(0, 1.95, 0);
      head.scale.set(0.9, 1.3, 0.9);
      head.castShadow = true;
      head.receiveShadow = true;
      group.add(head);
      animHead = head;

      // Glowing crimson eyes
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
      eye.position.set(0, 2.0, 0.15);
      group.add(eye);

      eyeLight = new THREE.PointLight(0xff1133, 1.2, 5.5);
      eyeLight.position.set(0, 2.0, 0.2);
      group.add(eyeLight);

      // Long predatory arms
      animArms = [];
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 1.1, 6), fleshMat);
      armL.position.set(-0.32, 1.25, 0.1);
      armL.rotation.x = -Math.PI / 6;
      armL.castShadow = true;
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 1.1, 6), fleshMat);
      armR.position.set(0.32, 1.25, 0.1);
      armR.rotation.x = -Math.PI / 6;
      armR.castShadow = true;
      group.add(armL, armR);
      animArms.push(armL, armR);

      // Tendrils
      animTendrils = [];
      for (let t = 0; t < 4; t++) {
        const tendril = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.7, 4), fleshMat);
        tendril.position.set((t - 1.5) * 0.15, 1.5, -0.2);
        tendril.rotation.x = Math.PI / 3;
        tendril.castShadow = true;
        group.add(tendril);
        animTendrils.push(tendril);
      }
    } else if (type === 'brute') {
      maxHp = 180;
      speed = 2.0;
      damage = 38;

      // Massive armored hulking body
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.65), chitinMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      torso.receiveShadow = true;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.4), chitinMat);
      head.position.set(0, 1.95, 0.2);
      head.castShadow = true;
      head.receiveShadow = true;
      group.add(head);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
      eye.position.set(0, 1.98, 0.42);
      group.add(eye);

      eyeLight = new THREE.PointLight(0xff2200, 1.4, 6);
      eyeLight.position.set(0, 2.0, 0.45);
      group.add(eyeLight);

      // Heavy club arms
      animArms = [];
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), chitinMat);
      armL.position.set(-0.58, 1.2, 0);
      armL.castShadow = true;
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), chitinMat);
      armR.position.set(0.58, 1.2, 0);
      armR.castShadow = true;
      group.add(armL, armR);
      animArms.push(armL, armR);
    } else if (type === 'phantom') {
      maxHp = 110;
      speed = 3.4;
      damage = 26;

      // Translucent floating wraith
      const ghostMat = new THREE.MeshStandardMaterial({
        color: 0x4a1835,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
        emissive: 0x330818,
        emissiveIntensity: 0.6,
      });

      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.7, 8), ghostMat);
      cloak.position.y = 1.2;
      cloak.castShadow = true;
      group.add(cloak);

      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), ghostMat);
      hood.position.set(0, 1.9, 0);
      hood.castShadow = true;
      group.add(hood);

      eyeLight = new THREE.PointLight(0xcc00ff, 1.6, 7);
      eyeLight.position.set(0, 1.9, 0.2);
      group.add(eyeLight);

      animArms = [];
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.8, 6), ghostMat);
      armL.position.set(-0.35, 1.4, 0.1);
      armL.castShadow = true;
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.8, 6), ghostMat);
      armR.position.set(0.35, 1.4, 0.1);
      armR.castShadow = true;
      group.add(armL, armR);
      animArms.push(armL, armR);
    } else if (type === 'boss_warden') {
      maxHp = 450;
      speed = 2.6;
      damage = 45;

      // Colossal Eldritch Boss Titan
      const titanMat = new THREE.MeshStandardMaterial({
        color: 0x12080c,
        roughness: 0.65,
        metalness: 0.4,
        emissive: 0x330008,
        emissiveIntensity: 0.4,
      });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.6, 2.2, 10), titanMat);
      body.position.y = 2.0;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Crowned skull
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), titanMat);
      head.position.set(0, 3.2, 0.1);
      head.castShadow = true;
      head.receiveShadow = true;
      group.add(head);

      // Horns
      for (const hx of [-0.35, 0.35]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 6), chitinMat);
        horn.position.set(hx, 3.6, 0);
        horn.rotation.z = (hx < 0 ? 1 : -1) * 0.4;
        horn.castShadow = true;
        group.add(horn);
      }

      eyeLight = new THREE.PointLight(0xff0033, 3.0, 14);
      eyeLight.position.set(0, 3.25, 0.5);
      group.add(eyeLight);

      animArms = [];
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 1.8, 8), titanMat);
      armL.position.set(-1.1, 2.3, 0);
      armL.castShadow = true;
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 1.8, 8), titanMat);
      armR.position.set(1.1, 2.3, 0);
      armR.castShadow = true;
      group.add(armL, armR);
      animArms.push(armL, armR);
    }

    // --- Floating Overhead 3D Health Bar ---
    const healthBarGroup = new THREE.Group();
    const barY = type === 'crawler' ? 0.75 : (type === 'boss_warden' ? 3.9 : 2.4);
    healthBarGroup.position.set(0, barY, 0);

    const barWidth = type === 'boss_warden' ? 1.4 : 0.8;
    const barHeight = 0.08;

    // Dark background plane
    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth + 0.04, barHeight + 0.02),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8 })
    );
    healthBarGroup.add(bgMesh);

    // Red health fill plane
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight);
    fillGeom.translate(barWidth / 2, 0, 0); // anchor at left
    const fillMat = new THREE.MeshBasicMaterial({ color: type === 'boss_warden' ? 0xff0044 : 0xee2233 });
    const healthBarFill = new THREE.Mesh(fillGeom, fillMat);
    healthBarFill.position.set(-barWidth / 2, 0, 0.005);
    healthBarGroup.add(healthBarFill);

    group.add(healthBarGroup);

    return {
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
      healthBarGroup,
      healthBarFill,
    };
  }
}
