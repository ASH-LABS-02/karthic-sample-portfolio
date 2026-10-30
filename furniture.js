import { PROFILE } from './profile.js';
// Furniture and everyday objects so the room feels lived-in:
// office chair, rug, walnut sideboard with decor, floor lamp, tall snake plant,
// backpack and a waste bin. Coordinates are in the room model's space
// (floor y = -0.47, left wall x = -0.274, back wall z = -1.199).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { showReader } from './books.js';
import { SHELF_COLLECTIONS, SHELF_STACK, SIDEBOARD_BOOKS } from './library.js';
import { createLibraryBook } from './book-design.js';
import { sound } from './sound.js';
import { RoomNavigation } from './navigation.js';
import { reducedMotion } from './interface.js';
import { NIGHT_LOOK } from './night-look.js';

const FLOOR = -0.47;
const BACK = -1.199;

function rbox(w, h, d, material, r = 0.004, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function mesh(geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function nameAll(obj, name) {
  obj.traverse((o) => o.isMesh && (o.name = name));
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}
// grainy fabric / material noise
function noise(x, w, h, amount, light = 255, dark = 0) {
  const img = x.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] = Math.max(dark, Math.min(light, img.data[i] + n));
    img.data[i + 1] = Math.max(dark, Math.min(light, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(dark, Math.min(light, img.data[i + 2] + n));
  }
  x.putImageData(img, 0, 0);
}

// ===========================================================================
// OFFICE CHAIR (front faces local -x)
// ===========================================================================
function createChair(envMap) {
  const group = new THREE.Group();
  const fabricTex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#454a43';
    x.fillRect(0, 0, w, h);
    noise(x, w, h, 16);
  }, [3, 3]);
  const fabric = new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.95 });
  const mesh3 = new THREE.MeshStandardMaterial({ map: fabricTex, color: 0xaaaaaa, roughness: 0.92 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.45 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8cbd0, metalness: 0.95, roughness: 0.18, envMap, envMapIntensity: 1 });

  // 5-star base with casters
  const base = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = rbox(0.2, 0.018, 0.03, plastic, 0.008);
    leg.position.set(Math.cos(a) * 0.1, FLOOR + 0.045, Math.sin(a) * 0.1);
    leg.rotation.y = -a;
    leg.rotation.z = 0.08;
    base.add(leg);
    const caster = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 16), plastic);
    caster.rotation.x = Math.PI / 2;
    caster.rotation.y = -a;
    caster.position.set(Math.cos(a) * 0.19, FLOOR + 0.016, Math.sin(a) * 0.19);
    base.add(caster);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 20), plastic);
  hub.position.y = FLOOR + 0.06;
  base.add(hub);
  group.add(base);

  // everything above the gas lift turns (for the spin)
  const top = new THREE.Group();
  group.add(top);
  const lift = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 16), chrome);
  lift.position.y = FLOOR + 0.15;
  top.add(lift);
  const liftCover = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.08, 16), plastic);
  liftCover.position.y = FLOOR + 0.11;
  top.add(liftCover);

  const SEAT_Y = FLOOR + 0.29;
  const mech = rbox(0.12, 0.03, 0.12, plastic, 0.006);
  mech.position.y = SEAT_Y - 0.045;
  top.add(mech);
  const seat = rbox(0.3, 0.06, 0.32, fabric, 0.025, 5);
  seat.position.y = SEAT_Y;
  top.add(seat);
  const seatShell = rbox(0.29, 0.02, 0.31, plastic, 0.008);
  seatShell.position.y = SEAT_Y - 0.035;
  top.add(seatShell);

  // backrest: mesh panel in a frame, reclined slightly
  const back = new THREE.Group();
  back.position.set(0.15, SEAT_Y + 0.03, 0);
  back.rotation.z = 0.16;
  top.add(back);
  const spine = rbox(0.03, 0.12, 0.06, plastic, 0.01);
  spine.position.set(0.015, 0.03, 0);
  back.add(spine);
  const frame = rbox(0.035, 0.44, 0.31, plastic, 0.03, 5);
  frame.position.set(0.02, 0.29, 0);
  back.add(frame);
  const panel = rbox(0.04, 0.4, 0.27, mesh3, 0.03, 5);
  panel.position.set(0.012, 0.29, 0);
  back.add(panel);
  const lumbar = rbox(0.03, 0.07, 0.24, fabric, 0.015);
  lumbar.position.set(-0.004, 0.17, 0);
  back.add(lumbar);
  const head = rbox(0.04, 0.09, 0.2, fabric, 0.02, 4);
  head.position.set(0.03, 0.56, 0);
  back.add(head);
  const headPost = rbox(0.015, 0.06, 0.03, plastic, 0.005);
  headPost.position.set(0.035, 0.5, 0);
  back.add(headPost);

  // armrests
  [-1, 1].forEach((s) => {
    const post = rbox(0.03, 0.15, 0.025, plastic, 0.008);
    post.position.set(0.04, SEAT_Y + 0.07, s * 0.17);
    top.add(post);
    const pad = rbox(0.17, 0.022, 0.05, fabric, 0.01);
    pad.position.set(0.0, SEAT_Y + 0.15, s * 0.175);
    top.add(pad);
  });

  nameAll(group, 'Chair');
  return { group, top };
}

// ===========================================================================
// RUG
// ===========================================================================
function createRug() {
  const tex = canvasTex(1024, 1200, (x, w, h) => {
    x.fillStyle = '#cfc6b6';
    x.fillRect(0, 0, w, h);
    // border bands
    x.strokeStyle = '#3c3f44';
    x.lineWidth = 22;
    x.strokeRect(46, 46, w - 92, h - 92);
    x.strokeStyle = '#9a8b74';
    x.lineWidth = 8;
    x.strokeRect(92, 92, w - 184, h - 184);
    // a quiet geometric field
    x.strokeStyle = 'rgba(60,63,68,0.55)';
    x.lineWidth = 5;
    for (let gy = 160; gy < h - 140; gy += 110) {
      for (let gx = 150; gx < w - 140; gx += 110) {
        x.beginPath();
        x.moveTo(gx, gy + 40);
        x.lineTo(gx + 40, gy);
        x.lineTo(gx + 80, gy + 40);
        x.stroke();
      }
    }
    // woven texture
    for (let i = 0; i < h; i += 3) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      x.fillRect(0, i, w, 1);
    }
    noise(x, w, h, 22);
  });
  const weave = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#949494';
    for (let i = 0; i < w; i += 4) { x.fillRect(i, 0, 1, h); x.fillRect(0, i, w, 1); }
  }, [12, 14]);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.25), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, bumpMap: weave, bumpScale: 0.00045 }));
  rug.rotation.x = -Math.PI / 2;
  rug.receiveShadow = true;
  const group = new THREE.Group();
  group.add(rug);
  // tasselled fringe on the short ends
  const fringeMat = new THREE.MeshStandardMaterial({ color: 0xe2dccf, roughness: 1 });
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 46; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0015, 0.025), fringeMat);
      f.position.set(-0.5 + i * (1 / 45), 0.0008, s * (0.625 + 0.012));
      f.rotation.y = (Math.random() - 0.5) * 0.4;
      f.receiveShadow = true;
      group.add(f);
    }
  });
  return group;
}

// ===========================================================================
// SIDEBOARD (against the back wall, under the framed projects)
// ===========================================================================
function createSideboard(envMap) {
  const group = new THREE.Group();
  const walnut = canvasTex(512, 256, (x, w, h) => {
    // walnut: mostly straight, fine grain with gentle drift
    x.fillStyle = '#5b3d2a';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const dark = Math.random() < 0.6;
      x.strokeStyle = dark
        ? `rgba(35,20,10,${0.08 + Math.random() * 0.14})`
        : `rgba(140,95,60,${0.06 + Math.random() * 0.1})`;
      x.lineWidth = 0.6 + Math.random() * 1.6;
      x.beginPath();
      const y0 = Math.random() * h;
      const drift = (Math.random() - 0.5) * 6;
      x.moveTo(0, y0);
      for (let px = 0; px <= w; px += 16) x.lineTo(px, y0 + Math.sin(px * 0.006 + i) * 2 + (px / w) * drift);
      x.stroke();
    }
    noise(x, w, h, 8);
  });
  const wood = new THREE.MeshStandardMaterial({ map: walnut, roughness: 0.55, envMap, envMapIntensity: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.7, roughness: 0.35, envMap, envMapIntensity: 0.6 });

  const L = 0.92;
  const H = 0.32;
  const D = 0.22;
  const LEG = 0.07;
  const cab = rbox(L, H, D, wood, 0.006);
  cab.position.y = FLOOR + LEG + H / 2;
  group.add(cab);
  // three doors with slim handles + a shadow gap between them
  for (let i = 0; i < 3; i++) {
    const door = rbox(L / 3 - 0.008, H - 0.03, 0.006, wood, 0.002);
    door.position.set(-L / 3 + i * (L / 3), FLOOR + LEG + H / 2, D / 2 + 0.002);
    group.add(door);
    const handle = rbox(0.06, 0.006, 0.01, black, 0.002);
    handle.position.set(-L / 3 + i * (L / 3), FLOOR + LEG + H - 0.04, D / 2 + 0.008);
    group.add(handle);
  }
  // tapered metal legs
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    const leg = mesh(new THREE.CylinderGeometry(0.008, 0.005, LEG, 10), black);
    leg.position.set(sx * (L / 2 - 0.04), FLOOR + LEG / 2, sz * (D / 2 - 0.035));
    group.add(leg);
  });

  const TOP = FLOOR + LEG + H;
  // stacked books
  SIDEBOARD_BOOKS.forEach((info, i) => {
    const b = createLibraryBook(info, 0.022, 0.16 - i * 0.01, 0.12 - i * 0.006, { interactive: false, laidFlat: true });
    b.position.set(-0.3, TOP + 0.011 + i * 0.022, 0.005);
    b.rotation.y = (i % 2 ? 0.08 : -0.05) + i * 0.02;
    group.add(b);
  });
  // small succulent in a concrete pot on the books
  const pot = mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.045, 20), new THREE.MeshStandardMaterial({ color: 0xa8a49c, roughness: 0.9 }));
  pot.position.set(-0.3, TOP + 0.088 + 0.0225, 0.005);
  group.add(pot);
  const succ = new THREE.MeshStandardMaterial({ color: 0x6f9a6a, roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const leaf = mesh(new THREE.SphereGeometry(0.013, 10, 8), succ);
    const a = (i / 9) * Math.PI * 2;
    leaf.scale.set(0.6, 0.35, 1.3);
    leaf.position.set(-0.3 + Math.cos(a) * 0.014, TOP + 0.138, 0.005 + Math.sin(a) * 0.014);
    leaf.rotation.y = -a;
    leaf.rotation.x = 0.5;
    group.add(leaf);
  }
  // fabric bluetooth speaker
  const spk = rbox(0.11, 0.07, 0.05, new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.95 }), 0.02, 4);
  spk.position.set(0.02, TOP + 0.035, 0.0);
  group.add(spk);
  const spkLed = mesh(new THREE.SphereGeometry(0.002, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9ad0ff, emissiveIntensity: 1.5 }));
  spkLed.position.set(0.05, TOP + 0.06, 0.026);
  group.add(spkLed);
  // candle in a glass
  const candleGlass = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, envMap, envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false }));
  candleGlass.position.set(0.16, TOP + 0.025, 0.04);
  group.add(candleGlass);
  const wax = mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0xf1ebdd, roughness: 0.6 }));
  wax.position.set(0.16, TOP + 0.015, 0.04);
  group.add(wax);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc46b }));
  flame.userData.dynamic = true; // flickers, so it isn't merged
  flame.scale.set(1, 2.2, 1);
  flame.position.set(0.16, TOP + 0.039, 0.04);
  group.add(flame);
  // leaning photo frame
  const pf = new THREE.Group();
  // A neutral avatar fills the editable photo frame.
  const pframe = rbox(0.135, 0.165, 0.01, new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 }), 0.003);
  pf.add(pframe);
  const photoTex = new THREE.TextureLoader().load(PROFILE.avatar);
  photoTex.anisotropy = 8;
  // unlit so the room lighting doesn't wash the face out
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.121, 0.151), new THREE.MeshBasicMaterial({ map: photoTex, toneMapped: false }));
  pic.position.z = 0.0053;
  pic.userData.dynamic = true;
  pf.add(pic);
  pf.position.set(0.33, TOP + 0.08, -0.035);
  pf.rotation.x = -0.12;
  pf.rotation.y = -0.25;
  group.add(pf);

  group.position.set(1.0, 0, BACK + D / 2 + 0.01);
  nameAll(group, 'Sideboard');
  return { group, flame };
}

// ===========================================================================
// FLOOR LAMP
// ===========================================================================
function createFloorLamp(envMap) {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8964f, metalness: 0.9, roughness: 0.3, envMap, envMapIntensity: 1 });
  const base = mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.015, 32), brass);
  base.position.y = FLOOR + 0.0075;
  group.add(base);
  const pole = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.95, 12), brass);
  pole.position.y = FLOOR + 0.48;
  group.add(pole);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf1e7d4, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffc98a, emissiveIntensity: 0 });
  const shade = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.13, 40, 1, true), shadeMat);
  shade.position.y = FLOOR + 0.98;
  group.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
  bulb.position.y = FLOOR + 0.96;
  group.add(bulb);
  const light = new THREE.PointLight(0xffc98a, 0, 1.4, 1.6);
  light.position.y = FLOOR + 0.95;
  group.add(light);
  group.position.set(0.43, 0, BACK + 0.13);
  nameAll(group, 'Lamp');
  return { group, light, shadeMat, bulb };
}

// ===========================================================================
// TALL SNAKE PLANT
// ===========================================================================
function createSnakePlant() {
  const group = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.55 });
  const pot = mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.16, 32), potMat);
  pot.position.y = FLOOR + 0.08;
  group.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = FLOOR + 0.15;
  group.add(soil);
  // leaf texture: dark green bands with yellow margins
  const leafTex = canvasTex(64, 256, (x, w, h) => {
    x.fillStyle = '#2f5a35';
    x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10 + Math.random() * 8) {
      x.fillStyle = `rgba(150,190,130,${0.15 + Math.random() * 0.2})`;
      x.fillRect(0, y, w, 3 + Math.random() * 4);
    }
    x.fillStyle = '#a99d4e';
    x.fillRect(0, 0, 3, h);
    x.fillRect(w - 3, 0, 3, h);
  });
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.5, side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) {
    const hgt = 0.32 + Math.random() * 0.25;
    const wid = 0.035 + Math.random() * 0.015;
    // tapered, slightly cupped blade
    const geo = new THREE.PlaneGeometry(wid, hgt, 4, 10);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) / hgt + 0.5; // 0..1
      const x = p.getX(k);
      p.setX(k, x * (1 - y * y * 0.92));
      p.setZ(k, Math.abs(x) * 0.6 - y * y * 0.02);
    }
    geo.translate(0, hgt / 2, 0);
    geo.computeVertexNormals();
    const leaf = mesh(geo, leafMat);
    const a = (i / 11) * Math.PI * 2 + Math.random() * 0.4;
    const r = 0.01 + Math.random() * 0.035;
    leaf.position.set(Math.cos(a) * r, FLOOR + 0.15, Math.sin(a) * r);
    leaf.rotation.y = a + Math.PI / 2 + (Math.random() - 0.5);
    leaf.rotation.z = Math.cos(a) * (0.08 + Math.random() * 0.12);
    leaf.rotation.x = Math.sin(a) * (0.08 + Math.random() * 0.12);
    group.add(leaf);
  }
  group.position.set(1.62, 0, BACK + 0.12);
  return group;
}

// ===========================================================================
// BACKPACK + WASTE BIN
// ===========================================================================
function createBackpack() {
  const group = new THREE.Group();
  const tex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#3d4a3f';
    x.fillRect(0, 0, w, h);
    noise(x, w, h, 24);
  }, [2, 2]);
  const nylon = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1d1f1e, roughness: 0.7 });
  const body = rbox(0.1, 0.26, 0.18, nylon, 0.045, 5);
  body.position.y = 0.13;
  group.add(body);
  const pocket = rbox(0.04, 0.12, 0.14, nylon, 0.02, 4);
  pocket.position.set(-0.055, 0.08, 0);
  group.add(pocket);
  const zip = rbox(0.004, 0.004, 0.12, trim, 0.001);
  zip.position.set(-0.076, 0.14, 0);
  group.add(zip);
  const handle = mesh(new THREE.TorusGeometry(0.02, 0.004, 8, 16, Math.PI), trim);
  handle.position.set(0.0, 0.258, 0);
  handle.rotation.y = Math.PI / 2;
  group.add(handle);
  [-0.05, 0.05].forEach((z) => {
    const strap = rbox(0.012, 0.22, 0.035, trim, 0.005);
    strap.position.set(0.055, 0.13, z);
    group.add(strap);
  });
  group.rotation.z = -0.22; // leaning back against the desk leg
  group.rotation.y = 0.3;
  group.position.set(0.31, FLOOR, -0.31);
  return group;
}

function createWasteBin() {
  const group = new THREE.Group();
  const bin = mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.15, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })
  );
  bin.position.y = FLOOR + 0.075;
  group.add(bin);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), bin.material);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = FLOOR + 0.002;
  group.add(bottom);
  // crumpled paper balls
  const paper = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.9, flatShading: true });
  [[0, 0.13, 0], [0.025, 0.12, 0.02], [-0.02, 0.125, -0.02]].forEach(([x, y, z]) => {
    const g = new THREE.IcosahedronGeometry(0.022, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + Math.random() * 0.4), p.getY(i) * (0.8 + Math.random() * 0.4), p.getZ(i) * (0.8 + Math.random() * 0.4));
    g.computeVertexNormals();
    const ball = mesh(g, paper);
    ball.position.set(x, FLOOR + y, z);
    group.add(ball);
  });
  // one that missed
  const miss = mesh(new THREE.IcosahedronGeometry(0.02, 1), paper);
  miss.position.set(0.11, FLOOR + 0.018, 0.05);
  group.add(miss);
  group.position.set(0.12, 0, 0.5);
  return group;
}

// ===========================================================================
// BOOKSHELF (against the far side wall, z = 2.3)
// ===========================================================================
function createBookshelf(envMap) {
  const group = new THREE.Group();
  group.name = 'ReferenceLibrary';
  const titledBooks = [];
  const oak = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.6, envMap, envMapIntensity: 0.3 });
  const W = 0.62;
  const H = 1.25;
  const D = 0.2;
  const t = 0.018;
  const piece = (w, h, d, x, y, z) => {
    const m = rbox(w, h, d, oak, 0.003);
    m.position.set(x, y, z);
    group.add(m);
  };
  piece(t, H, D, -W / 2 + t / 2, H / 2, 0);
  piece(t, H, D, W / 2 - t / 2, H / 2, 0);
  piece(W, t, D, 0, H - t / 2, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: 0x5f4630, roughness: 0.8 }));
  back.position.set(0, H / 2, -D / 2 + 0.002);
  group.add(back);
  const shelves = 5;
  const gap = (H - t) / shelves;
  for (let i = 0; i < shelves; i++) {
    const y = i * gap;
    piece(W - 2 * t, t, D, 0, y + t / 2, 0);
    const collection = SHELF_COLLECTIONS[i];
    const start = -W / 2 + t + 0.01;
    const end = W / 2 - t - (i % 2 ? 0.14 : 0.018);
    const spacing = 0.0018;
    const weights = collection.map((_, j) => 19 + (i * 17 + j * 11) % 18);
    const total = weights.reduce((sum, value) => sum + value, 0);
    const available = end - start - spacing * (collection.length - 1);
    let x = start;
    collection.forEach((info, j) => {
      const bw = available * weights[j] / total;
      const bh = gap * (0.72 + ((j * 7 + i * 3) % 15) / 100);
      const bd = D * (0.79 + ((j * 3 + i) % 8) / 100);
      const book = createLibraryBook(info, bw, bh, bd);
      book.position.set(x + bw / 2, y + t + bh / 2, -D / 2 + bd / 2 + 0.01);
      book.userData.home = book.position.clone();
      group.add(book);
      titledBooks.push(book);
      x += bw + spacing;
    });
    if (i % 2) {
      // small decor on alternate shelves: a plant or a stacked pile
      if (i === 1) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.5 }));
        pot.position.set(W / 2 - t - 0.06, y + t + 0.025, 0);
        pot.castShadow = true;
        group.add(pot);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8a4a, roughness: 0.6 });
        for (let j = 0; j < 7; j++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), leafMat);
          const a = (j / 7) * Math.PI * 2;
          leaf.scale.set(0.5, 1, 0.5);
          leaf.position.set(W / 2 - t - 0.06 + Math.cos(a) * 0.015, y + t + 0.07, Math.sin(a) * 0.015);
          leaf.rotation.z = Math.cos(a) * 0.5;
          leaf.rotation.x = Math.sin(a) * 0.5;
          group.add(leaf);
        }
      } else {
        SHELF_STACK.forEach((info, j) => {
          const b = createLibraryBook(info, 0.02, 0.11 - j * 0.01, 0.15 - j * 0.01, { interactive: false, laidFlat: true });
          b.position.set(W / 2 - t - 0.065, y + t + 0.01 + j * 0.02, 0);
          b.rotation.y = j * 0.15;
          group.add(b);
        });
      }
    }
  }
  group.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  // back against the side wall, facing into the room
  group.rotation.y = Math.PI;
  group.position.set(0.95, FLOOR, 2.3 - D / 2 - 0.005);
  return { group, titledBooks };
}

// floor bean bag in the corner by the bookshelf
function createBeanBag() {
  const tex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#8c5a3c';
    x.fillRect(0, 0, w, h);
    noise(x, w, h, 16);
  }, [3, 3]);
  const geo = new THREE.SphereGeometry(0.2, 40, 24);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i);
    // squashed, with a dent where you'd sit
    const r = Math.hypot(p.getX(i), p.getZ(i));
    y = y < 0 ? y * 0.45 : y * 0.7 - Math.max(0, 0.08 - r * 0.4);
    p.setY(i, y);
  }
  geo.computeVertexNormals();
  const bag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  bag.castShadow = true;
  bag.receiveShadow = true;
  bag.position.set(1.55, FLOOR + 0.09, 1.95);
  return bag;
}

// ===========================================================================
export function createFurniture(envMap) {
  const group = new THREE.Group();

  const rug = createRug();
  rug.position.set(0.84, FLOOR + 0.001, 0.18); // starts just in front of the desk
  group.add(rug);

  const chair = createChair(envMap);
  // pushed back from the desk and turned, as if someone just got up
  chair.group.position.set(0.56, 0, 1.02);
  chair.group.userData.dynamic = true; // spins and rolls
  chair.top.rotation.y = -0.75;
  group.add(chair.group);

  const sideboard = createSideboard(envMap);
  group.add(sideboard.group);

  const lamp = createFloorLamp(envMap);
  group.add(lamp.group);

  group.add(createSnakePlant());
  group.add(createBackpack());
  group.add(createWasteBin());
  const shelf = createBookshelf(envMap);
  group.add(shelf.group);
  let openBook = null;
  let hoverBook = null;
  group.add(createBeanBag());

  const state = { lamp: 0, lampOn: false, night: false };
  const setLamp = (on, immediate = false) => {
    state.lampOn = on;
    gsap.to(state, { lamp: on ? 1 : 0, duration: immediate ? 0 : 0.5, overwrite: true });
  };
  let spinning = false;
  let rollSide = 1;
  let onChairMoved = () => {};
  const chairSpace = new RoomNavigation();
  chairSpace.margin = 0.18;
  chairSpace.circles.shift(); // the chair must not collide with its own obstacle
  chairSpace.bounds = { x0: 0.05, x1: 1.7, z0: -0.9, z1: 2.05 };
  const lastChairPosition = chair.group.position.clone();
  let vacuumCircle = null;
  const settleChair = () => {
    const p = chair.group.position, dx = p.x - lastChairPosition.x, dz = p.z - lastChairPosition.z;
    p.x = lastChairPosition.x; p.z = lastChairPosition.z;
    chairSpace.move(p, dx, dz);
    lastChairPosition.copy(p);
    onChairMoved(p);
  };

  return {
    group,
    setVacuumPosition(x, z, radius) {
      // Match the .24m chair footprint used by the robot's route planner.
      const clearance = radius + .24 + .012 - chairSpace.margin;
      if (!vacuumCircle) { vacuumCircle = [x, z, clearance]; chairSpace.circles.push(vacuumCircle); }
      else { vacuumCircle[0] = x; vacuumCircle[1] = z; vacuumCircle[2] = clearance; }
    },
    // pull a titled book off the shelf and open it; onClosed runs when it's back
    openShelfBook(hitObject, onClosed) {
      const book = hitObject.userData.book;
      if (!book || openBook) return;
      openBook = book;
      this.resetShelfBookHover(book);
      book.userData.setReadingDetail(true);
      hoverBook = null;
      const { home } = book.userData;
      // slide out (local +z is out of the shelf), tilt, then open the reader
      gsap.to(book.position, { z: home.z + 0.14, y: home.y + 0.035, duration: 0.55, ease: 'power2.out' });
      gsap.to(book.rotation, { x: -0.08, duration: 0.55, ease: 'power2.out' });
      gsap.delayedCall(0.5, () =>
        showReader(book.userData.info, () => {
          gsap.to(book.rotation, { x: 0, duration: 0.45 });
          gsap.to(book.position, { z: home.z, y: home.y, duration: 0.6, ease: 'power2.inOut', onComplete: () => {
            openBook = null; book.userData.setReadingDetail(false); onClosed?.();
          } });
        })
      );
    },
    resetShelfBookHover(book) {
      for (const item of new Set([hoverBook, book])) {
        if (!item) continue;
        gsap.killTweensOf(item.position);
        if (item !== book) item.position.copy(item.userData.home);
      }
      hoverBook = null;
    },
    // a titled book slides out a little when the pointer is over it
    hoverShelfBook(hitObject) {
      const book = hitObject && hitObject.userData.book;
      if (book === hoverBook || openBook) return;
      if (hoverBook) gsap.to(hoverBook.position, { z: hoverBook.userData.home.z, duration: 0.25 });
      hoverBook = book || null;
      if (hoverBook) gsap.to(hoverBook.position, { z: hoverBook.userData.home.z + 0.025, duration: 0.25 });
    },
    spinChair() {
      if (spinning) return;
      sound.chairRoll();
      spinning = true;
      // roll a little on its castors while it spins (alternating direction)
      rollSide = -rollSide;
      const p = chair.group.position;
      gsap.to(p, { x: p.x + rollSide * 0.07, z: p.z + rollSide * 0.04, duration: reducedMotion.matches ? 0 : 1.6, ease: 'power2.out', onUpdate: settleChair, overwrite: true });
      gsap.to(chair.top.rotation, {
        y: chair.top.rotation.y + Math.PI * 2,
        duration: reducedMotion.matches ? 0 : 1.8,
        ease: 'power3.out',
        onComplete: () => (spinning = false),
      });
    },
    // drag support: the chair's group (local room space) and a way to move it
    chairGroup: chair.group,
    moveChair(x, z) {
      gsap.to(chair.group.position, {
        x, z, duration: reducedMotion.matches ? 0 : 0.12, ease: 'power2.out', overwrite: true,
        onUpdate: settleChair,
      });
    },
    set onChairMove(fn) {
      onChairMoved = fn;
    },
    toggleLamp() {
      sound.switch();
      setLamp(!state.lampOn);
    },
    setNight(isNight, immediate = false) {
      state.night = isNight;
      lamp.light.color.set(isNight ? NIGHT_LOOK.lampColor : 0xffc98a);
      lamp.shadeMat.emissive.set(isNight ? NIGHT_LOOK.lampEmission : 0xffc98a);
      setLamp(isNight, immediate);
    },
    update(t) {
      lamp.light.intensity = state.lamp * (state.night ? NIGHT_LOOK.lampIntensity : 0.5);
      lamp.shadeMat.emissiveIntensity = state.lamp * 0.55;
      lamp.bulb.material.color.setRGB(1, 0.94 * (0.5 + 0.5 * state.lamp), 0.84 * (0.4 + 0.6 * state.lamp));
      // candle flicker
      const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
      sideboard.flame.scale.set(f, 2.2 * f, f);
    },
  };
}
