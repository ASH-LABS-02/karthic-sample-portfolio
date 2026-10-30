// Wall decor for the empty walls:
// - left wall (beside the clock): whiteboard with an architecture sketch + cork board
// - side wall (by the bookshelf): abstract canvas print, floating shelf, two small prints
// Coordinates are in the room model's space: left wall x = -0.274 (faces +x),
// side wall z = 2.3 (faces -z), floor y = -0.47.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createHighlightsShelf } from './highlights-shelf.js';
import { FLOATING_SHELF_BOOKS } from './library.js';
import { createLibraryBook } from './book-design.js';

const LEFT_X = -0.274;
const SIDE_Z = 2.3;

function rbox(w, h, d, material, r = 0.003) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}
// things hung on the left wall: local x runs along the wall, local z out of it
function onLeftWall(obj, z, y) {
  obj.rotation.y = Math.PI / 2;
  obj.position.set(LEFT_X, y, z);
  return obj;
}
// things hung on the side wall
function onSideWall(obj, x, y) {
  obj.rotation.y = Math.PI;
  obj.position.set(x, y, SIDE_Z);
  return obj;
}
// a small seeded random so the hand-drawn wobble looks the same every time
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// ---------------------------------------------------------------------------
// WHITEBOARD
function whiteboardTexture() {
  return tex(1200, 800, (x, w, h) => {
    const r = rng(11);
    x.fillStyle = '#f7f8f7';
    x.fillRect(0, 0, w, h);
    // faint ghosting of old marker
    x.fillStyle = 'rgba(120,130,150,0.06)';
    for (let i = 0; i < 6; i++) x.fillRect(r() * w, r() * h, 200 + r() * 200, 30 + r() * 40);
    const hand = (size) => `600 ${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", "Marker Felt", cursive`;
    const wobbleLine = (x1, y1, x2, y2, color, width = 5) => {
      x.strokeStyle = color;
      x.lineWidth = width;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(x1 + (r() - 0.5) * 3, y1 + (r() - 0.5) * 3);
      const mx = (x1 + x2) / 2 + (r() - 0.5) * 8;
      const my = (y1 + y2) / 2 + (r() - 0.5) * 8;
      x.quadraticCurveTo(mx, my, x2 + (r() - 0.5) * 3, y2 + (r() - 0.5) * 3);
      x.stroke();
    };
    const boxText = (cx, cy, bw, bh, label, color) => {
      wobbleLine(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy - bh / 2, color);
      wobbleLine(cx + bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2, color);
      wobbleLine(cx + bw / 2, cy + bh / 2, cx - bw / 2, cy + bh / 2, color);
      wobbleLine(cx - bw / 2, cy + bh / 2, cx - bw / 2, cy - bh / 2, color);
      x.fillStyle = color;
      x.font = hand(30);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(label, cx, cy + 2);
    };
    const arrow = (x1, y1, x2, y2, color) => {
      wobbleLine(x1, y1, x2, y2, color, 4);
      const a = Math.atan2(y2 - y1, x2 - x1);
      wobbleLine(x2, y2, x2 - 18 * Math.cos(a - 0.45), y2 - 18 * Math.sin(a - 0.45), color, 4);
      wobbleLine(x2, y2, x2 - 18 * Math.cos(a + 0.45), y2 - 18 * Math.sin(a + 0.45), color, 4);
    };
    const blue = '#1f4fa8';
    const black = '#22252a';
    const red = '#c0392b';
    const green = '#1e7b46';

    x.fillStyle = black;
    x.font = hand(40);
    x.textAlign = 'left';
    x.fillText('E-commerce v2 — architecture', 50, 70);
    wobbleLine(50, 92, 610, 92, black, 3);

    boxText(130, 330, 150, 70, 'Client', black);
    boxText(380, 330, 210, 80, 'API Gateway', blue);
    arrow(208, 330, 272, 330, black);
    const svc = [['User', 200], ['Product', 300], ['Order', 400], ['Payment', 500]];
    svc.forEach(([n, y]) => {
      boxText(680, y, 170, 62, n, blue);
      arrow(487, 330, 592, y, black);
    });
    boxText(380, 520, 180, 62, 'Eureka', green);
    wobbleLine(380, 372, 380, 488, green, 3);
    boxText(680, 640, 170, 62, 'Kafka', red);
    arrow(680, 432, 680, 606, red);
    x.fillStyle = red;
    x.font = hand(24);
    x.textAlign = 'left';
    x.fillText('order.events', 700, 560);

    // to-do list on the right
    x.fillStyle = black;
    x.font = hand(34);
    x.fillText('TODO', 870, 180);
    wobbleLine(870, 200, 990, 200, black, 3);
    const todo = [
      ['JWT refresh tokens', true],
      ['Redis cache /products', false],
      ['Retry + DLQ for payments', false],
      ['Load test 500 rps', false],
    ];
    x.font = hand(26);
    todo.forEach(([t, done], i) => {
      const y = 250 + i * 62;
      x.strokeStyle = black;
      x.lineWidth = 3;
      x.strokeRect(872, y - 16, 22, 22);
      if (done) wobbleLine(874, y - 4, 884, y + 5, green, 4), wobbleLine(884, y + 5, 900, y - 22, green, 4);
      x.fillStyle = done ? '#8b9096' : black;
      x.fillText(t, 908, y);
      if (done) wobbleLine(908, y - 2, 908 + x.measureText(t).width, y - 2, '#8b9096', 3);
    });
    x.fillStyle = blue;
    x.font = hand(28);
    x.fillText('p99 < 200ms !!', 880, 560);
  });
}

function createWhiteboard() {
  const g = new THREE.Group();
  const W = 0.6;
  const H = 0.4;
  const alu = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.7, roughness: 0.35 });
  const frame = rbox(W + 0.024, H + 0.024, 0.014, alu, 0.004);
  frame.position.z = 0.007;
  g.add(frame);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ map: whiteboardTexture(), roughness: 0.25 })
  );
  board.position.z = 0.0145;
  g.add(board);
  // marker tray with three markers and an eraser
  const tray = rbox(W * 0.55, 0.008, 0.03, alu, 0.002);
  tray.position.set(0, -H / 2 - 0.016, 0.022);
  g.add(tray);
  [0x1f4fa8, 0x22252a, 0xc0392b].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.07, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
    m.rotation.z = Math.PI / 2;
    m.position.set(-0.08 + i * 0.05, -H / 2 - 0.007, 0.022);
    g.add(m);
  });
  const eraser = rbox(0.06, 0.016, 0.024, new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.8 }), 0.004);
  eraser.position.set(0.11, -H / 2 - 0.004, 0.022);
  g.add(eraser);
  return g;
}

// ---------------------------------------------------------------------------
// CORK BOARD
function corkTexture() {
  return tex(800, 600, (x, w, h) => {
    const r = rng(5);
    x.fillStyle = '#b98b5a';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const c = r() < 0.5 ? `rgba(90,55,25,${0.15 + r() * 0.3})` : `rgba(230,190,140,${0.1 + r() * 0.25})`;
      x.fillStyle = c;
      x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
    }
    const note = (cx, cy, rot, color, lines) => {
      x.save();
      x.translate(cx, cy);
      x.rotate(rot);
      x.shadowColor = 'rgba(0,0,0,0.35)';
      x.shadowBlur = 10;
      x.shadowOffsetY = 4;
      x.fillStyle = color;
      x.fillRect(-85, -85, 170, 170);
      x.shadowColor = 'transparent';
      x.fillStyle = '#2b2620';
      x.font = '600 26px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
      x.textAlign = 'center';
      lines.forEach((l, i) => x.fillText(l, 0, -30 + i * 36));
      x.restore();
    };
    note(130, 140, -0.08, '#fbe36b', ['fix N+1', 'query in', 'OrderRepo']);
    note(340, 150, 0.06, '#ff9fb6', ['read DDIA', 'ch. 5–6']);
    note(130, 420, 0.05, '#9fd4ff', ['Kafka', 'retry +', 'DLQ']);
    note(560, 430, -0.05, '#b6f0a6', ['gym 6 am', 'no excuses']);
    // a pinned photo (sunrise over hills)
    x.save();
    x.translate(570, 160);
    x.rotate(0.07);
    x.shadowColor = 'rgba(0,0,0,0.35)';
    x.shadowBlur = 10;
    x.shadowOffsetY = 4;
    x.fillStyle = '#fafafa';
    x.fillRect(-120, -95, 240, 200);
    x.shadowColor = 'transparent';
    const sky = x.createLinearGradient(0, -80, 0, 70);
    sky.addColorStop(0, '#f3b37a');
    sky.addColorStop(1, '#f6e1c3');
    x.fillStyle = sky;
    x.fillRect(-108, -83, 216, 150);
    x.fillStyle = '#fff3d6';
    x.beginPath();
    x.arc(40, 10, 22, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#5d7a5a';
    x.beginPath();
    x.moveTo(-108, 67);
    x.lineTo(-40, 5);
    x.lineTo(10, 40);
    x.lineTo(70, -5);
    x.lineTo(108, 30);
    x.lineTo(108, 67);
    x.fill();
    x.restore();
    // an index card
    x.save();
    x.translate(355, 420);
    x.rotate(-0.03);
    x.fillStyle = '#fffdf6';
    x.fillRect(-95, -60, 190, 120);
    x.strokeStyle = '#9bc0e6';
    x.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.moveTo(-95, -25 + i * 26);
      x.lineTo(95, -25 + i * 26);
      x.stroke();
    }
    x.fillStyle = '#2b2620';
    x.font = '600 22px "Segoe Print", "Comic Sans MS", cursive';
    x.textAlign = 'center';
    x.fillText('ship small,', 0, -30);
    x.fillText('ship often', 0, 0);
    x.restore();
  });
}

function createCorkBoard() {
  const g = new THREE.Group();
  const W = 0.4;
  const H = 0.3;
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.6 });
  const frame = rbox(W + 0.024, H + 0.024, 0.016, wood, 0.003);
  frame.position.z = 0.008;
  g.add(frame);
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: corkTexture(), roughness: 0.95 }));
  cork.position.z = 0.0165;
  g.add(cork);
  // push pins at the top of each pinned item (positions in texture px -> metres)
  const pins = [[130, 70, 0xd63031], [340, 80, 0x0984e3], [130, 350, 0x00b894], [560, 360, 0xfdcb6e], [570, 75, 0xd63031], [355, 370, 0x6c5ce7]];
  pins.forEach(([px, py, c]) => {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }));
    pin.position.set((px / 800 - 0.5) * W, (0.5 - py / 600) * H, 0.021);
    pin.castShadow = true;
    g.add(pin);
  });
  return g;
}

// ---------------------------------------------------------------------------
// ABSTRACT CANVAS PRINT
function artTexture() {
  return tex(900, 700, (x, w, h) => {
    const r = rng(23);
    x.fillStyle = '#efe7da';
    x.fillRect(0, 0, w, h);
    const blob = (cx, cy, rad, color) => {
      x.fillStyle = color;
      x.beginPath();
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = rad * (0.85 + r() * 0.3);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (i === 0) x.moveTo(px, py);
        else x.quadraticCurveTo(cx + Math.cos(a - 0.35) * rr * 1.12, cy + Math.sin(a - 0.35) * rr * 1.12, px, py);
      }
      x.fill();
    };
    // big arch, sun, and organic shapes in a muted palette
    x.fillStyle = '#c9714c';
    x.beginPath();
    x.moveTo(140, 700);
    x.lineTo(140, 360);
    x.arc(330, 360, 190, Math.PI, 0);
    x.lineTo(520, 700);
    x.fill();
    x.fillStyle = '#e9b764';
    x.beginPath();
    x.arc(640, 200, 95, 0, Math.PI * 2);
    x.fill();
    blob(700, 520, 140, '#7d9a84');
    blob(250, 560, 90, '#203a52');
    x.strokeStyle = '#203a52';
    x.lineWidth = 6;
    x.beginPath();
    for (let i = 0; i < 5; i++) {
      x.moveTo(560, 380 + i * 22);
      x.bezierCurveTo(640, 360 + i * 22, 720, 400 + i * 22, 840, 370 + i * 22);
    }
    x.stroke();
    // canvas grain
    for (let i = 0; i < 12000; i++) {
      x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`;
      x.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

function createArtPrint() {
  const g = new THREE.Group();
  const W = 0.6;
  const H = 0.46;
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.45 });
  const frame = rbox(W + 0.03, H + 0.03, 0.022, black, 0.003);
  frame.position.z = 0.011;
  g.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.85 }));
  art.position.z = 0.0225;
  g.add(art);
  return g;
}

// ---------------------------------------------------------------------------
// FLOATING SHELF with trailing plant, books, vase + two small prints above
function smallPrint(seed, palette) {
  const g = new THREE.Group();
  const W = 0.16;
  const H = 0.21;
  const frame = rbox(W + 0.016, H + 0.016, 0.014, new THREE.MeshStandardMaterial({ color: 0xc8a477, roughness: 0.5 }), 0.002);
  frame.position.z = 0.007;
  g.add(frame);
  const t = tex(320, 420, (x, w, h) => {
    const r = rng(seed);
    x.fillStyle = '#f6f1e7';
    x.fillRect(0, 0, w, h);
    // passe-partout + simple line art: stacked hills
    x.fillStyle = palette[0];
    x.fillRect(40, 40, w - 80, h - 80);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = palette[(i % (palette.length - 1)) + 1];
      x.beginPath();
      const base = 200 + i * 40;
      x.moveTo(40, h - 40);
      x.lineTo(40, base + r() * 30);
      x.quadraticCurveTo(w / 2, base - 70 - r() * 40, w - 40, base + r() * 30);
      x.lineTo(w - 40, h - 40);
      x.fill();
    }
    x.fillStyle = '#f6f1e7';
    x.beginPath();
    x.arc(w / 2 + 40, 130, 28, 0, Math.PI * 2);
    x.fill();
  });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
  pic.position.z = 0.0145;
  g.add(pic);
  return g;
}

function createFloatingShelf() {
  const g = new THREE.Group();
  const walnut = new THREE.MeshStandardMaterial({ color: 0x5e3f2a, roughness: 0.55 });
  const L = 0.46;
  const D = 0.11;
  const plank = rbox(L, 0.022, D, walnut, 0.003);
  plank.position.set(0, 0, D / 2);
  g.add(plank);
  const TOP = 0.011;
  // stacked books lying flat
  FLOATING_SHELF_BOOKS.forEach((info, i) => {
    const b = createLibraryBook(info, 0.018, 0.12 - i * 0.008, 0.085 - i * 0.004, { interactive: false, laidFlat: true });
    b.position.set(-0.14, TOP + 0.009 + i * 0.018, D / 2);
    b.rotation.y = i * 0.12 - 0.08;
    g.add(b);
  });
  // ceramic vase with dried stems
  const vase = new THREE.Mesh(
    new THREE.LatheGeometry(
      [[0, 0], [0.022, 0], [0.03, 0.03], [0.026, 0.07], [0.014, 0.095], [0.016, 0.11]].map(([a, b]) => new THREE.Vector2(a, b)),
      28
    ),
    new THREE.MeshStandardMaterial({ color: 0xd9cbb5, roughness: 0.6 })
  );
  vase.position.set(0.0, TOP, D / 2);
  vase.castShadow = true;
  g.add(vase);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xb59466, roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.16, 5), stemMat);
    stem.position.set((i - 2) * 0.006, TOP + 0.17, D / 2);
    stem.rotation.z = (i - 2) * 0.12;
    g.add(stem);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), stemMat);
    tuft.scale.set(1, 2, 1);
    tuft.position.set((i - 2) * 0.006 - Math.sin((i - 2) * 0.12) * 0.08, TOP + 0.25, D / 2);
    g.add(tuft);
  }
  // pot with a trailing plant spilling over the edge
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.055, 24), new THREE.MeshStandardMaterial({ color: 0xece7de, roughness: 0.5 }));
  pot.position.set(0.15, TOP + 0.0275, D / 2);
  pot.castShadow = true;
  g.add(pot);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4f8a4a, roughness: 0.55, side: THREE.DoubleSide });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 0.7 });
  const r = rng(3);
  for (let v = 0; v < 4; v++) {
    const pts = [];
    const sx = 0.15 + (v - 1.5) * 0.015;
    const len = 0.1 + v * 0.05;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector3(sx + Math.sin(t * 3 + v) * 0.01, TOP + 0.05 - Math.max(0, t - 0.25) * len * 1.6, D / 2 + 0.03 + t * 0.03));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0012, 5), vineMat));
    for (let i = 0; i < 7; i++) {
      const p = curve.getPoint(i / 7 + 0.05);
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), leaf);
      lf.scale.set(1, 0.25, 0.8);
      lf.position.copy(p);
      lf.rotation.set(r() * 1.2 - 0.6, r() * 3, r() * 1.2);
      lf.castShadow = true;
      g.add(lf);
    }
  }
  return g;
}


// ---------------------------------------------------------------------------
// HIGHLIGHTS SHELF (left wall, under the whiteboard + cork board)
// Editable placeholder education, experience and achievements.
export const HIGHLIGHTS = [
  {
    "kicker": "Education",
    "kind": "degree",
    "title": "[Your Degree]",
    "color": "#1f3a5f",
    "subtitle": "[Your School / University]",
    "intro": "[Add your degree, institution, graduation year, and grade.]",
    "points": [
      "[Course One]",
      "[Course Two]",
      "[Course Three]"
    ],
    "usedIn": "[Graduation Year] · [Your Grade]"
  },
  {
    "kind": "plaque",
    "kicker": "Experience",
    "title": "[Your Role]",
    "color": "#0f6e6b",
    "subtitle": "[Organization] · [Dates]",
    "intro": "[Describe your role, responsibilities, and contributions.]",
    "points": [
      "[Responsibility One]",
      "[Responsibility Two]",
      "[A verified outcome]"
    ],
    "usedIn": "[Your Organization]"
  },
  {
    "kind": "stat",
    "kicker": "Highlights",
    "big": "XX",
    "label": "Your impact",
    "title": "[Your Impact Highlight]",
    "color": "#b4472e",
    "subtitle": "[Your context]",
    "intro": "[Add a verified achievement and explain its significance.]",
    "points": [
      "[Your contribution]",
      "[Your result]",
      "[Supporting context]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "kind": "stat",
    "kicker": "Highlights",
    "big": "XX",
    "label": "Your skills",
    "title": "[Your Skills Highlight]",
    "color": "#1f3a5f",
    "subtitle": "[Your context]",
    "intro": "[Add a verified achievement and explain its significance.]",
    "points": [
      "[Your contribution]",
      "[Your result]",
      "[Supporting context]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "kind": "stat",
    "kicker": "Highlights",
    "big": "XX",
    "label": "Your projects",
    "title": "[Your Projects Highlight]",
    "color": "#4a5d23",
    "subtitle": "[Your context]",
    "intro": "[Add a verified achievement and explain its significance.]",
    "points": [
      "[Your contribution]",
      "[Your result]",
      "[Supporting context]"
    ],
    "usedIn": "[Your project or experience]"
  }
];

// ---------------------------------------------------------------------------
export function createWallDecor(envMap) {
  const group = new THREE.Group();

  // left wall, between the clock and the corner
  group.add(onLeftWall(createWhiteboard(), 1.36, 0.5));
  group.add(onLeftWall(createCorkBoard(), 1.98, 0.52));
  // placeholder achievements and education, under the boards
  const highlights = onLeftWall(createHighlightsShelf(HIGHLIGHTS, envMap), 1.55, -0.12);
  highlights.scale.setScalar(1.45); // bigger so it reads from across the room
  group.add(highlights);
  group.userData.setNight = (night) => highlights.userData.setNight(night);
  group.userData.update = (time, delta) => highlights.userData.update(time, delta);

  // side wall: art print left of the bookshelf
  group.add(onSideWall(createArtPrint(), 0.16, 0.5));
  // floating shelf + two prints above the floor cushion
  group.add(onSideWall(createFloatingShelf(), 1.6, 0.33));
  group.add(onSideWall(smallPrint(7, ['#e9dfcf', '#c9714c', '#7d9a84', '#203a52']), 1.5, 0.66));
  group.add(onSideWall(smallPrint(19, ['#e3e8ea', '#7d9a84', '#203a52', '#e9b764']), 1.72, 0.62));

  // flat wall pieces shouldn't throw long shadows across the walls
  group.traverse((o) => {
    if (o.isMesh && !o.geometry.parameters?.radius) o.castShadow = false;
  });
  return group;
}
