// Makes the desk hardware look closer to the real thing:
// - a detailed mechanical keyboard (individual keycaps, legends, aluminium case)
// - reflective materials for the monitor, PC case and glass (environment map)
// - RGB fan rings in the PC that slowly cycle colour
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { NIGHT_LOOK } from './night-look.js';

// ---------------------------------------------------------------------------
// Keyboard layout (TKL / 87 keys). Each row: [label, width in units] or a gap (number)
// ---------------------------------------------------------------------------
const ROWS = [
  { y: 0, keys: [['Esc', 1], 1, ['F1', 1], ['F2', 1], ['F3', 1], ['F4', 1], 0.5, ['F5', 1], ['F6', 1], ['F7', 1], ['F8', 1], 0.5, ['F9', 1], ['F10', 1], ['F11', 1], ['F12', 1], 0.25, ['PrtSc', 1], ['ScrLk', 1], ['Pause', 1]] },
  { y: 1.25, keys: [['~', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['Backspace', 2], 0.25, ['Ins', 1], ['Home', 1], ['PgUp', 1]] },
  { y: 2.25, keys: [['Tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5], 0.25, ['Del', 1], ['End', 1], ['PgDn', 1]] },
  { y: 3.25, keys: [['Caps', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['Enter', 2.25]] },
  { y: 4.25, keys: [['Shift', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['Shift', 2.75], 1.25, ['↑', 1]] },
  { y: 5.25, keys: [['Ctrl', 1.25], ['Win', 1.25], ['Alt', 1.25], ['', 6.25], ['Alt', 1.25], ['Fn', 1.25], ['Menu', 1.25], ['Ctrl', 1.25], 0.25, ['←', 1], ['↓', 1], ['→', 1]] },
];
const TOTAL_U = 18.25;
const TOTAL_V = 6.25;
// modifier keys get a lighter grey cap, like a two-tone keycap set
const MODS = new Set(['Esc', 'Backspace', 'Tab', '\\', 'Caps', 'Enter', 'Shift', 'Ctrl', 'Win', 'Alt', 'Fn', 'Menu', 'PrtSc', 'ScrLk', 'Pause', 'Ins', 'Home', 'PgUp', 'Del', 'End', 'PgDn', '↑', '←', '↓', '→']);

function layoutKeys() {
  const keys = [];
  ROWS.forEach((row) => {
    let u = 0;
    row.keys.forEach((k) => {
      if (typeof k === 'number') {
        u += k;
        return;
      }
      const [label, w] = k;
      keys.push({ label, u, v: row.y, w });
      u += w;
    });
  });
  return keys;
}

function legendTexture(keys) {
  const PX = 112; // pixels per key unit
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(TOTAL_U * PX);
  canvas.height = Math.round(TOTAL_V * PX);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'top';
  keys.forEach(({ label, u, v, w }) => {
    if (!label) return;
    const x = u * PX;
    const y = v * PX;
    const big = label.length === 1;
    ctx.fillStyle = MODS.has(label) ? '#b9bcc2' : '#e6e6e2';
    ctx.font = big ? '600 34px "Helvetica Neue", Arial, sans-serif' : '500 22px "Helvetica Neue", Arial, sans-serif';
    if (['↑', '↓', '←', '→'].includes(label)) {
      ctx.textAlign = 'center';
      ctx.fillText(label, x + (w * PX) / 2, y + 30);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 22, y + 20);
    }
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

function createKeyboard(box, envMap) {
  const group = new THREE.Group();
  const width = box.max.z - box.min.z; // keyboard runs along z
  const depth = box.max.x - box.min.x; // front of the keyboard faces +x
  const U = Math.min((width - 0.012) / TOTAL_U, (depth - 0.008) / TOTAL_V);
  const cz = (box.min.z + box.max.z) / 2;
  const cx = (box.min.x + box.max.x) / 2;
  const deskY = box.min.y;

  const caseH = 0.011;
  const caseMat = new THREE.MeshStandardMaterial({
    color: 0x2c2f33,
    metalness: 0.75,
    roughness: 0.38,
    envMap,
    envMapIntensity: 0.8,
  });
  const keyCase = new THREE.Mesh(
    new RoundedBoxGeometry(depth, caseH, width, 3, 0.003),
    caseMat
  );
  keyCase.position.set(cx, deskY + caseH / 2, cz);
  keyCase.castShadow = true;
  keyCase.receiveShadow = true;
  group.add(keyCase);

  // RGB glow under the keycaps, visible between them
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(TOTAL_V * U, TOTAL_U * U),
    new THREE.MeshBasicMaterial({ color: 0x3a6cff, transparent: true, opacity: 0.3 })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(cx, deskY + caseH + 0.0003, cz);
  group.add(plate);

  const capH = 0.0065;
  const capY = deskY + caseH + capH / 2 + 0.0008;
  // dark PBT-style caps, modifiers one shade lighter
  const alpha = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8, metalness: 0.02, envMap, envMapIntensity: 0.15 });
  const mod = new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.8, metalness: 0.02, envMap, envMapIntensity: 0.15 });
  const keys = layoutKeys();
  const gap = 0.12; // gap between caps, in units

  // one InstancedMesh per (cap width, colour): ~10 draw calls instead of 87
  const batches = new Map();
  keys.forEach((k) => {
    const id = `${k.w}|${MODS.has(k.label) ? 'mod' : 'alpha'}`;
    if (!batches.has(id)) batches.set(id, []);
    batches.get(id).push(k);
  });
  const caps = [];
  const m4 = new THREE.Matrix4();
  batches.forEach((list, id) => {
    const [w, kind] = id.split('|');
    const geo = new RoundedBoxGeometry((1 - gap) * U, capH, (Number(w) - gap) * U, 2, 0.0012);
    const inst = new THREE.InstancedMesh(geo, kind === 'mod' ? mod : alpha, list.length);
    inst.name = 'KeyCap';
    inst.castShadow = false;
    inst.receiveShadow = true;
    list.forEach(({ u, v, w: kw }, i) => {
      // layout u runs left->right (towards -z), v runs back->front (towards +x)
      const pos = new THREE.Vector3(cx + (v + 0.5 - TOTAL_V / 2) * U, capY, cz - (u + kw / 2 - TOTAL_U / 2) * U);
      inst.setMatrixAt(i, m4.makeTranslation(pos.x, pos.y, pos.z));
      caps.push({ inst, i, pos });
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  });

  // legends printed on the caps
  const legends = new THREE.Mesh(
    new THREE.PlaneGeometry(TOTAL_U * U, TOTAL_V * U),
    new THREE.MeshBasicMaterial({ map: legendTexture(keys), transparent: true, depthWrite: false })
  );
  // canvas right -> world -z, canvas down -> world +x
  legends.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ');
  legends.position.set(cx, capY + capH / 2 + 0.0002, cz);
  group.add(legends);

  // a few keys get pressed now and then, as if someone is typing
  return { group, plate, caps };
}

// ---------------------------------------------------------------------------
export function upgradeDevices(roomScene, renderer) {
  // world positions are needed to measure the old meshes
  roomScene.updateMatrixWorld(true);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const reflective = []; // [material, dayIntensity]

  // KEYBOARD: hide the low-poly one and put a detailed one in its place
  const oldKeyboard = roomScene.getObjectByName('Keyboard');
  let keyboard = null;
  if (oldKeyboard) {
    const box = new THREE.Box3().setFromObject(oldKeyboard);
    oldKeyboard.visible = false;
    keyboard = createKeyboard(box, envMap);
    roomScene.add(keyboard.group);
  }

  // MONITOR: satin black body and a glossy glass layer over the screen
  const stand = roomScene.getObjectByName('Stand');
  if (stand) {
    const screen = stand.getObjectByName('Monitor');
    const body = stand.getObjectByName('Pc');
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.55, roughness: 0.42, envMap, envMapIntensity: 0.7 });
    if (body) body.material = bodyMat;
    stand.material = bodyMat;
    reflective.push([bodyMat, 0.7]);
    if (screen) {
      const glass = new THREE.Mesh(
        screen.geometry,
        new THREE.MeshPhysicalMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.1,
          roughness: 0.06,
          metalness: 0,
          clearcoat: 1,
          envMap,
          envMapIntensity: 1.4,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        })
      );
      screen.add(glass);
      reflective.push([glass.material, 1.4]);
    }
  }

  // PC: tempered glass, brushed metal, RGB fan rings
  const cpu = roomScene.getObjectByName('CPU');
  const rings = [];
  if (cpu) {
    cpu.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name.startsWith('CPU_Glass')) {
        o.material = new THREE.MeshPhysicalMaterial({
          color: 0x0b0c0e,
          transparent: true,
          opacity: 0.18,
          roughness: 0.04,
          metalness: 0,
          clearcoat: 1,
          envMap,
          envMapIntensity: 0.65,
          depthWrite: false,
        });
        o.renderOrder = 2;
        reflective.push([o.material, 0.65]);
      } else if (o.material && o.material.isMeshStandardMaterial) {
        o.material = o.material.clone();
        o.material.envMap = envMap;
        o.material.envMapIntensity = o.material.name.includes('Metal') ? 1 : 0.5;
        if (o.material.name.includes('Metal')) {
          o.material.metalness = 0.85;
          o.material.roughness = 0.3;
        }
        reflective.push([o.material, o.material.envMapIntensity]);
      }
    });

    // RGB rings on the front fans (they face +x) and the rear fan
    ['Fan001', 'Fan002', 'Fan003', 'Fan'].forEach((name, i) => {
      const fan = cpu.getObjectByName(name);
      if (!fan) return;
      const b = new THREE.Box3().setFromObject(fan);
      const c = b.getCenter(new THREE.Vector3());
      const r = (b.max.y - b.min.y) * 0.44;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.0022, 10, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
      );
      ring.rotation.y = Math.PI / 2;
      // sit just in front of each fan's face
      ring.position.set(name === 'Fan' ? b.min.x - 0.001 : b.max.x + 0.001, c.y, c.z);
      roomScene.add(ring);
      rings.push({ ring, phase: i * 0.12 });
    });
  }

  const color = new THREE.Color();
  let night = false;

  return {
    envMap,
    // colour of the RGB fans at time t (used to tint the fan lights too)
    rgbAt(t, phase = 0) {
      return night
        ? color.setHSL((NIGHT_LOOK.rgbHue + t * NIGHT_LOOK.rgbSpeed + phase) % 1, 0.9, 0.52).convertSRGBToLinear()
        : color.setHSL(0.43 + Math.sin(t * 0.08 + phase) * 0.015, 0.24, 0.4);
    },
    setNight(isNight) {
      night = isNight;
      reflective.forEach(([mat, day]) => (mat.envMapIntensity = isNight ? day * 0.25 : day));
      if (keyboard) keyboard.plate.material.opacity = isNight ? 0.78 : 0.07;
    },
    update(t) {
      rings.forEach(({ ring, phase }) => {
        if (night) ring.material.color.setHSL((NIGHT_LOOK.rgbHue + t * NIGHT_LOOK.rgbSpeed + phase) % 1, 0.95, 0.52).convertSRGBToLinear();
        else ring.material.color.setHSL(0.43 + Math.sin(t * 0.08 + phase) * 0.015, 0.24, 0.42);
      });
      if (keyboard) {
        if (night) keyboard.plate.material.color.setHSL((NIGHT_LOOK.rgbHue + t * NIGHT_LOOK.rgbSpeed + 0.5) % 1, 0.85, 0.55).convertSRGBToLinear();
        else keyboard.plate.material.color.set(0xb9c7b9);
      }
    },
  };
}
