// Ceiling fan with a wall switch + step regulator (Indian modular style),
// and an AC remote lying on the sideboard.
// Coordinates are in the room model's space: ceiling at y = 1.56,
// left wall at x = -0.274 (facing +x), floor at y = -0.47.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { sound } from './sound.js';

const CEILING = 1.56;
const WALL_X = -0.274;
const FLOOR = -0.47;
const SPEEDS = [0, 3.2, 5.6, 8, 10.4, 12.8]; // rad/s for regulator steps 0..5

function rbox(w, h, d, material, r = 0.003, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function nameAll(obj, name) {
  obj.traverse((o) => o.isMesh && (o.name = name));
}

// ---------------------------------------------------------------------------
function createCeilingFan(envMap) {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.35, metalness: 0.1, envMap, envMapIntensity: 0.5 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.2, metalness: 0.95, envMap, envMapIntensity: 1 });
  const bladeTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#6b4a33';
    x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = `rgba(35,20,10,${0.1 + Math.random() * 0.15})`;
      x.lineWidth = 0.6 + Math.random();
      const x0 = Math.random() * 64;
      x.beginPath();
      x.moveTo(x0, 0);
      x.lineTo(x0 + (Math.random() - 0.5) * 6, 256);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const wood = new THREE.MeshStandardMaterial({ map: bladeTex, roughness: 0.5, envMap, envMapIntensity: 0.4 });

  // canopy + downrod (fixed)
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.035, 32), body);
  canopy.position.y = CEILING - 0.0175;
  canopy.castShadow = true;
  group.add(canopy);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 16), body);
  rod.position.y = CEILING - 0.035 - 0.065;
  rod.castShadow = true;
  group.add(rod);

  // rotor: motor housing, blade irons and blades all turn together
  const rotor = new THREE.Group();
  const HUB_Y = CEILING - 0.035 - 0.13 - 0.03;
  rotor.position.y = HUB_Y;
  group.add(rotor);
  const motorPts = [
    [0.0, 0.035],
    [0.03, 0.035],
    [0.075, 0.028],
    [0.09, 0.012],
    [0.092, -0.004],
    [0.08, -0.02],
    [0.05, -0.03],
    [0.0, -0.034],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const motor = new THREE.Mesh(new THREE.LatheGeometry(motorPts, 48), body);
  motor.castShadow = true;
  rotor.add(motor);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.0905, 0.0022, 8, 64), chrome);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.004;
  rotor.add(trim);
  const capBottom = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), chrome);
  capBottom.position.y = -0.032;
  rotor.add(capBottom);

  // blade outline: narrow at the root, wider rounded tip
  const LEN = 0.3;
  const shape = new THREE.Shape();
  shape.moveTo(-0.028, 0);
  shape.lineTo(-0.04, LEN - 0.04);
  shape.quadraticCurveTo(-0.042, LEN, 0, LEN + 0.004);
  shape.quadraticCurveTo(0.042, LEN, 0.04, LEN - 0.04);
  shape.lineTo(0.028, 0);
  shape.lineTo(-0.028, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0015, bevelSegments: 2 });
  // UVs from the shape run in metres; scale them to the texture
  const uv = bladeGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8 + 0.5, uv.getY(i) * 3);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 3) * Math.PI * 2;
    rotor.add(arm);
    // blade iron (metal bracket)
    const iron = rbox(0.11, 0.006, 0.022, chrome, 0.003);
    iron.position.set(0.11, -0.008, 0);
    arm.add(iron);
    const blade = new THREE.Mesh(bladeGeo, wood);
    // lay flat, pointing outwards along +x, with ~11° pitch
    blade.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    blade.rotateY(0.19);
    blade.position.set(0.13, -0.01, 0);
    blade.castShadow = true;
    blade.receiveShadow = true;
    arm.add(blade);
  }

  nameAll(group, 'Fan');
  // ceiling fans don't throw a hard shadow in a lit room
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  return { group, rotor };
}

// ---------------------------------------------------------------------------
// modular 2-module plate: rocker switch (left) + step regulator (right)
function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 375;
  const x = c.getContext('2d');
  x.fillStyle = '#2a2c31';
  x.fillRect(0, 0, 400, 375);
  x.strokeStyle = '#3a3d43';
  x.lineWidth = 5;
  x.strokeRect(14, 14, 372, 347);
  // module frames
  x.fillStyle = '#33363c';
  x.fillRect(40, 48, 140, 280);
  x.fillRect(220, 48, 140, 280);
  // labels
  x.fillStyle = '#d9dadc';
  x.font = 'bold 22px Arial, sans-serif';
  x.textAlign = 'center';
  x.fillText('FAN', 110, 312);
  // regulator scale 1..5 around the knob
  const cx = 290;
  const cy = 190;
  for (let i = 1; i <= 5; i++) {
    const a = (-60 + (i - 1) * 30) * (Math.PI / 180) - Math.PI / 2;
    x.fillStyle = '#e6e7e9';
    x.font = 'bold 24px Arial, sans-serif';
    x.fillText(String(i), cx + Math.cos(a) * 92, cy + Math.sin(a) * 92 + 8);
    x.fillRect(cx + Math.cos(a) * 66 - 2, cy + Math.sin(a) * 66 - 2, 4, 4);
  }
  return new THREE.CanvasTexture(c);
}

function createFanSwitch() {
  const group = new THREE.Group();
  // local x along the wall (towards -z), local z out of the wall
  group.rotation.y = Math.PI / 2;
  group.position.set(WALL_X, 0.545, -0.33);
  // dark graphite modular plate so it reads clearly on a light wall
  group.scale.setScalar(1.5);
  const white = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.3, metalness: 0.2 });
  const rockerMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e5, roughness: 0.35 });
  const PW = 0.08;
  const PH = 0.075;
  const plate = rbox(PW, PH, 0.01, white, 0.004);
  plate.position.z = 0.005;
  group.add(plate);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.004, PH - 0.004), new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.35 }));
  face.position.z = 0.0102;
  group.add(face);

  // rocker switch on the left module (pivots up/down)
  const rockerPivot = new THREE.Group();
  rockerPivot.position.set(-PW / 2 + 0.022, 0.004, 0.011);
  const rocker = rbox(0.016, 0.03, 0.006, rockerMat, 0.002);
  rocker.position.z = 0.003;
  rockerPivot.add(rocker);
  group.add(rockerPivot);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.0016, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xff2a1a, emissiveIntensity: 0 })
  );
  led.position.set(-PW / 2 + 0.022, 0.025, 0.0108);
  group.add(led);

  // regulator knob on the right module
  const knob = new THREE.Group();
  knob.position.set(PW / 2 - 0.022, 0.003, 0.011);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.008, 32), new THREE.MeshStandardMaterial({ color: 0xe8e8e5, roughness: 0.4 }));
  dial.rotation.x = Math.PI / 2;
  dial.position.z = 0.004;
  dial.castShadow = true;
  knob.add(dial);
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.009, 0.001), new THREE.MeshStandardMaterial({ color: 0x1d1f23 }));
  pointer.position.set(0, 0.0055, 0.0085);
  knob.add(pointer);
  group.add(knob);

  nameAll(group, 'FanSwitch');
  knob.traverse((o) => o.isMesh && (o.name = 'FanRegulator'));
  return { group, rockerPivot, led, knob };
}

// ---------------------------------------------------------------------------
function createACRemote() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.35 });
  const body = rbox(0.022, 0.009, 0.065, white, 0.004);
  body.position.y = 0.0045;
  group.add(body);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.015, 0.016), new THREE.MeshStandardMaterial({ color: 0x9fb0a0, roughness: 0.3 }));
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.set(0, 0.0092, -0.018);
  group.add(lcd);
  const btn = new THREE.MeshStandardMaterial({ color: 0xc9cbcf, roughness: 0.5 });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const b = rbox(0.004, 0.002, 0.004, btn, 0.001);
      b.position.set((c - 1) * 0.006, 0.0095, 0.002 + r * 0.007);
      group.add(b);
    }
  }
  const power = rbox(0.006, 0.002, 0.004, new THREE.MeshStandardMaterial({ color: 0xd2302b, roughness: 0.4 }), 0.001);
  power.position.set(0, 0.0095, -0.005);
  group.add(power);
  // on the sideboard top, next to the speaker
  group.position.set(1.13, -0.08, -1.04);
  group.rotation.y = 0.5;
  nameAll(group, 'AC');
  return group;
}

// ---------------------------------------------------------------------------
export function createFanSystem(envMap) {
  const group = new THREE.Group();
  const fan = createCeilingFan(envMap);
  // centre of the open floor, in front of the desk
  fan.group.position.set(0.95, 0, 0.12);
  group.add(fan.group);
  const sw = createFanSwitch();
  group.add(sw.group);
  const remote = createACRemote();
  group.add(remote);

  const state = { on: true, level: 3, speed: 0 };
  let last = null;

  const refreshSwitch = () => {
    // Indian-style rocker: ON = bottom half pressed in
    gsap.to(sw.rockerPivot.rotation, { x: state.on ? 0.32 : -0.32, duration: 0.12 });
    // red indicator when on, dark grey when off
    sw.led.material.emissiveIntensity = state.on ? 2.2 : 0;
    sw.led.material.color.set(state.on ? 0xff3b2f : 0x3a3a3a);
    gsap.to(sw.knob.rotation, { z: -(-60 + (state.level - 1) * 30) * (Math.PI / 180), duration: 0.2 });
  };
  refreshSwitch();

  return {
    group,
    remote, // picked up by the hand to work the AC
    toggle() {
      sound.switch();
      state.on = !state.on;
      refreshSwitch();
    },
    stepSpeed() {
      sound.switch();
      state.level = (state.level % 5) + 1;
      refreshSwitch();
    },
    update(t) {
      const dt = last === null ? 0 : Math.min(0.1, t - last);
      last = t;
      const target = state.on ? SPEEDS[state.level] : 0;
      // fans spin up quickly and coast down slowly
      const k = target > state.speed ? 1.4 : 0.45;
      state.speed += (target - state.speed) * Math.min(1, k * dt);
      fan.rotor.rotation.y -= state.speed * dt;
      // a hint of wobble at speed
      fan.rotor.rotation.x = Math.sin(t * 2.1) * 0.006 * (state.speed / 12.8);
      fan.rotor.rotation.z = Math.cos(t * 1.7) * 0.006 * (state.speed / 12.8);
    },
  };
}
