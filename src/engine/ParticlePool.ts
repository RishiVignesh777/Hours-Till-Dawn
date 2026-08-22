import * as THREE from 'three';
import { Particle } from './EntityTypes';

export class ParticlePool {
  private scene: THREE.Scene;
  private activeParticles: Particle[] = [];

  // Shared pre-allocated geometries
  private sparkGeom = new THREE.SphereGeometry(0.02, 4, 4);
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });

  private debrisGeom = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  private debrisMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

  private bloodGeom = new THREE.SphereGeometry(0.03, 4, 4);
  private bloodMat = new THREE.MeshBasicMaterial({ color: 0x880011 });

  private stunGeom = new THREE.SphereGeometry(0.04, 4, 4);
  private stunMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffee });
  private stunMat2 = new THREE.MeshBasicMaterial({ color: 0xff3355 });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createSparks(x: number, y: number, z: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.sparkGeom, this.sparkMat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.activeParticles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2 + 1, (Math.random() - 0.5) * 3),
        life: 0.25,
        maxLife: 0.25,
      });
    }
  }

  public createExplosion(x: number, y: number, z: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.debrisGeom, this.debrisMat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.activeParticles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2.5, (Math.random() - 0.5) * 4),
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  public createBlood(x: number, y: number, z: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.bloodGeom, this.bloodMat);
      p.position.set(x, y, z);
      this.scene.add(p);
      this.activeParticles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.8, Math.random() * 1.2, (Math.random() - 0.5) * 1.8),
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }

  public createStunShockwave(x: number, y: number, z: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const mat = i % 2 === 0 ? this.stunMat1 : this.stunMat2;
      const p = new THREE.Mesh(this.stunGeom, mat);
      p.position.set(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, z + (Math.random() - 0.5) * 0.3);
      this.scene.add(p);
      this.activeParticles.push({
        mesh: p,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2 + 0.8, (Math.random() - 0.5) * 3),
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  public update(dt: number) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.activeParticles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 9.8 * dt;
      }
    }
  }

  public clear() {
    for (const p of this.activeParticles) {
      this.scene.remove(p.mesh);
    }
    this.activeParticles = [];
  }
}
