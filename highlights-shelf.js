import * as THREE from 'three';
import gsap from 'gsap';
import { certificateImage } from './certificates.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FONT = 'Inter, Arial, sans-serif';
const PAPER = '#efeee7';
const INK = '#28382f';
const MUTED = '#697467';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const fontReady = document.fonts
  ? Promise.all([400, 500, 600].map((weight) => document.fonts.load(`${weight} 32px Inter`)))
  : Promise.resolve();

function print(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  const redraw = () => { draw(context, width, height); texture.needsUpdate = true; };
  redraw();
  fontReady.then(redraw).catch(() => {});
  return texture;
}

function text(context, value, x, y, size, { weight = 400, color = INK, maxWidth } = {}) {
  context.fillStyle = color;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  let fitted = size;
  context.font = `${weight} ${fitted}px ${FONT}`;
  while (maxWidth && context.measureText(value).width > maxWidth && fitted > 12) {
    context.font = `${weight} ${--fitted}px ${FONT}`;
  }
  context.fillText(value, x, y);
}

function statTexture(info) {
  const labels = info.label.split(' ');
  return print(768, 1024, (context, width, height) => {
    context.fillStyle = PAPER;
    context.fillRect(0, 0, width, height);
    text(context, info.big, 84, 416, 220, { weight: 500, maxWidth: 602 });
    labels.forEach((line, index) => text(context, line, 88, 618 + index * 82, 63, { color: MUTED }));
    text(context, info.subtitle.split(' · ')[0], 88, 920, 36, { color: MUTED, maxWidth: 590 });
  });
}

function leadershipTexture() {
  return print(768, 1024, (context, width, height) => {
    context.fillStyle = '#263e34';
    context.fillRect(0, 0, width, height);
    // The upper half is reserved for the physical kinetic sculpture.
    text(context, 'Your', 76, 618, 109, { weight: 500, color: '#eeeee4', maxWidth: 610 });
    text(context, 'Role', 76, 750, 109, { weight: 500, color: '#eeeee4' });
    text(context, 'Your organization', 80, 934, 42, { color: '#bdcbb8', maxWidth: 610 });
  });
}

function educationTexture(info) {
  const texture = new THREE.TextureLoader().load(certificateImage(info));
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 8;
  return texture;
}

function box(width, height, depth, material, radius = 0.002) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, 5, Math.min(radius, width / 2, height / 2, depth / 2)), material
  );
  mesh.receiveShadow = true;
  return mesh;
}

function roundedFace(width, height, radius = 0.0018) {
  const left = -width / 2, right = width / 2, bottom = -height / 2, top = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  const geometry = new THREE.ShapeGeometry(shape, 8);
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, positions.getX(i) / width + 0.5, positions.getY(i) / height + 0.5);
  }
  return geometry;
}

function walnutGrain() {
  const texture = print(1024, 128, (context, width, height) => {
    context.fillStyle = '#80644c';
    context.fillRect(0, 0, width, height);
    let seed = 37;
    const random = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
    for (let i = 0; i < 160; i++) {
      const y = random() * height;
      context.strokeStyle = i % 3 ? `rgba(44,30,20,${0.025 + random() * 0.055})` : 'rgba(217,188,144,0.08)';
      context.lineWidth = 0.35 + random() * 0.7;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(width * 0.3, y - 5, width * 0.7, y + 5, width, y + (random() - 0.5) * 4);
      context.stroke();
    }
  });
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function wallWash() {
  return print(256, 256, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    const falloff = context.createLinearGradient(0, 0, 0, height);
    falloff.addColorStop(0, 'rgba(255,216,161,0.6)');
    falloff.addColorStop(0.35, 'rgba(255,216,161,0.18)');
    falloff.addColorStop(1, 'rgba(255,216,161,0)');
    context.fillStyle = falloff;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'destination-in';
    const sides = context.createLinearGradient(0, 0, width, 0);
    sides.addColorStop(0, 'transparent');
    sides.addColorStop(0.14, '#fff');
    sides.addColorStop(0.86, '#fff');
    sides.addColorStop(1, 'transparent');
    context.fillStyle = sides;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  });
}

function kineticCore(envMap) {
  const group = new THREE.Group();
  group.name = 'KineticCore';
  group.userData.dynamic = true;
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xc7b58b, roughness: 0.25, metalness: 0.9,
    clearcoat: 0.5, clearcoatRoughness: 0.22, envMap, envMapIntensity: 0.95,
    emissive: 0x332413, emissiveIntensity: 0.13,
  });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0015, 10, 72), metal);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0012, 10, 64), metal);
  outer.rotation.set(0.35, 0.4, -0.18);
  inner.rotation.set(-0.75, -0.45, 0.3);
  const cube = box(0.022, 0.022, 0.022, metal, 0.003);
  cube.rotation.set(0.45, 0.6, 0.25);
  group.add(outer, inner, cube);
  let phase = 0;
  return {
    group,
    update(dt, energy) {
      if (motionPreference.matches) return;
      const speed = 0.28 + energy * 0.42;
      phase += dt;
      outer.rotation.y += dt * speed;
      inner.rotation.x -= dt * speed * 0.7;
      cube.rotation.y -= dt * speed * 0.6;
      cube.rotation.z += dt * speed * 0.3;
      cube.position.y = Math.sin(phase * 0.9) * 0.0018;
    },
    setNight(night) {
      gsap.to(metal, { envMapIntensity: night ? 0.55 : 0.95, emissiveIntensity: night ? 0.7 : 0.13, duration: 0.7, overwrite: true });
    },
  };
}

// The five displays share one baseline, frame finish and type system.
// Each remains a separate pick-up target with the original resume details.
export function createHighlightsShelf(highlights, envMap) {
  const group = new THREE.Group();
  group.name = 'HighlightsShelf';
  const faces = [];
  const displays = [];
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x41483c, roughness: 0.34, metalness: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.28, envMap, envMapIntensity: 0.5 });
  const grain = walnutGrain();
  const oak = new THREE.MeshPhysicalMaterial({
    color: 0xc6af96, map: grain, bumpMap: grain, bumpScale: 0.00006,
    roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.3,
    envMap, envMapIntensity: 0.3, emissive: 0x191006, emissiveIntensity: 0,
  });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xa89675, roughness: 0.32, metalness: 0.8, envMap, envMapIntensity: 0.75 });
  const plank = box(1.04, 0.022, 0.125, oak, 0.006);
  plank.position.set(0, 0, 0.0625);
  group.add(plank);
  const lip = box(1.018, 0.0015, 0.002, bronze, 0.0005);
  lip.position.set(0, -0.004, 0.1255);
  group.add(lip);

  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xffd9a2, transparent: true, opacity: 0.3, toneMapped: false });
  const led = box(0.97, 0.0015, 0.002, ledMaterial, 0.0005);
  led.position.set(0, -0.0105, 0.116);
  led.userData.dynamic = true;
  group.add(led);
  const washMaterial = new THREE.MeshBasicMaterial({ map: wallWash(), transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.18), washMaterial);
  wash.position.set(0, -0.08, 0.002);
  wash.userData.dynamic = true;
  group.add(wash);
  const sculpture = kineticCore(envMap);

  const display = (info, width, height, texture, x, dark = false) => {
    const item = new THREE.Group();
    item.userData.holdItem = true;
    item.userData.info = info;
    const presentation = new THREE.Group();
    item.add(presentation);
    const state = { lift: 0, tiltX: 0, tiltY: 0, energy: 0 };
    const backing = box(width + 0.012, height + 0.012, 0.01, frame, 0.004);
    backing.position.y = (height + 0.01) / 2;
    presentation.add(backing);
    const rimMaterial = bronze.clone();
    const rim = box(width + 0.003, height + 0.003, 0.0012, rimMaterial, 0.0005);
    rim.position.set(0, (height + 0.01) / 2, 0.0051);
    presentation.add(rim);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    faces.push({ material, dark });
    const face = new THREE.Mesh(roundedFace(width, height), material);
    face.position.set(0, (height + 0.01) / 2, 0.0058);
    face.userData.cardFace = true;
    presentation.add(face);
    if (dark) {
      sculpture.group.position.set(0, 0.148, 0.026);
      presentation.add(sculpture.group);
    }
    // All five sit on the same datum; a shallow lean keeps their text legible.
    item.position.set(x, 0.011, 0.047);
    item.rotation.x = -0.035;
    item.traverse((object) => {
      if (!object.isMesh) return;
      object.name = 'Highlight';
      object.userData.info = info;
    });
    const applyPose = () => {
      presentation.position.z = state.lift;
      presentation.rotation.set(state.tiltX, state.tiltY, 0);
    };
    item.userData.setHover = (active, uv) => {
      const move = active && !motionPreference.matches;
      gsap.to(state, {
        lift: move ? 0.009 : 0,
        tiltX: move ? (0.5 - (uv?.y ?? 0.5)) * 0.07 : 0,
        tiltY: move ? ((uv?.x ?? 0.5) - 0.5) * 0.09 : 0,
        energy: active ? 1 : 0,
        duration: motionPreference.matches ? 0 : 0.6,
        ease: 'power3.out', overwrite: true,
      });
      gsap.to(rimMaterial, { envMapIntensity: active ? 1.3 : 0.75, duration: 0.4, overwrite: true });
    };
    item.userData.resetHover = () => {
      gsap.killTweensOf(state);
      Object.assign(state, { lift: 0, tiltX: 0, tiltY: 0, energy: 0 });
      applyPose();
      rimMaterial.envMapIntensity = 0.75;
    };
    displays.push({ state, applyPose, dark });
    group.add(item);
    return item;
  };

  const [degree, lead, ...stats] = highlights;
  [...stats].reverse().forEach((info, index) => {
    display(info, 0.124, 0.172, statTexture(info), -0.409 + index * 0.146);
  });
  display(lead, 0.138, 0.192, leadershipTexture(), 0.083, true);
  display(degree, 0.25, 0.1875, educationTexture(degree), 0.348);

  group.userData.update = (_time, delta = 0) => {
    displays.forEach(({ state, applyPose, dark }) => {
      applyPose();
      if (dark) sculpture.update(delta, state.energy);
    });
  };

  group.userData.setNight = (night) => {
    sculpture.setNight(night);
    gsap.to(oak, { envMapIntensity: night ? 0.05 : 0.3, emissiveIntensity: night ? 0.45 : 0, duration: 0.8, overwrite: true });
    gsap.to(ledMaterial, { opacity: night ? 0.85 : 0.3, duration: 0.7, overwrite: true });
    gsap.to(washMaterial, { opacity: night ? 0.5 : 0.05, duration: 0.9, overwrite: true });
    faces.forEach(({ material, dark }) => {
      // At night the paper dims instead of glowing like a monitor.
      const tint = new THREE.Color(night ? (dark ? 0xe5eadb : 0xb6bead) : 0xffffff);
      gsap.to(material.color, { r: tint.r, g: tint.g, b: tint.b, duration: 0.5, overwrite: true });
    });
    gsap.to(frame.emissive, {
      r: night ? 0.018 : 0,
      g: night ? 0.022 : 0,
      b: night ? 0.015 : 0,
      duration: 0.5,
      overwrite: true,
    });
  };
  return group;
}
