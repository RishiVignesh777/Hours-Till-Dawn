import * as THREE from 'three';

export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  public static getWallpaper(floor: number = 1): THREE.CanvasTexture {
    const key = `wallpaper_${floor}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base color per floor
    let baseColor = '#1e2428'; // Floor 1: Dark Slate Navy
    let patternColor = '#2d3740';
    let stainColor = 'rgba(10, 15, 20, 0.4)';

    if (floor === 2) {
      baseColor = '#2b1b17'; // Floor 2: Decaying Burgundy
      patternColor = '#3d2621';
      stainColor = 'rgba(20, 8, 5, 0.5)';
    } else if (floor === 3) {
      baseColor = '#1c2820'; // Floor 3: Moldy Moss Green
      patternColor = '#2a3d31';
      stainColor = 'rgba(15, 25, 18, 0.6)';
    } else if (floor >= 4) {
      baseColor = '#1f1118'; // Floor 4 & 5: Deep nightmare crimson-black
      patternColor = '#3a1928';
      stainColor = 'rgba(40, 5, 15, 0.7)';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Damask / Victorian wallpaper pattern
    ctx.fillStyle = patternColor;
    for (let y = 0; y < 512; y += 64) {
      for (let x = 0; x < 512; x += 64) {
        ctx.beginPath();
        ctx.arc(x + 32, y + 32, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 32, y + 10);
        ctx.bezierCurveTo(x + 50, y + 25, x + 50, y + 45, x + 32, y + 54);
        ctx.bezierCurveTo(x + 14, y + 45, x + 14, y + 25, x + 32, y + 10);
        ctx.fill();
      }
    }

    // Peeling & mold stains
    ctx.fillStyle = stainColor;
    for (let i = 0; i < 15 + floor * 5; i++) {
      const rx = (i * 73) % 512;
      const ry = (i * 97) % 512;
      const radius = 25 + ((i * 17) % 50);
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grunge vertical stripes & scratches
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 512; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  public static getFloorTexture(floor: number = 1): THREE.CanvasTexture {
    const key = `floor_${floor}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark hardwood parquet
    ctx.fillStyle = floor >= 4 ? '#120d0e' : '#1c1512';
    ctx.fillRect(0, 0, 512, 512);

    // Wood planks
    const plankH = 32;
    for (let y = 0; y < 512; y += plankH) {
      const offset = (y / plankH) % 2 === 0 ? 0 : 64;
      for (let x = -64; x < 512; x += 128) {
        ctx.fillStyle = ((x + y) % 3 === 0) ? '#261e1a' : '#1e1714';
        ctx.fillRect(x + offset, y, 126, plankH - 2);
        
        // Wood grain
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + offset, y + plankH / 2);
        ctx.lineTo(x + offset + 126, y + plankH / 2);
        ctx.stroke();
      }
    }

    // Dark red carpet runner strip in middle
    ctx.fillStyle = floor >= 4 ? 'rgba(70, 8, 15, 0.85)' : 'rgba(90, 18, 22, 0.8)';
    ctx.fillRect(160, 0, 192, 512);

    // Gold carpet border
    ctx.strokeStyle = 'rgba(160, 120, 40, 0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(164, 0, 184, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  public static getCeilingTexture(): THREE.CanvasTexture {
    const key = 'ceiling';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#181b1d';
    ctx.fillRect(0, 0, 256, 256);

    // Plaster tile grid
    ctx.strokeStyle = '#0d0f11';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeRect(0, 0, 128, 128);
    ctx.strokeRect(128, 0, 128, 128);
    ctx.strokeRect(0, 128, 128, 128);
    ctx.strokeRect(128, 128, 128, 128);

    // Water stains
    ctx.fillStyle = 'rgba(10, 8, 5, 0.4)';
    ctx.beginPath();
    ctx.arc(80, 90, 40, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  public static getDoorTexture(roomNum: string = '101', isStairs: boolean = false): THREE.CanvasTexture {
    const key = `door_${roomNum}_${isStairs}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich mahogany door
    ctx.fillStyle = '#2b1a13';
    ctx.fillRect(0, 0, 256, 512);

    // Wood panels
    ctx.fillStyle = '#20130d';
    ctx.fillRect(24, 40, 208, 180);
    ctx.fillRect(24, 250, 208, 220);

    ctx.strokeStyle = '#3d251a';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 40, 208, 180);
    ctx.strokeRect(24, 250, 208, 220);

    // Brass doorknob plate
    ctx.fillStyle = '#b8973b';
    ctx.fillRect(200, 240, 20, 60);
    ctx.beginPath();
    ctx.arc(210, 270, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#d4af37';
    ctx.fill();

    // Brass Room Plate
    ctx.fillStyle = '#cca842';
    ctx.fillRect(78, 70, 100, 36);
    ctx.strokeStyle = '#82651f';
    ctx.lineWidth = 2;
    ctx.strokeRect(78, 70, 100, 36);

    ctx.fillStyle = '#111';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roomNum, 128, 88);

    if (isStairs) {
      ctx.fillStyle = '#a61c1c';
      ctx.fillRect(58, 120, 140, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('EMERGENCY EXIT', 128, 134);
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  public static getPaintingTexture(id: number): THREE.CanvasTexture {
    const key = `painting_${id}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    // Ornate gold frame
    ctx.fillStyle = '#9e782f';
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = '#6e501a';
    ctx.fillRect(12, 12, 232, 296);

    // Portrait canvas
    ctx.fillStyle = '#1a1815';
    ctx.fillRect(20, 20, 216, 280);

    // Creepy Victorian Figure
    if (id % 3 === 0) {
      // Dark silhouette with glowing eyes
      ctx.fillStyle = '#0a0908';
      ctx.beginPath();
      ctx.arc(128, 110, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(88, 145, 80, 120);

      // Glowing eerie eyes
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(118, 108, 4, 0, Math.PI * 2);
      ctx.arc(138, 108, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (id % 3 === 1) {
      // Blackridge Hotel building illustration at night
      ctx.fillStyle = '#0f1824';
      ctx.fillRect(20, 20, 216, 280);
      ctx.fillStyle = '#060a10';
      ctx.fillRect(60, 100, 136, 180);
      // Windows with faint yellow/blood red glow
      ctx.fillStyle = '#8a2020';
      for (let wy = 120; wy < 260; wy += 28) {
        for (let wx = 75; wx < 185; wx += 26) {
          ctx.fillRect(wx, wy, 14, 18);
        }
      }
    } else {
      // Blood moon ritual
      ctx.fillStyle = '#1a0d14';
      ctx.fillRect(20, 20, 216, 280);
      ctx.fillStyle = '#aa1928';
      ctx.beginPath();
      ctx.arc(128, 120, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }
}
