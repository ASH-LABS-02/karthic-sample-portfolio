import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { NIGHT_LOOK } from './night-look.js';

// Work in linear light, display in sRGB, and decode color textures exactly once.
THREE.ColorManagement.legacyMode = false;

function texture(size, draw, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const result = new THREE.CanvasTexture(canvas);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.anisotropy = 8;
  if (color) result.encoding = THREE.sRGBEncoding;
  return result;
}

function random(seed) { return () => ((seed = seed * 16807 % 2147483647) / 2147483647); }

function mineral(base, seed, grout = false) {
  return texture(256, (context, size) => {
    const noise = random(seed);
    context.fillStyle = base; context.fillRect(0, 0, size, size);
    for (let i = 0; i < 14000; i++) {
      context.fillStyle = noise() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(32,26,18,0.035)';
      context.fillRect(noise() * size, noise() * size, 1, 1);
    }
    if (grout) {
      context.strokeStyle = 'rgba(77,65,47,0.22)'; context.lineWidth = 1.1;
      context.strokeRect(0.6, 0.6, size - 1.2, size - 1.2);
    }
  });
}

function oakGrain() {
  return texture(512, (context, size) => {
    const noise = random(71);
    context.fillStyle = '#b69b78'; context.fillRect(0, 0, size, size);
    for (let i = 0; i < 300; i++) {
      const y = noise() * size;
      context.strokeStyle = i % 3 ? 'rgba(78,53,29,0.07)' : 'rgba(248,230,195,0.11)';
      context.lineWidth = 0.5 + noise(); context.beginPath(); context.moveTo(0, y);
      context.bezierCurveTo(size * 0.3, y - 6, size * 0.7, y + 9, size, y + noise() * 5); context.stroke();
    }
  });
}

function boxUV(geometry, tile = 0.55) {
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(n.getY(i)) > 0.65) { uv[i * 2] = p.getX(i) / tile; uv[i * 2 + 1] = p.getZ(i) / tile; }
    else if (Math.abs(n.getX(i)) > 0.65) { uv[i * 2] = p.getZ(i) / tile; uv[i * 2 + 1] = p.getY(i) / tile; }
    else { uv[i * 2] = p.getX(i) / tile; uv[i * 2 + 1] = p.getY(i) / tile; }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function colorTextures(root, anisotropy = 8) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      for (const key of ['map', 'emissiveMap']) {
        const map = material[key];
        if (!map || map.isRenderTargetTexture) continue;
        let upload = false;
        if (map.encoding !== THREE.sRGBEncoding) {
          map.encoding = THREE.sRGBEncoding;
          material.needsUpdate = true;
          upload = true;
        }
        if (map.anisotropy !== anisotropy) { map.anisotropy = anisotropy; upload = true; }
        if (upload) {
          // TextureLoader will request the upload once its image has arrived.
          if (map.image) map.needsUpdate = true;
        }
      }
    }
  });
}

export function configureRenderer(renderer) {
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
}

export function finishRoom(room, envMap, chair) {
  const plaster = mineral('#d8d2c6', 17), stone = mineral('#b8afa0', 41, true);
  const bump = mineral('#808080', 19); bump.encoding = THREE.LinearEncoding;
  const wallMaterial = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.94, bumpMap: bump, bumpScale: 0.00045 });
  const floorMaterial = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.78, bumpMap: bump, bumpScale: 0.00035, envMap, envMapIntensity: 0.2 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.95 });
  const finishes = [[wallMaterial, NIGHT_LOOK.wallTint], [floorMaterial, NIGHT_LOOK.floorTint], [ceilingMaterial, NIGHT_LOOK.ceilingTint]]
    .map(([material, nightTint]) => ({ material, nightTint, dayColor: material.color.clone() }));
  let tabletopMaterial;
  const shell = room.getObjectByName('Wall');
  if (shell) {
    const geometry = shell.geometry.index ? shell.geometry.toNonIndexed() : shell.geometry.clone();
    geometry.deleteAttribute('color'); geometry.clearGroups(); boxUV(geometry);
    const normal = geometry.attributes.normal;
    let start = 0, previous = -1;
    for (let i = 0; i < normal.count; i += 3) {
      const ny = (normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3;
      const material = ny > 0.7 ? 1 : ny < -0.7 ? 2 : 0;
      if (material !== previous) {
        if (i > start) geometry.addGroup(start, i - start, previous);
        start = i; previous = material;
      }
    }
    geometry.addGroup(start, normal.count - start, previous);
    shell.geometry = geometry; shell.material = [wallMaterial, floorMaterial, ceilingMaterial]; shell.receiveShadow = true;
  }
  room.traverse((object) => {
    if (!object.isMesh) return;
    if (object.name === 'EntryWall') object.material = wallMaterial;
    if (object.name === 'HallwayFloor') { object.material = floorMaterial; boxUV(object.geometry); }
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material?.isMeshStandardMaterial) continue;
      if (material.color.g > 0.15 && material.color.g > material.color.r * 1.4 && material.color.g > material.color.b * 1.35 && material.emissive.getHex() === 0) {
        material.color.lerp(new THREE.Color(0x466040), 0.6); material.roughness = 0.82;
      }
      if (material.metalness > 0.2 && !material.envMap) { material.envMap = envMap; material.envMapIntensity = 0.3; }
    }
  });
  const table = room.getObjectByName('Table');
  if (table) {
    const wood = new THREE.MeshPhysicalMaterial({ map: oakGrain(), roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4, envMap, envMapIntensity: 0.28 });
    tabletopMaterial = wood;
    const legs = new THREE.MeshStandardMaterial({ color: 0xd7d5cd, roughness: 0.55 });
    const geometry = table.geometry.index ? table.geometry.toNonIndexed() : table.geometry.clone();
    geometry.computeBoundingBox(); geometry.clearGroups(); boxUV(geometry, 0.6);
    const positions = geometry.attributes.position, top = geometry.boundingBox.max.y;
    let groupStart = 0, lastMaterial = -1;
    for (let i = 0; i < positions.count; i += 3) {
      const y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
      const material = y > top - 0.07 ? 0 : 1;
      if (material !== lastMaterial) {
        if (i > groupStart) geometry.addGroup(groupStart, i - groupStart, lastMaterial);
        groupStart = i; lastMaterial = material;
      }
    }
    geometry.addGroup(groupStart, positions.count - groupStart, lastMaterial);
    table.geometry = geometry; table.material = [wood, legs];
    const bounds = new THREE.Box3().setFromObject(table), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const cap = new THREE.Mesh(new RoundedBoxGeometry(size.x + 0.002, 0.012, size.z + 0.002, 5, 0.005), wood);
    cap.position.set(center.x, bounds.max.y - 0.002, center.z); cap.receiveShadow = true; cap.castShadow = true; cap.name = 'TableFinish'; room.add(cap);
  }
  const finish = new THREE.Group(); finish.userData.dynamic = true; room.add(finish);
  const shadowTexture = texture(128, (context, size) => {
    const radial = context.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
    radial.addColorStop(0, 'rgba(0,0,0,0.45)'); radial.addColorStop(0.5, 'rgba(0,0,0,0.2)'); radial.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = radial; context.fillRect(0, 0, size, size);
  }, false);
  const shadows = [];
  for (const [x, z, width, depth] of [[0, 0.12, 0.72, 1.14], [0.56, 1.02, 0.56, 0.56], [0.98, -1.07, 1.2, 0.34], [0.95, 2.18, 0.8, 0.35], [1.62, -1.08, 0.3, 0.3]]) {
    const material = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, -0.467, z); shadow.raycast = () => {}; finish.add(shadow); shadows.push(shadow);
  }
  colorTextures(room);
  return {
    update() { if (chair) { shadows[1].position.x = chair.position.x; shadows[1].position.z = chair.position.z; } },
    setNight(night, immediate = false) {
      const duration = immediate ? 0 : 0.8;
      shadows.forEach((shadow) => gsap.to(shadow.material, { opacity: night ? 0.2 : 0.38, duration, overwrite: true }));
      finishes.forEach(({ material, nightTint, dayColor }) => {
        const color = night ? new THREE.Color(nightTint) : dayColor;
        gsap.to(material.color, { r: color.r, g: color.g, b: color.b, duration, overwrite: true });
      });
      gsap.to(floorMaterial, { envMapIntensity: night ? 0.035 : 0.2, duration, overwrite: true });
      if (tabletopMaterial) gsap.to(tabletopMaterial, { envMapIntensity: night ? 0.04 : 0.28, duration, overwrite: true });
    },
  };
}

export function walkMarker(scene, scale) {
  const material = new THREE.MeshBasicMaterial({ color: 0xe5cda1, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.032 * scale, 0.038 * scale, 48), material);
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.464 * scale; ring.raycast = () => {}; scene.add(ring);
  return {
    show(point) { ring.position.x = point.x; ring.position.z = point.z; gsap.to(material, { opacity: 0.7, duration: 0.2, overwrite: true }); },
    hide() { gsap.to(material, { opacity: 0, duration: 0.5, overwrite: true }); },
  };
}
