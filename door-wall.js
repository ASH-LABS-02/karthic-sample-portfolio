// Inside face of the entrance wall (x = 1.95, facing into the room, -x):
// right of the door: coat rack with hoodie/cap/headphones, shoe rack, real mirror
// left of the door: live calendar, key holder, code poster
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const WALL_X = 1.95;
const FLOOR = -0.47;

function rbox(w, h, d, material, r = 0.003, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}
// local x runs along the wall (towards +z, i.e. to the right seen from inside),
// local z comes out of the wall into the room
function onWall(obj, z, y) {
  obj.rotation.y = -Math.PI / 2;
  obj.position.set(WALL_X, y, z);
  return obj;
}

// ---------------------------------------------------------------------------
function createCoatRack() {
  const g = new THREE.Group();
  const walnut = new THREE.MeshStandardMaterial({ color: 0x5e3f2a, roughness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8964f, metalness: 0.9, roughness: 0.3 });
  const L = 0.42;
  const board = rbox(L, 0.06, 0.016, walnut, 0.004);
  board.position.z = 0.008;
  g.add(board);
  const hookX = [-0.15, -0.05, 0.05, 0.15];
  hookX.forEach((x) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 10), brass);
    stem.rotation.x = Math.PI / 2;
    stem.position.set(x, -0.005, 0.034);
    g.add(stem);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 10), brass);
    tip.position.set(x, 0.0, 0.054);
    g.add(tip);
  });

  // hoodie hanging from the 2nd hook
  const fabric = (() => {
    const t = canvasTex(128, 128, (x, w, h) => {
      x.fillStyle = '#1f7a78'; // teal
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 2500; i++) {
        x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`;
        x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  })();
  const hoodie = new THREE.Group();
  hoodie.position.set(-0.05, -0.02, 0.04);
  const hood = rbox(0.09, 0.08, 0.05, fabric, 0.03, 4);
  hood.position.set(0, -0.03, 0.0);
  hoodie.add(hood);
  const torso = rbox(0.2, 0.3, 0.05, fabric, 0.03, 4);
  torso.position.set(0, -0.2, -0.005);
  torso.rotation.x = 0.05;
  hoodie.add(torso);
  [-1, 1].forEach((s) => {
    const sleeve = rbox(0.05, 0.27, 0.045, fabric, 0.02, 4);
    sleeve.position.set(s * 0.1, -0.21, 0.004);
    sleeve.rotation.z = s * 0.06;
    hoodie.add(sleeve);
  });
  const pocket = rbox(0.12, 0.06, 0.006, new THREE.MeshStandardMaterial({ color: 0x17615f, roughness: 0.95 }), 0.01);
  pocket.position.set(0, -0.28, 0.024);
  hoodie.add(pocket);
  // drawstrings
  [-0.018, 0.018].forEach((x) => {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0xe8e6e0 }));
    str.position.set(x, -0.1, 0.028);
    hoodie.add(str);
  });
  g.add(hoodie);

  // baseball cap on the 4th hook
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: 0.8 });
  const cap = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  crown.castShadow = true;
  cap.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.004, 24, 1, false, -Math.PI / 2.4, Math.PI / 1.2), capMat);
  brim.scale.set(1, 1, 1.45);
  brim.position.set(0, 0.0, 0.025);
  cap.add(brim);
  cap.rotation.set(-1.25, 0, 0.15);
  cap.position.set(0.15, -0.045, 0.06);
  g.add(cap);

  // headphones on the 3rd hook
  const hp = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.5 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 10, 32, Math.PI), black);
  band.rotation.z = Math.PI;
  band.position.y = 0.0;
  hp.add(band);
  [-1, 1].forEach((s) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 24), black);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(s * 0.046, -0.012, 0.0);
    cup.castShadow = true;
    hp.add(cup);
  });
  hp.rotation.x = 0.25;
  hp.position.set(0.05, -0.002, 0.05);
  g.add(hp);

  return g;
}

function createShoeRack() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.4 });
  const L = 0.36;
  const D = 0.15;
  [0.03, 0.14].forEach((y) => {
    const shelf = rbox(L, 0.012, D, wood, 0.002);
    shelf.position.set(0, y, D / 2);
    g.add(shelf);
  });
  [[-1, 0.02], [1, 0.02], [-1, D - 0.02], [1, D - 0.02]].forEach(([s, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8), metal);
    leg.position.set(s * (L / 2 - 0.01), 0.075, z);
    g.add(leg);
  });
  // sneakers: sole + upper + toe cap
  const sneaker = (color, x, y, rot) => {
    const s = new THREE.Group();
    const sole = rbox(0.045, 0.012, 0.11, new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.6 }), 0.005);
    sole.position.y = 0.006;
    s.add(sole);
    const upper = rbox(0.042, 0.035, 0.08, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }), 0.016, 4);
    upper.position.set(0, 0.028, -0.012);
    s.add(upper);
    const toe = rbox(0.04, 0.022, 0.04, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }), 0.012, 4);
    toe.position.set(0, 0.021, 0.035);
    s.add(toe);
    const lace = rbox(0.02, 0.003, 0.03, new THREE.MeshStandardMaterial({ color: 0xffffff }), 0.001);
    lace.position.set(0, 0.046, 0.0);
    s.add(lace);
    s.position.set(x, y, D / 2);
    s.rotation.y = rot;
    g.add(s);
  };
  sneaker(0xf3f2ee, -0.12, 0.146, 0.05);
  sneaker(0xf3f2ee, -0.065, 0.146, -0.04);
  sneaker(0x2b3a55, 0.05, 0.146, 0.08);
  sneaker(0x2b3a55, 0.105, 0.146, -0.02);
  // slides on the floor level
  [-0.1, -0.05].forEach((x) => {
    const slide = rbox(0.045, 0.01, 0.1, new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: 0.7 }), 0.006);
    slide.position.set(x, 0.04, D / 2);
    g.add(slide);
    const strap = rbox(0.046, 0.012, 0.035, new THREE.MeshStandardMaterial({ color: 0x1d1f23 }), 0.005);
    strap.position.set(x, 0.05, D / 2 + 0.02);
    g.add(strap);
  });
  return g;
}

function createMirror(renderer) {
  const g = new THREE.Group();
  const W = 0.3;
  const H = 0.82;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.4, metalness: 0.4 });
  const frame = rbox(W + 0.03, H + 0.03, 0.02, frameMat, 0.012);
  frame.position.z = 0.01;
  g.add(frame);
  const pr = Math.min(window.devicePixelRatio, 1.5);
  const mirror = new Reflector(new THREE.PlaneGeometry(W, H), {
    clipBias: 0.003,
    textureWidth: 384,
    textureHeight: 768,
    color: 0xb9c2c6,
  });
  mirror.position.z = 0.021;
  mirror.name = 'Mirror';
  g.add(mirror);
  return g;
}

// ---------------------------------------------------------------------------
function calendarTexture() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return canvasTex(600, 820, (x, w, h) => {
    x.fillStyle = '#fbfaf6';
    x.fillRect(0, 0, w, h);
    // photo on top half
    const sky = x.createLinearGradient(0, 0, 0, 380);
    sky.addColorStop(0, '#8fb3cf');
    sky.addColorStop(1, '#e8d9c0');
    x.fillStyle = sky;
    x.fillRect(0, 0, w, 380);
    x.fillStyle = '#5b7b6a';
    x.beginPath();
    x.moveTo(0, 380);
    x.lineTo(0, 260);
    x.lineTo(140, 170);
    x.lineTo(260, 250);
    x.lineTo(380, 140);
    x.lineTo(600, 280);
    x.lineTo(600, 380);
    x.fill();
    x.fillStyle = '#3f5a4c';
    x.beginPath();
    x.moveTo(0, 380);
    x.lineTo(0, 320);
    x.lineTo(200, 260);
    x.lineTo(420, 330);
    x.lineTo(600, 300);
    x.lineTo(600, 380);
    x.fill();
    // binding rings
    x.fillStyle = '#9a9ea4';
    for (let i = 0; i < 9; i++) x.fillRect(40 + i * 64, 0, 8, 22);
    // month header
    x.fillStyle = '#1f2328';
    x.font = '700 46px Georgia, serif';
    x.textAlign = 'left';
    x.fillText(months[m], 40, 445);
    x.fillStyle = '#b4472e';
    x.textAlign = 'right';
    x.fillText(String(y), w - 40, 445);
    // weekday labels (Mon first)
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    x.font = '700 20px Arial, sans-serif';
    x.textAlign = 'center';
    days.forEach((d, i) => {
      x.fillStyle = i === 6 ? '#b4472e' : '#6b6f75';
      x.fillText(d, 70 + i * 77, 490);
    });
    // date grid
    const first = (new Date(y, m, 1).getDay() + 6) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    x.font = '600 30px Arial, sans-serif';
    for (let d = 1; d <= count; d++) {
      const idx = first + d - 1;
      const cx = 70 + (idx % 7) * 77;
      const cy = 540 + Math.floor(idx / 7) * 52;
      x.fillStyle = idx % 7 === 6 ? '#b4472e' : '#24282d';
      x.fillText(String(d), cx, cy + 10);
      if (d === today) {
        x.strokeStyle = '#d63031';
        x.lineWidth = 4;
        x.beginPath();
        x.ellipse(cx, cy, 30, 24, -0.15, 0, Math.PI * 2);
        x.stroke();
      }
      if (d < today) {
        // days gone by get a light pen cross
        x.strokeStyle = 'rgba(80,80,90,0.35)';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(cx - 14, cy - 12);
        x.lineTo(cx + 14, cy + 12);
        x.stroke();
      }
    }
  });
}

function createCalendar() {
  const g = new THREE.Group();
  const W = 0.24;
  const H = 0.33;
  const back = rbox(W, H, 0.006, new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.8 }), 0.002);
  back.position.z = 0.003;
  g.add(back);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.004, H - 0.004), new THREE.MeshStandardMaterial({ map: calendarTexture(), roughness: 0.7 }));
  page.position.z = 0.0062;
  g.add(page);
  const nail = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.8, roughness: 0.3 }));
  nail.position.set(0, H / 2 + 0.012, 0.004);
  g.add(nail);
  return g;
}

function createKeyHolder() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7bbc1, metalness: 0.9, roughness: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.9, roughness: 0.3 });
  const board = rbox(0.18, 0.05, 0.014, wood, 0.004);
  board.position.z = 0.007;
  g.add(board);
  const shelf = rbox(0.18, 0.008, 0.04, wood, 0.002);
  shelf.position.set(0, 0.029, 0.02);
  g.add(shelf);
  // a small succulent on the little shelf
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.018, 16), new THREE.MeshStandardMaterial({ color: 0xe9e4da }));
  pot.position.set(0.06, 0.042, 0.022);
  g.add(pot);
  const succ = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: 0x6f9a6a }));
  succ.scale.set(1, 0.7, 1);
  succ.position.set(0.06, 0.055, 0.022);
  g.add(succ);
  // 3 hooks with keys hanging
  [-0.055, 0.0, 0.055].forEach((x, i) => {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0016, 6, 14, Math.PI), metal);
    hook.rotation.z = Math.PI;
    hook.position.set(x, -0.02, 0.016);
    g.add(hook);
    if (i === 2) return;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0012, 6, 20), metal);
    ring.position.set(x, -0.034, 0.018);
    g.add(ring);
    [-0.4, 0.3].forEach((a, k) => {
      const key = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.0025, 14), k ? brass : metal);
      head.rotation.x = Math.PI / 2;
      key.add(head);
      const blade = rbox(0.005, 0.03, 0.002, k ? brass : metal, 0.0008);
      blade.position.y = -0.021;
      key.add(blade);
      key.position.set(x + Math.sin(a) * 0.01, -0.05, 0.018 + k * 0.002);
      key.rotation.z = a;
      g.add(key);
    });
    // a keychain tag on the first ring
    if (i === 0) {
      const tag = rbox(0.016, 0.024, 0.004, new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.6 }), 0.003);
      tag.position.set(x - 0.004, -0.07, 0.02);
      g.add(tag);
    }
  });
  return g;
}

function createCodePoster() {
  const g = new THREE.Group();
  const W = 0.3;
  const H = 0.42;
  const t = canvasTex(600, 840, (x, w, h) => {
    x.fillStyle = '#1e1f22';
    x.fillRect(0, 0, w, h);
    x.font = '600 34px "JetBrains Mono", Menlo, Consolas, monospace';
    x.textAlign = 'left';
    const lines = [
      [['while', '#cf8e6d'], [' (alive) {', '#bcbec4']],
      [['  learn', '#56a8f5'], ['();', '#bcbec4']],
      [['  build', '#56a8f5'], ['();', '#bcbec4']],
      [['  ship', '#56a8f5'], ['();', '#bcbec4']],
      [['}', '#bcbec4']],
    ];
    lines.forEach((parts, i) => {
      let cx = 70;
      parts.forEach(([s, c]) => {
        x.fillStyle = c;
        x.fillText(s, cx, 300 + i * 66);
        cx += x.measureText(s).width;
      });
    });
    x.fillStyle = '#6f737a';
    x.font = '400 22px "JetBrains Mono", Menlo, monospace';
    x.fillText('// example.com', 70, 720);
    x.fillStyle = '#6aab73';
    x.fillRect(70, 200, 60, 6);
  });
  const frame = rbox(W + 0.02, H + 0.02, 0.016, new THREE.MeshStandardMaterial({ color: 0xc8a477, roughness: 0.5 }), 0.003);
  frame.position.z = 0.008;
  g.add(frame);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  pic.position.z = 0.0162;
  g.add(pic);
  return g;
}

// ---------------------------------------------------------------------------
export function createDoorWallDecor(renderer) {
  const group = new THREE.Group();
  // right of the door (seen from inside)
  group.add(onWall(createCoatRack(), 1.2, 0.62));
  group.add(onWall(createShoeRack(), 1.2, FLOOR));
  group.add(onWall(createMirror(renderer), 1.85, 0.3));
  // left of the door
  group.add(onWall(createKeyHolder(), 0.04, 0.42));
  group.add(onWall(createCalendar(), -0.3, 0.55));
  group.add(onWall(createCodePoster(), -0.72, 0.55));
  return group;
}
