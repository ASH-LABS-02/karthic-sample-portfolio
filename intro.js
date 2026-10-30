import { PROFILE } from './profile.js';
// Entrance: a wall with a door closes off the open side of the room.
// The site starts in the hallway looking at the closed door; on "Enter"
// the door opens, footsteps play and the camera
// walks through the doorway to the desk view.
// Recorded foley comes from sound.js; licenses live in public/audio/CREDITS.md.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { unlock, sound, preloadSounds, stopSounds } from './sound.js';
import { reducedMotion } from './interface.js';

const FLOOR = -0.47;
const CEILING = 1.56;
const WALL_X = 1.95; // the new wall runs along z at this x
const DOOR_Z = 0.5; // centre of the doorway
const DOOR_W = 0.56;
const DOOR_H = 1.33;
const T = 0.06; // wall thickness

function rbox(w, h, d, material, r = 0.003, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#6e4b33';
  x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 140; i++) {
    x.strokeStyle = Math.random() < 0.6 ? `rgba(35,20,10,${0.08 + Math.random() * 0.14})` : `rgba(150,105,70,${0.06 + Math.random() * 0.1})`;
    x.lineWidth = 0.6 + Math.random() * 1.8;
    const x0 = Math.random() * 256;
    x.beginPath();
    x.moveTo(x0, 0);
    for (let y = 0; y <= 512; y += 32) x.lineTo(x0 + Math.sin(y * 0.01 + i) * 3, y);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function plaqueTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 160);
  g.addColorStop(0, '#d9bd78');
  g.addColorStop(0.5, '#b8924a');
  g.addColorStop(1, '#e6cf8f');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 160);
  x.strokeStyle = 'rgba(80,55,20,0.6)';
  x.lineWidth = 4;
  x.strokeRect(10, 10, 492, 140);
  x.fillStyle = '#3b2a14';
  x.textAlign = 'center';
  x.font = '600 58px Georgia, "Times New Roman", serif';
  x.fillText(PROFILE.name.toUpperCase(), 256, 82);
  x.font = 'italic 26px Georgia, serif';
  x.fillText(PROFILE.role, 256, 124);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// HALLWAY (outside face of the entrance wall, facing +x towards the visitor)
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function createHallway(envMap) {
  const g = new THREE.Group();
  const OUT = WALL_X + T; // outer wall surface
  // objects built with their front along local +z are turned to face the hallway
  const onWall = (obj, z, y) => {
    obj.rotation.y = Math.PI / 2;
    obj.position.set(OUT, y, z);
    g.add(obj);
    return obj;
  };
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8964f, metalness: 0.9, roughness: 0.3, envMap, envMapIntensity: 1 });

  // coir doormat with WELCOME
  const matTex = canvasTexture(512, 320, (x, w, h) => {
    x.fillStyle = '#7a5a3a';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(40,25,10,0.35)' : 'rgba(190,150,100,0.25)';
      x.fillRect(Math.random() * w, Math.random() * h, 2, 4);
    }
    x.strokeStyle = '#2a1c10';
    x.lineWidth = 10;
    x.strokeRect(22, 22, w - 44, h - 44);
    x.fillStyle = '#2a1c10';
    x.font = '700 64px Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('WELCOME', w / 2, h / 2 + 4);
  });
  const doormat = rbox(0.32, 0.01, 0.5, new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }), 0.004);
  doormat.position.set(OUT + 0.2, FLOOR + 0.005, DOOR_Z);
  g.add(doormat);
  const matTop = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.3), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1 }));
  // text reads correctly for someone standing in the hallway facing the door
  matTop.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  matTop.position.set(OUT + 0.2, FLOOR + 0.0105, DOOR_Z);
  matTop.receiveShadow = true;
  g.add(matTop);

  // two wall sconces: brass backplate + arm, fabric drum shade lit from inside
  const linen = canvasTexture(256, 128, (x, w, h) => {
    x.fillStyle = '#efe6d6';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 2) {
      x.fillStyle = `rgba(120,100,70,${Math.random() * 0.08})`;
      x.fillRect(i, 0, 1, h);
    }
    for (let j = 0; j < h; j += 2) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
      x.fillRect(0, j, w, 1);
    }
  });
  linen.wrapS = THREE.RepeatWrapping;
  linen.repeat.set(3, 1);
  const shadeOuter = new THREE.MeshStandardMaterial({ map: linen, color: 0xfff4e2, emissive: 0xffc98a, emissiveMap: linen, emissiveIntensity: 0.55, roughness: 0.95, side: THREE.DoubleSide });
  const shadeInner = new THREE.MeshBasicMaterial({ color: 0xffe2b4, side: THREE.BackSide, toneMapped: false });
  const diffuser = new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false });
  const glowTex = canvasTexture(256, 256, (x, w, h) => {
    const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2 - 2);
    gr.addColorStop(0, 'rgba(255,210,150,0.42)');
    gr.addColorStop(0.45, 'rgba(255,210,150,0.12)');
    gr.addColorStop(1, 'rgba(255,214,150,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
  });
  [DOOR_Z + 0.43, DOOR_Z - 0.43].forEach((z) => {
    const sc = new THREE.Group();
    // rounded backplate
    const plate = new THREE.Mesh(
      new THREE.LatheGeometry([[0, 0], [0.026, 0], [0.03, 0.004], [0.028, 0.009], [0, 0.011]].map(([r, y]) => new THREE.Vector2(r, y)), 32),
      brass
    );
    plate.rotation.x = Math.PI / 2;
    sc.add(plate);
    // curved arm out of the wall then up into the shade
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(0, 0, 0.045), new THREE.Vector3(0, 0.02, 0.07), new THREE.Vector3(0, 0.035, 0.075)]);
    sc.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0035, 10), brass));
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 16), brass);
    holder.position.set(0, 0.04, 0.075);
    sc.add(holder);
    // drum shade, slightly tapered, with thin brass rims
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.07, 48, 1, true), shadeOuter);
    shade.position.set(0, 0.06, 0.075);
    sc.add(shade);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.0395, 0.0455, 0.069, 48, 1, true), shadeInner);
    inner.position.copy(shade.position);
    sc.add(inner);
    [0.025, 0.095].forEach((y, k) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(k ? 0.04 : 0.046, 0.0012, 6, 48), brass);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, y, 0.075);
      sc.add(rim);
    });
    // frosted diffuser visible from below
    const disk = new THREE.Mesh(new THREE.CircleGeometry(0.044, 32), diffuser);
    disk.rotation.x = Math.PI / 2;
    disk.position.set(0, 0.026, 0.075);
    sc.add(disk);
    // soft light pool on the wall
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    glow.position.set(0, 0.04, 0.002);
    sc.add(glow);
    onWall(sc, z, 0.62);
  });
  const warm = new THREE.PointLight(0xffd9a8, 0.6, 1.6, 1.5);
  warm.position.set(OUT + 0.35, 0.62, DOOR_Z);
  g.add(warm);

  // fiddle-leaf fig in a glazed pot (screen-left of the door)
  const PX = OUT + 0.12;
  const PZ = DOOR_Z + 0.62;
  const glaze = new THREE.MeshPhysicalMaterial({ color: 0x2b3a3a, roughness: 0.3, clearcoat: 0.6, envMap, envMapIntensity: 0.6 });
  const pot = new THREE.Mesh(
    new THREE.LatheGeometry(
      [[0, 0], [0.07, 0], [0.085, 0.02], [0.095, 0.12], [0.098, 0.2], [0.104, 0.215], [0.096, 0.22], [0.088, 0.21]].map(([r, y]) => new THREE.Vector2(r, y)),
      48
    ),
    glaze
  );
  pot.position.set(PX, FLOOR, PZ);
  pot.castShadow = true;
  g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.088, 32), new THREE.MeshStandardMaterial({ color: 0x2e2218, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(PX, FLOOR + 0.205, PZ);
  g.add(soil);
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 });
  const leafTex = canvasTexture(256, 512, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#2f5a2c');
    gr.addColorStop(0.5, '#4a7d3e');
    gr.addColorStop(1, '#2f5a2c');
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(210,225,170,0.75)';
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(w / 2, h);
    x.lineTo(w / 2, 10);
    x.stroke();
    x.lineWidth = 2;
    x.strokeStyle = 'rgba(200,220,160,0.45)';
    for (let y = 60; y < h - 30; y += 46) {
      [-1, 1].forEach((sd) => {
        x.beginPath();
        x.moveTo(w / 2, y + 30);
        x.quadraticCurveTo(w / 2 + sd * 60, y + 10, w / 2 + sd * 118, y - 10);
        x.stroke();
      });
    }
  });
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.45, side: THREE.DoubleSide });
  // violin-shaped leaf, cupped and bent
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.03, 0.01, 0.045, 0.06, 0.04, 0.1);
  leafShape.bezierCurveTo(0.038, 0.13, 0.03, 0.15, 0, 0.16);
  leafShape.bezierCurveTo(-0.03, 0.15, -0.038, 0.13, -0.04, 0.1);
  leafShape.bezierCurveTo(-0.045, 0.06, -0.03, 0.01, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 10);
  {
    const p = leafGeo.attributes.position;
    const uv = leafGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      uv.setXY(i, x / 0.09 + 0.5, y / 0.16);
      p.setZ(i, Math.abs(x) * 0.5 - (y / 0.16) ** 2 * 0.03); // cupped + droops at the tip
    }
    leafGeo.computeVertexNormals();
  }
  const r = (() => {
    let sd = 9;
    return () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  })();
  // three trunks with leaves along the upper part
  [[0, 0.62, 0], [0.03, 0.5, 0.6], [-0.03, 0.44, -0.7]].forEach(([dz, hgt, lean]) => {
    const top = new THREE.Vector3(PX + Math.sin(lean) * 0.04, FLOOR + 0.2 + hgt, PZ + dz + Math.sin(lean) * 0.06);
    const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(PX, FLOOR + 0.2, PZ + dz * 0.3), new THREE.Vector3(PX + Math.sin(lean) * 0.02, FLOOR + 0.2 + hgt * 0.5, PZ + dz * 0.7), top]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(trunk, 16, 0.007, 8), bark));
    for (let i = 0; i < 9; i++) {
      const t = 0.35 + (i / 9) * 0.65;
      const at = trunk.getPoint(t);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.copy(at);
      const yaw = i * 2.4 + lean;
      leaf.rotation.set(-0.9 + r() * 0.5, yaw, 0, 'YXZ');
      leaf.scale.setScalar(0.85 + r() * 0.45);
      leaf.castShadow = true;
      g.add(leaf);
    }
  });

  // framed print: black frame, white mount, glass with reflections
  const artTex = canvasTexture(480, 640, (x, w, h) => {
    x.fillStyle = '#e9e2d4';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#c56f4a';
    x.beginPath();
    x.arc(w * 0.42, h * 0.38, 120, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#25384f';
    x.fillRect(w * 0.18, h * 0.58, w * 0.64, h * 0.26);
    x.strokeStyle = '#d9a945';
    x.lineWidth = 10;
    x.beginPath();
    x.moveTo(w * 0.18, h * 0.52);
    x.bezierCurveTo(w * 0.4, h * 0.46, w * 0.6, h * 0.58, w * 0.82, h * 0.5);
    x.stroke();
    // paper grain
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`;
      x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  const art = new THREE.Group();
  const frame = rbox(0.34, 0.44, 0.024, new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.35, metalness: 0.2 }), 0.004);
  frame.position.z = 0.012;
  art.add(frame);
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.41), new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.9 }));
  mount.position.z = 0.0245;
  art.add(mount);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.85 }));
  pic.position.z = 0.025;
  art.add(pic);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.31, 0.41),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1, envMap, envMapIntensity: 1.2, depthWrite: false })
  );
  glass.position.z = 0.0262;
  art.add(glass);
  onWall(art, DOOR_Z - 0.8, 0.46);

  // doorbell beside the frame
  const bell = new THREE.Group();
  const bellPlate = rbox(0.035, 0.06, 0.008, new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.4 }), 0.004);
  bellPlate.position.z = 0.004;
  bell.add(bellPlate);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fd0ff, emissiveIntensity: 0.6 }));
  button.rotation.x = Math.PI / 2;
  button.position.z = 0.009;
  bell.add(button);
  onWall(bell, DOOR_Z - DOOR_W / 2 - 0.1, 0.42);

  return g;
}

export function createDoorway(envMap) {
  const group = new THREE.Group();
  const hallwayFloor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.025, 3.53), new THREE.MeshStandardMaterial({ color: 0xb8afa0, roughness: 0.8 }));
  hallwayFloor.position.set(WALL_X + 1.15, FLOOR - 0.0125, 0.565);
  hallwayFloor.name = 'HallwayFloor'; hallwayFloor.receiveShadow = true; group.add(hallwayFloor);
  // same warm greige as the painted room walls
  const plaster = canvasTexture(512, 512, (x, w, h) => {
    x.fillStyle = '#808080';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = 110 + Math.random() * 40;
      x.fillStyle = `rgba(${v},${v},${v},0.5)`;
      x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
  plaster.repeat.set(6, 6);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xbdb5a8, roughness: 0.92, bumpMap: plaster, bumpScale: 0.0006 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 0.5 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd4d6da, metalness: 0.95, roughness: 0.2, envMap, envMapIntensity: 1.1 });

  // wall around the doorway: left, right and above
  const Z0 = -1.2;
  const Z1 = 2.33;
  const zL = DOOR_Z - DOOR_W / 2;
  const zR = DOOR_Z + DOOR_W / 2;
  const wallPiece = (z0, z1, y0, y1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(T, y1 - y0, z1 - z0), wallMat);
    m.position.set(WALL_X + T / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    // walls don't cast shadows (they self-shadowed unevenly beside the door)
    m.castShadow = false;
    m.name = 'EntryWall';
    group.add(m);
  };
  wallPiece(Z0, zL, FLOOR, CEILING);
  wallPiece(zR, Z1, FLOOR, CEILING);
  wallPiece(zL, zR, FLOOR + DOOR_H, CEILING);

  // the far side wall closes the room (it was open before)
  const SIDE_Z = 2.3;
  const side = new THREE.Mesh(new THREE.BoxGeometry(WALL_X + 0.274 + T, CEILING - FLOOR, T), wallMat);
  side.position.set((WALL_X - 0.274 + T) / 2, (FLOOR + CEILING) / 2, SIDE_Z + T / 2);
  side.receiveShadow = true;
  side.name = 'EntryWall';
  group.add(side);
  const sideSkirt = new THREE.Mesh(new THREE.BoxGeometry(WALL_X + 0.274, 0.05, 0.008), trimMat);
  sideSkirt.position.set((WALL_X - 0.274) / 2, FLOOR + 0.025, SIDE_Z - 0.004);
  group.add(sideSkirt);

  // door frame + architrave trim on both faces
  const jamb = (z) => {
    const j = new THREE.Mesh(new THREE.BoxGeometry(T + 0.004, DOOR_H, 0.012), trimMat);
    j.position.set(WALL_X + T / 2, FLOOR + DOOR_H / 2, z);
    group.add(j);
  };
  jamb(zL + 0.006);
  jamb(zR - 0.006);
  const head = new THREE.Mesh(new THREE.BoxGeometry(T + 0.004, 0.012, DOOR_W), trimMat);
  head.position.set(WALL_X + T / 2, FLOOR + DOOR_H - 0.006, DOOR_Z);
  group.add(head);
  [WALL_X - 0.004, WALL_X + T + 0.004].forEach((x) => {
    [zL - 0.02, zR + 0.02].forEach((z) => {
      const a = rbox(0.008, DOOR_H + 0.04, 0.04, trimMat, 0.002);
      a.position.set(x, FLOOR + (DOOR_H + 0.04) / 2, z);
      group.add(a);
    });
    const top = rbox(0.008, 0.04, DOOR_W + 0.08, trimMat, 0.002);
    top.position.set(x, FLOOR + DOOR_H + 0.02, DOOR_Z);
    group.add(top);
    // skirting board along the wall on this side
    [[Z0, zL - 0.04], [zR + 0.04, Z1]].forEach(([a0, a1]) => {
      const sk = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, a1 - a0), trimMat);
      sk.position.set(x, FLOOR + 0.025, (a0 + a1) / 2);
      sk.receiveShadow = true;
      group.add(sk);
    });
  });

  // the door: hinged on the zL side, opens into the room (towards -x)
  const pivot = new THREE.Group();
  pivot.position.set(WALL_X + T / 2, FLOOR, zL + 0.012);
  group.add(pivot);
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.5, envMap, envMapIntensity: 0.35 });
  const DW = DOOR_W - 0.026;
  const DH = DOOR_H - 0.008;
  const door = rbox(0.035, DH, DW, wood, 0.004);
  door.position.set(0, DH / 2, DW / 2);
  pivot.add(door);
  // vertical grooves, like a modern laminated door
  const groove = new THREE.MeshStandardMaterial({ color: 0x3c2717, roughness: 0.7 });
  [-1, 1].forEach((side) => {
    [DW * 0.33, DW * 0.67].forEach((z) => {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.002, DH * 0.86, 0.004), groove);
      g.position.set(side * 0.0177, DH / 2, z);
      pivot.add(g);
    });
  });
  // lever handles + rose on both sides; each lever tilts down on its spindle
  const handles = {};
  [-1, 1].forEach((side) => {
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 24), chrome);
    rose.rotation.z = Math.PI / 2;
    rose.position.set(side * 0.021, 0.68, DW - 0.055);
    pivot.add(rose);
    const spindle = new THREE.Group();
    spindle.position.set(side * 0.028, 0.68, DW - 0.055);
    pivot.add(spindle);
    const lever = rbox(0.012, 0.012, 0.08, chrome, 0.005);
    lever.position.set(side * 0.006, 0, -0.03);
    spindle.add(lever);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 12), chrome);
    neck.rotation.z = Math.PI / 2;
    spindle.add(neck);
    // where the fingers close round the lever
    const grip = new THREE.Object3D();
    grip.position.set(side * 0.006, 0, -0.045);
    spindle.add(grip);
    handles[side > 0 ? 'outside' : 'inside'] = { spindle, grip };
  });
  // hinges
  [0.12, DH / 2, DH - 0.12].forEach((y) => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 12), chrome);
    h.position.set(0.0, y, -0.002);
    pivot.add(h);
  });
  // brass name plaque on the hallway side
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.0625), new THREE.MeshStandardMaterial({ map: plaqueTexture(), metalness: 0.6, roughness: 0.35, envMap, envMapIntensity: 0.8 }));
  plaque.rotation.y = Math.PI / 2;
  plaque.position.set(0.0182, 1.0, DW / 2);
  pivot.add(plaque);

  // hallway outside the door: doormat, wall lights, plant, art, doorbell
  group.add(createHallway(envMap));

  pivot.traverse((o) => o.isMesh && (o.name = 'Door'));

  return {
    group,
    pivot,
    handles,
    // world position of a handle grip ('outside' = hallway side, 'inside' = room side)
    handlePoint(which) {
      const g = handles[which].grip;
      g.updateWorldMatrix(true, false);
      return g.getWorldPosition(new THREE.Vector3());
    },
    // press the lever down (or let it spring back)
    pressHandle(which, down, duration = 0.18) {
      return gsap.to(handles[which].spindle.rotation, { x: down ? -0.55 : 0, duration, ease: down ? 'power2.out' : 'back.out(2)' });
    },
    // world-space points for the camera path (respects the room's scale on mobile)
    path(roomScene) {
      const s = roomScene.scale.x;
      return {
        // stand further back on narrow (portrait) screens so the whole door fits
        outside: new THREE.Vector3((WALL_X + (window.innerWidth < window.innerHeight ? 1.55 : 1.15)) * s, 0.28 * s, (DOOR_Z + (window.innerWidth > 700 ? 0.25 : 0)) * s),
        doorway: new THREE.Vector3((WALL_X + T / 2) * s, 0.42 * s, DOOR_Z * s),
      };
    },
  };
}

// ---------------------------------------------------------------------------
export function runIntro({ camera, doorway, roomScene, endPos, endRot, onDone }) {
  const overlay = document.getElementById('intro-overlay');
  const enterBtn = document.getElementById('intro-enter');
  const skipBtn = document.getElementById('intro-skip');
  const { outside, doorway: through } = doorway.path(roomScene);
  camera.position.copy(outside);
  camera.rotation.set(0, Math.PI / 2, 0);
  const startQ = camera.quaternion.clone();
  const endQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(endRot.x, endRot.y, endRot.z));
  const endV = new THREE.Vector3(endPos.x, endPos.y, endPos.z);
  let finished = false;
  let flight;
  let started = false;
  overlay.classList.add('intro-overlay--ready');

  const finish = (skip = false) => {
    if (finished) return;
    finished = true;
    flight?.kill();
    gsap.killTweensOf(doorway.pivot.rotation);
    if (skip) stopSounds();
    camera.position.copy(endV);
    camera.quaternion.copy(endQ);
    document.body.classList.remove('intro', 'entering');
    overlay.remove();
    skipBtn.remove();
    onDone?.();
    if (skip || reducedMotion.matches) doorway.pivot.rotation.y = 0;
    else {
      sound.doorClose(0.15);
      gsap.to(doorway.pivot.rotation, { y: 0, duration: 1.1, ease: 'sine.inOut', delay: 0.15 });
    }
  };

  const start = async () => {
    if (started) return;
    started = true;
    enterBtn.disabled = true;
    document.body.classList.add('entering');
    overlay.classList.add('intro-overlay--leaving');
    unlock();
    if (reducedMotion.matches) { finish(true); return; }
    // Give cached recordings a short opportunity to decode, without blocking entry.
    await Promise.race([preloadSounds(), new Promise((resolve) => setTimeout(resolve, 300))]);
    if (finished) return;
    sound.doorOpen();
    doorway.pressHandle('outside', true);
    gsap.to(doorway.pivot.rotation, { y: -1.7, duration: 1.1, ease: 'sine.inOut' });
    gsap.delayedCall(0.55, () => doorway.pressHandle('outside', false));
    // One continuous path avoids the abrupt direction change at the threshold.
    const curve = new THREE.CatmullRomCurve3([
      outside,
      through.clone().add(new THREE.Vector3(0.25 * roomScene.scale.x, 0, 0)),
      through.clone().add(new THREE.Vector3(-0.15 * roomScene.scale.x, 0, 0)),
      endV,
    ]);
    const progress = { p: 0 };
    sound.footsteps(4, 0.48, 0.7);
    flight = gsap.to(progress, {
      p: 1, duration: 3.2, delay: 0.25, ease: 'sine.inOut',
      onUpdate: () => {
        camera.position.copy(curve.getPoint(progress.p));
        const turn = THREE.MathUtils.smootherstep(progress.p, 0.35, 1);
        camera.quaternion.slerpQuaternions(startQ, endQ, turn);
      },
      onComplete: () => finish(),
    });
  };
  enterBtn.addEventListener('click', (event) => { event.stopPropagation(); start(); });
  skipBtn.addEventListener('click', (event) => { event.stopPropagation(); finish(true); });
}
