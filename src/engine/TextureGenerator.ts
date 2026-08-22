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

    // Base color per floor with enhanced brightness & high contrast visibility
    let baseColor = '#323c44'; // Floor 1: Slate Navy with clear visibility
    let patternColor = '#50606e';
    let stainColor = 'rgba(15, 20, 26, 0.35)';

    if (floor === 2) {
      baseColor = '#462c26'; // Floor 2: Rich Burgundy
      patternColor = '#6d453c';
      stainColor = 'rgba(25, 12, 8, 0.4)';
    } else if (floor === 3) {
      baseColor = '#2d4234'; // Floor 3: Moss Green Victorian
      patternColor = '#476953';
      stainColor = 'rgba(18, 30, 22, 0.45)';
    } else if (floor >= 4) {
      baseColor = '#3a1e2a'; // Floor 4 & 5: Deep Victorian Wine Red
      patternColor = '#612a44';
      stainColor = 'rgba(45, 10, 20, 0.5)';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Damask / Victorian wallpaper pattern with crisp contrast
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

    // Dark hardwood parquet with warm rich contrast
    ctx.fillStyle = floor >= 4 ? '#241b18' : '#30241e';
    ctx.fillRect(0, 0, 512, 512);

    // Wood planks
    const plankH = 32;
    for (let y = 0; y < 512; y += plankH) {
      const offset = (y / plankH) % 2 === 0 ? 0 : 64;
      for (let x = -64; x < 512; x += 128) {
        ctx.fillStyle = ((x + y) % 3 === 0) ? '#44352b' : '#382b22';
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

    // Velvet carpet runner strip in middle
    ctx.fillStyle = floor >= 4 ? 'rgba(110, 18, 30, 0.9)' : 'rgba(130, 28, 36, 0.9)';
    ctx.fillRect(140, 0, 232, 512);

    // Gold carpet border
    ctx.strokeStyle = 'rgba(215, 175, 60, 0.85)';
    ctx.lineWidth = 5;
    ctx.strokeRect(144, 0, 224, 512);

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

    ctx.fillStyle = '#2d3238';
    ctx.fillRect(0, 0, 256, 256);

    // Plaster tile grid
    ctx.strokeStyle = '#181c20';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeRect(0, 0, 128, 128);
    ctx.strokeRect(128, 0, 128, 128);
    ctx.strokeRect(0, 128, 128, 128);
    ctx.strokeRect(128, 128, 128, 128);

    // Water stains
    ctx.fillStyle = 'rgba(18, 14, 10, 0.35)';
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
    ctx.fillStyle = '#42281e';
    ctx.fillRect(0, 0, 256, 512);

    // Wood panels
    ctx.fillStyle = '#321d15';
    ctx.fillRect(24, 40, 208, 180);
    ctx.fillRect(24, 250, 208, 220);

    ctx.strokeStyle = '#5a382b';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 40, 208, 180);
    ctx.strokeRect(24, 250, 208, 220);

    // Brass doorknob plate
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(200, 240, 20, 60);
    ctx.beginPath();
    ctx.arc(210, 270, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c84c';
    ctx.fill();

    // Brass Room Plate
    ctx.fillStyle = '#e0be50';
    ctx.fillRect(78, 70, 100, 36);
    ctx.strokeStyle = '#997a2b';
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
