// Room fixtures: a wall-mounted split AC and a sliding glass window with
// curtains that open and close. Both are clickable.
// Coordinates are in the room model's space: left wall at x = -0.274
// (facing +x), back wall at z = -1.199, floor at y = -0.47, ceiling at y = 1.56.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { sound } from './sound.js';

const WALL_X = -0.274;
const reducedAmbientMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function rbox(w, h, d, material, r = 0.003, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function nameAll(obj, name) {
  obj.traverse((o) => {
    if (o.isMesh) o.name = name;
  });
}

// ===========================================================================
// WINDOW + CURTAINS
// ===========================================================================
function moonlitCityTexture() {
  const night = true;
  const W = 700;
  const H = 1120;
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // sky
  const sky = x.createLinearGradient(0, 0, 0, H);
  if (night) {
    sky.addColorStop(0, '#060a1a');
    sky.addColorStop(0.65, '#16203f');
    sky.addColorStop(1, '#2b2b4a');
  } else {
    sky.addColorStop(0, '#6fa6dc');
    sky.addColorStop(0.6, '#b7d4ee');
    sky.addColorStop(1, '#e6eef2');
  }
  x.fillStyle = sky;
  x.fillRect(0, 0, W, H);

  if (night) {
    // stars + moon
    for (let i = 0; i < 140; i++) {
      x.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`;
      x.fillRect(rnd() * W, rnd() * H * 0.55, 1.5, 1.5);
    }
    const moon = x.createRadialGradient(520, 170, 10, 520, 170, 90);
    moon.addColorStop(0, 'rgba(255,250,230,1)');
    moon.addColorStop(0.35, 'rgba(255,250,230,0.95)');
    moon.addColorStop(0.42, 'rgba(255,250,230,0.25)');
    moon.addColorStop(1, 'rgba(255,250,230,0)');
    x.fillStyle = moon;
    x.fillRect(400, 50, 240, 240);
  } else {
    // soft clouds
    for (let i = 0; i < 7; i++) {
      const cx = rnd() * W;
      const cy = 80 + rnd() * 380;
      for (let j = 0; j < 6; j++) {
        const g = x.createRadialGradient(cx + j * 28, cy + Math.sin(j) * 10, 0, cx + j * 28, cy + Math.sin(j) * 10, 60);
        g.addColorStop(0, 'rgba(255,255,255,0.75)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.fillRect(cx + j * 28 - 60, cy - 60, 120, 120);
      }
    }
  }

  // two layers of buildings (far = hazy, near = darker)
  const layer = (baseY, minH, maxH, color, windows) => {
    let bx = -20;
    while (bx < W) {
      const bw = 50 + rnd() * 90;
      const bh = minH + rnd() * (maxH - minH);
      x.fillStyle = color;
      x.fillRect(bx, baseY - bh, bw, bh + 400);
      if (windows) {
        for (let wy = baseY - bh + 14; wy < H; wy += 22) {
          for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) {
            const lit = night ? rnd() < 0.35 : rnd() < 0.08;
            x.fillStyle = lit
              ? night
                ? `rgba(255,${200 + rnd() * 40},${120 + rnd() * 60},0.9)`
                : 'rgba(255,255,255,0.35)'
              : night
              ? 'rgba(0,0,0,0.25)'
              : 'rgba(40,60,80,0.18)';
            x.fillRect(wx, wy, 8, 11);
          }
        }
      }
      bx += bw + 4 + rnd() * 12;
    }
  };
  layer(H * 0.68, 120, 330, night ? '#1d2440' : '#a9bccd', night);
  layer(H * 0.82, 150, 380, night ? '#11152a' : '#7f93a6', true);

  // a tree in the foreground
  const leaves = night ? ['#0b1a12', '#0e2016', '#11261a'] : ['#3f6b3a', '#4f7d45', '#5f8f4f'];
  for (let i = 0; i < 70; i++) {
    x.fillStyle = leaves[i % 3];
    x.beginPath();
    x.arc(60 + rnd() * 240, H * 0.74 + rnd() * 320, 26 + rnd() * 40, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = night ? '#0d0d10' : '#4a3a2c';
  x.fillRect(165, H * 0.9, 22, 200);

  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 16;
  return tex;
}


function linenTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#d8ccb6';
  x.fillRect(0, 0, 256, 256);
  // woven threads
  for (let i = 0; i < 256; i += 2) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    x.fillRect(i, 0, 1, 256);
    x.fillStyle = `rgba(90,70,40,${Math.random() * 0.07})`;
    x.fillRect(0, i, 256, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  return tex;
}

export function createWindow(envMap, { centerZ = -0.875, centerY = 0.55, width = 0.5, height = 0.8 } = {}) {
  const group = new THREE.Group();
  // local x runs along the wall (towards -z), local z comes out of the wall (+x)
  group.rotation.y = Math.PI / 2;
  group.position.set(WALL_X, centerY, centerZ);

  const W = width;
  const H = height;
  const nightTex = moonlitCityTexture();
  const dayTex = new THREE.TextureLoader().load('/textures/window-neighborhood.webp');
  dayTex.encoding = THREE.sRGBEncoding; dayTex.repeat.set(0.5, 1);

  // view outside
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: dayTex, toneMapped: false }));
  outside.position.z = 0.002;
  group.add(outside);
  const eveningView = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: nightTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  eveningView.position.z = 0.0025; group.add(eveningView);

  // dark aluminium frame
  const alu = new THREE.MeshStandardMaterial({ color: 0x3b3e43, metalness: 0.65, roughness: 0.38, envMap, envMapIntensity: 0.8 });
  const T = 0.024;
  const D = 0.04;
  [
    [W + T * 2, T, 0, H / 2 + T / 2],
    [W + T * 2, T, 0, -H / 2 - T / 2],
    [T, H, -W / 2 - T / 2, 0],
    [T, H, W / 2 + T / 2, 0],
  ].forEach(([w, h, px, py]) => {
    const bar = rbox(w, h, D, alu, 0.003);
    bar.position.set(px, py, D / 2);
    group.add(bar);
  });

  // two sliding sashes on separate tracks, each with its own thin frame + glass
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdfe9f0,
    transparent: true,
    opacity: 0.16,
    roughness: 0.03,
    metalness: 0,
    clearcoat: 1,
    envMap,
    envMapIntensity: 1.3,
    depthWrite: false,
  });
  const sashW = W / 2 + 0.012;
  [
    [-W / 4 + 0.006, 0.014],
    [W / 4 - 0.006, 0.026],
  ].forEach(([px, pz]) => {
    const sash = new THREE.Group();
    sash.position.set(px, 0, pz);
    const s = 0.014;
    [
      [sashW, s, 0, H / 2 - s / 2],
      [sashW, s, 0, -H / 2 + s / 2],
      [s, H, -sashW / 2 + s / 2, 0],
      [s, H, sashW / 2 - s / 2, 0],
    ].forEach(([w, h, x, y]) => {
      const b = rbox(w, h, 0.012, alu, 0.002);
      b.position.set(x, y, 0);
      sash.add(b);
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(sashW - 0.02, H - 0.02), glassMat);
    glass.renderOrder = 2;
    sash.add(glass);
    // small handle on the meeting edge
    const handle = rbox(0.006, 0.05, 0.008, alu, 0.002);
    handle.position.set(px < 0 ? sashW / 2 - 0.012 : -sashW / 2 + 0.012, 0, 0.008);
    sash.add(handle);
    group.add(sash);
  });

  // stone sill
  const sill = rbox(W + 0.09, 0.016, 0.065, new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.35, envMap, envMapIntensity: 0.5 }), 0.004);
  sill.position.set(0, -H / 2 - T - 0.008, 0.03);
  group.add(sill);

  nameAll(group, 'Window');

  // ----- curtain rod -----
  const ROD_Y = H / 2 + 0.07;
  const ROD_Z = 0.075;
  const ROD_HALF = W / 2 + 0.04;
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2a28, metalness: 0.8, roughness: 0.35, envMap, envMapIntensity: 0.8 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, ROD_HALF * 2 + 0.03, 16), metal);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, ROD_Y, ROD_Z);
  rod.castShadow = true;
  group.add(rod);
  [-1, 1].forEach((s) => {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), metal);
    fin.position.set(s * (ROD_HALF + 0.02), ROD_Y, ROD_Z);
    group.add(fin);
    const bracket = rbox(0.008, 0.012, ROD_Z, metal, 0.002);
    bracket.position.set(s * (ROD_HALF - 0.01), ROD_Y + 0.004, ROD_Z / 2);
    group.add(bracket);
  });

  // ----- curtains: two panels hanging from the rod -----
  const fabric = new THREE.MeshStandardMaterial({ map: linenTexture(), color: 0xffffff, roughness: 0.92, side: THREE.DoubleSide });
  const DROP = ROD_Y + H / 2 + 0.07; // rod to a little below the sill
  const COLS = 64;
  const ROWS = 10;
  const panels = [-1, 1].map((side) => {
    const geo = new THREE.PlaneGeometry(1, 1, COLS, ROWS);
    const mesh = new THREE.Mesh(geo, fabric);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Curtain';
    group.add(mesh);
    const rings = [];
    for (let i = 0; i < 9; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0014, 6, 16), metal);
      ring.name = 'Curtain';
      group.add(ring);
      rings.push(ring);
    }
    return { side, mesh, geo, rings };
  });

  const state = { open: 1, daylight: 1 }; // 1 = open (gathered at the sides), 0 = closed
  const fullWidth = ROD_HALF; // each panel covers half the rod when closed
  const gathered = 0.075;

  function layoutCurtains(t) {
    panels.forEach(({ side, geo, rings }) => {
      const width = gathered + (fullWidth - gathered) * (1 - state.open);
      const outer = side * ROD_HALF;
      // fewer, softer folds when drawn; tighter, deeper folds when gathered
      const folds = 4.5 + 2.5 * state.open;
      const amp = 0.0035 + 0.011 * state.open;
      const pos = geo.attributes.position;
      for (let r = 0; r <= ROWS; r++) {
        const vv = r / ROWS; // 0 top .. 1 bottom
        for (let cIdx = 0; cIdx <= COLS; cIdx++) {
          const u = cIdx / COLS; // 0 outer edge .. 1 inner edge
          const i = r * (COLS + 1) + cIdx;
          const breeze = Math.sin(t * 1.1 + u * 5 + side) * 0.004 * vv * vv;
          const px = outer - side * u * width + Math.sin(t * 0.8 + vv * 2) * 0.002 * vv;
          const py = ROD_Y - 0.006 - vv * DROP;
          // two mixed waves so the pleats aren't perfectly even
          const a = u * folds * Math.PI * 2;
          const wave = Math.sin(a) + 0.35 * Math.sin(2.3 * a + 1.1 + side);
          const pz = ROD_Z + wave * amp * (1 + vv * 0.3) + breeze + vv * 0.006;
          pos.setXYZ(i, px, py, pz);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      rings.forEach((ring, k) => {
        const u = k / (rings.length - 1);
        ring.position.set(outer - side * u * width, ROD_Y, ROD_Z);
      });
    });
  }
  layoutCurtains(0);

  // daylight coming in through the window
  const daylight = new THREE.PointLight(0xfff1dc, 0.25, 1.6);
  daylight.position.set(0, 0.05, 0.35);
  group.add(daylight);
  let night = false;
  let curtainsOpen = true;
  let lastCurtainUpdate = -Infinity;

  return {
    group,
    toggle() {
      curtainsOpen = !curtainsOpen;
      gsap.to(state, { open: curtainsOpen ? 1 : 0, duration: 1.3, ease: 'sine.inOut', overwrite: true });
    },
    setNight(isNight, immediate = false) {
      night = isNight;
      gsap.to(eveningView.material, { opacity: isNight ? 1 : 0, duration: immediate ? 0 : 1.0, overwrite: true });
      gsap.to(state, { daylight: isNight ? 0 : 1, duration: immediate ? 0 : 1.0, overwrite: 'auto' });
    },
    update(t) {
      const phase = reducedAmbientMotion.matches ? 0 : t;
      if (Math.abs(t - lastCurtainUpdate) > 1 / 24 || phase === 0) { layoutCurtains(phase); lastCurtainUpdate = t; }
      // less light gets in when the curtains are drawn
      daylight.color.set(night ? 0x8b97ff : 0xfff1dc);
      daylight.intensity = (0.08 + 0.17 * state.daylight) * (0.25 + 0.75 * state.open);
    },
  };
}

// ===========================================================================
// SPLIT AC (indoor unit), shaped like a real wall-mounted unit:
// flat back, curved front fascia, underside sloping in to the air outlet,
// a curved horizontal flap and swinging vertical vanes.
// ===========================================================================
function acDisplayTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  const draw = (on, temp) => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 96);
    if (on) {
      // digits glowing through the smoked panel
      x.fillStyle = '#e9f6ff';
      x.shadowColor = '#7fd0ff';
      x.shadowBlur = 14;
      x.font = 'bold 62px "Courier New", monospace';
      x.textBaseline = 'middle';
      x.textAlign = 'center';
      x.fillText(`${temp}`, 92, 50);
      x.font = 'bold 26px Arial, sans-serif';
      x.fillText('°C', 158, 34);
      x.shadowBlur = 6;
      x.fillStyle = '#9be7a8';
      x.beginPath();
      x.arc(214, 60, 5, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#7fd0ff';
      x.beginPath();
      x.arc(236, 60, 5, 0, Math.PI * 2);
      x.fill();
    }
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

// side profile of the unit (y up, z out of the wall), extruded along its width
function acProfile(H, D) {
  const s = new THREE.Shape();
  const top = H / 2;
  const bot = -H / 2;
  s.moveTo(0, bot + 0.01);
  s.lineTo(0, top - 0.008);
  s.quadraticCurveTo(0, top, 0.012, top);
  s.lineTo(D - 0.045, top);
  // rounded top-front edge into a gently convex fascia
  s.bezierCurveTo(D - 0.008, top, D, top - 0.03, D, top - 0.06);
  s.quadraticCurveTo(D + 0.004, bot + 0.07, D - 0.01, bot + 0.045);
  // underside slopes back towards the wall, leaving room for the outlet
  s.lineTo(D - 0.055, bot + 0.012);
  s.quadraticCurveTo(D - 0.07, bot, D - 0.085, bot);
  s.lineTo(0.015, bot);
  s.quadraticCurveTo(0, bot, 0, bot + 0.01);
  return s;
}

export function createAC(envMap, { centerZ = 0.15, centerY = 0.97 } = {}) {
  const group = new THREE.Group();
  group.rotation.y = Math.PI / 2; // local x along the wall, local z out of the wall
  group.position.set(WALL_X, centerY, centerZ);

  const W = 0.62;
  const H = 0.19;
  const D = 0.135;
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xd9d7d2, // soft warm white, so it doesn't wash out under the room light
    roughness: 0.4,
    clearcoat: 0.35,
    clearcoatRoughness: 0.15,
    envMap,
    envMapIntensity: 0.35,
  });
  const endCapMat = new THREE.MeshStandardMaterial({ color: 0xc9c7c2, roughness: 0.45, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: 0.7 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xbdbfbe, roughness: 0.6 });

  // main body
  const bodyGeo = new THREE.ExtrudeGeometry(acProfile(H, D), {
    depth: W - 0.02,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.006,
    bevelSegments: 4,
    curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -(W - 0.02) / 2);
  // profile x (depth) -> local +z, extrusion -> along local x
  bodyGeo.rotateY(-Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, shell);
  body.castShadow = false;
  body.receiveShadow = true;
  group.add(body);

  // slightly darker end caps, inset seam lines like real panels
  [-1, 1].forEach((s) => {
    const capGeo = new THREE.ShapeGeometry(acProfile(H - 0.004, D - 0.004), 16);
    const cap = new THREE.Mesh(capGeo, endCapMat);
    cap.rotation.y = -Math.PI / 2;
    cap.position.x = s * (W / 2 + 0.0003);
    group.add(cap);
  });
  const seam = rbox(W - 0.03, 0.0018, 0.002, grey, 0.0006);
  seam.position.set(0, H / 2 - 0.058, D + 0.006);
  seam.rotation.x = -0.25;
  group.add(seam);

  // top intake grille: fine slits across the top
  for (let i = 0; i < 46; i++) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.0012, D - 0.06), dark);
    slit.position.set(-W / 2 + 0.03 + i * ((W - 0.06) / 45), H / 2 + 0.0105, (D - 0.03) / 2);
    group.add(slit);
  }

  // air outlet recess under the fascia
  const outlet = rbox(W - 0.06, 0.03, 0.045, dark, 0.006);
  outlet.position.set(0, -H / 2 + 0.014, D - 0.07);
  outlet.rotation.x = 0.55;
  group.add(outlet);

  // vertical vanes inside the outlet (swing left/right when running)
  const vanes = [];
  for (let i = 0; i < 14; i++) {
    const vane = rbox(0.0018, 0.018, 0.026, grey, 0.0006);
    vane.position.set(-W / 2 + 0.06 + i * ((W - 0.12) / 13), -H / 2 + 0.013, D - 0.068);
    vane.rotation.x = 0.55;
    group.add(vane);
    vanes.push(vane);
  }

  // curved horizontal flap, hinged at the back edge of the outlet
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, -H / 2 + 0.004, D - 0.088);
  const flapShape = new THREE.Shape();
  flapShape.moveTo(0, 0);
  flapShape.quadraticCurveTo(0.03, -0.006, 0.062, 0.003);
  flapShape.lineTo(0.062, 0.0065);
  flapShape.quadraticCurveTo(0.03, -0.0025, 0, 0.0035);
  flapShape.lineTo(0, 0);
  const flapGeo = new THREE.ExtrudeGeometry(flapShape, { depth: W - 0.075, bevelEnabled: false, curveSegments: 12 });
  flapGeo.translate(0, 0, -(W - 0.075) / 2);
  const flap = new THREE.Mesh(flapGeo, shell);
  flap.rotation.y = -Math.PI / 2; // shape x -> +z (out of the wall), extrusion along x
  flapPivot.add(flap);
  group.add(flapPivot);

  // smoked display window on the fascia, digits glow through it
  const display = acDisplayTexture();
  const smoked = new THREE.Mesh(
    new THREE.PlaneGeometry(0.075, 0.026),
    new THREE.MeshPhysicalMaterial({ color: 0x15171b, roughness: 0.15, clearcoat: 1, envMap, envMapIntensity: 0.8 })
  );
  const FACE = D + 0.0095; // front of the convex fascia (profile + bevel)
  smoked.position.set(W / 2 - 0.09, -H / 2 + 0.075, FACE);
  smoked.rotation.x = -0.12;
  group.add(smoked);
  const digits = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.026),
    new THREE.MeshBasicMaterial({ map: display.tex, transparent: true, depthWrite: false })
  );
  digits.position.set(W / 2 - 0.09, -H / 2 + 0.075, FACE + 0.0007);
  digits.rotation.x = -0.12;
  group.add(digits);
  // small emblem plate (no brand)
  const emblem = rbox(0.04, 0.007, 0.002, grey, 0.002);
  emblem.position.set(0, -H / 2 + 0.08, FACE - 0.0005);
  group.add(emblem);

  // white PVC trunking carrying the pipes out through the wall + drain hose
  const pvc = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5 });
  const duct = rbox(0.12, 0.04, 0.032, pvc, 0.004);
  duct.position.set(-W / 2 - 0.055, -H / 2 + 0.03, 0.017);
  group.add(duct);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.006, 24), pvc);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(-W / 2 - 0.125, -H / 2 + 0.03, 0.003);
  group.add(cap);

  // soft contact shadow on the wall behind the unit (its real shadow is off)
  const sc = document.createElement('canvas');
  sc.width = 256;
  sc.height = 128;
  const sx = sc.getContext('2d');
  sx.filter = 'blur(16px)';
  sx.fillStyle = 'rgba(40,32,22,0.75)';
  sx.fillRect(40, 34, 176, 64);
  const wallShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.3, H + 0.28),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
  );
  wallShadow.position.set(0.015, -0.06, 0.002);
  group.add(wallShadow);

  nameAll(group, 'AC');
  // the room light is close to the ceiling, so its shadow would be huge on the wall
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });

  // cool airflow puffs
  const puffCanvas = document.createElement('canvas');
  puffCanvas.width = puffCanvas.height = 64;
  const pc = puffCanvas.getContext('2d');
  const g = pc.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(220,240,255,0.8)');
  g.addColorStop(1, 'rgba(220,240,255,0)');
  pc.fillStyle = g;
  pc.fillRect(0, 0, 64, 64);
  const puffTex = new THREE.CanvasTexture(puffCanvas);
  const puffs = [];
  for (let i = 0; i < 16; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false, color: 0xd8ecff }));
    sp.userData = { offset: i / 16, lane: (Math.random() - 0.5) * (W - 0.12) };
    group.add(sp);
    puffs.push(sp);
  }

  const state = { on: true, flow: 1 };
  display.draw(true, 24);
  const reflections = new Map();
  group.traverse((object) => {
    const material = object.material;
    if (material?.envMap && !reflections.has(material)) reflections.set(material, material.envMapIntensity);
  });

  return {
    group,
    setNight(night, immediate = false) {
      reflections.forEach((dayIntensity, material) => gsap.to(material, { envMapIntensity: night ? dayIntensity * 0.15 : dayIntensity, duration: immediate ? 0 : 0.8, overwrite: true }));
    },
    toggle() {
      state.on = !state.on;
      sound.acBeep(state.on);
      display.draw(state.on, 24);
      gsap.to(state, { flow: state.on ? 1 : 0, duration: 1.4, ease: 'power2.inOut' });
    },
    update(t) {
      // flap opens down and breathes slightly; vanes swing side to side
      flapPivot.rotation.x = state.flow * (0.9 + Math.sin(t * 0.45) * 0.15);
      const swing = Math.sin(t * 0.6) * 0.45 * state.flow;
      vanes.forEach((v) => (v.rotation.y = swing));
      const LIFE = 2.6;
      puffs.forEach((p) => {
        const life = (((t / LIFE + p.userData.offset) % 1) + 1) % 1;
        p.position.set(p.userData.lane + swing * 0.08 * life, -H / 2 - 0.01 - life * 0.12, D - 0.02 + life * 0.15);
        const s = 0.03 + life * 0.07;
        p.scale.set(s * 1.6, s, 1);
        p.material.opacity = state.flow * Math.sin(life * Math.PI) * 0.1;
      });
    },
  };
}

// ===========================================================================
// LED TUBE LIGHT (batten) on the back wall, above the framed projects.
// It is the room's main light: on = bright room, off = dark room.
// ===========================================================================
export function createTubeLight(envMap, { x = 0.98, y = 1.36, length = 0.95 } = {}) {
  const BACK = -1.199;
  const group = new THREE.Group();
  group.position.set(x, y, BACK);

  const alu = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.35, metalness: 0.3, envMap, envMapIntensity: 0.5 });
  // mounting batten against the wall
  const batten = rbox(length + 0.03, 0.04, 0.026, alu, 0.008);
  batten.position.z = 0.013;
  group.add(batten);
  // end caps
  [-1, 1].forEach((s) => {
    const cap = rbox(0.026, 0.05, 0.044, new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.4 }), 0.008);
    cap.position.set(s * (length / 2 + 0.01), 0, 0.024);
    group.add(cap);
  });
  // frosted diffuser tube that glows
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    emissive: 0xfff2dc,
    emissiveIntensity: 1.6,
  });
  const tube = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, length - 0.04, 6, 24), tubeMat);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, -0.006, 0.036);
  group.add(tube);

  // a soft glow on the wall around the tube
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 64;
  const g = glowCanvas.getContext('2d');
  const grad = g.createRadialGradient(128, 32, 4, 128, 32, 128);
  grad.addColorStop(0, 'rgba(235,244,255,0.9)');
  grad.addColorStop(1, 'rgba(235,244,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 64);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(length * 1.8, 0.42),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, opacity: 0.55 })
  );
  glow.position.z = 0.002;
  group.add(glow);

  // the light it throws into the room (no shadows, the main room light does those)
  const light = new THREE.PointLight(0xfff2dc, 0.35, 4, 1.3);
  light.position.set(0, -0.12, 0.35);
  group.add(light);

  nameAll(group, 'TubeLight');
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });

  const state = { on: 1 };
  const apply = () => {
    tubeMat.emissiveIntensity = 1.6 * state.on;
    tubeMat.color.setScalar(0.75 + 0.25 * state.on);
    glow.material.opacity = 0.55 * state.on;
    light.intensity = 0.35 * state.on;
  };
  apply();

  return {
    group,
    setOn(on, immediate = false) {
      gsap.to(state, { on: on ? 1 : 0, duration: immediate ? 0 : 0.45, ease: 'sine.inOut', onUpdate: apply, overwrite: true });
    },
  };
}
