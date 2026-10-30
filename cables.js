// Power cabling for the desk, modelled on a typical Indian home setup:
// - monitor and PC power cords with moulded 3-pin plugs
// - IEC (C13 "kettle lead") connector into the PC's power supply
// - a floor power strip with 3-pin sockets, per-socket switches and indicator lights
// - a modular wall switch plate the strip is plugged into
// - the keyboard's USB cable to the back of the PC
// Coordinates are in the room model's space: left wall at x = -0.274,
// desk top at y = 0.018, desk back edge at x = -0.269, floor at y = -0.47.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FLOOR = -0.47;
const DESK = 0.018;
const BEHIND = -0.2716; // the gap between the desk's back edge and the wall
const R_POWER = 0.0026; // power cord radius
const R_USB = 0.0017;

const rubber = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.42, metalness: 0.05 });
const plugBlack = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.35, metalness: 0.05 });
const plugWhite = new THREE.MeshStandardMaterial({ color: 0xf1f0ea, roughness: 0.35 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.3, metalness: 0.9 });
const steel = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.35, metalness: 0.85 });

const v = (x, y, z) => new THREE.Vector3(x, y, z);

function shade(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// smooth cable through the given points (centripetal avoids kinks/overshoot)
function cable(points, radius = R_POWER, material = rubber) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const segments = Math.ceil(curve.getLength() / 0.002);
  return shade(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 10, false), material));
}

function rbox(w, h, d, material, r = 0.002) {
  return shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material));
}

// tapered rubber boot where the cord leaves a plug (points along +y)
function boot(length, r0, r1, material = plugBlack) {
  const g = new THREE.CylinderGeometry(r1, r0, length, 16);
  g.translate(0, length / 2, 0);
  const mesh = shade(new THREE.Mesh(g, material));
  // grip rings
  for (let i = 1; i <= 3; i++) {
    const ring = shade(
      new THREE.Mesh(new THREE.TorusGeometry(r0 - (r0 - r1) * (i / 4) + 0.0002, 0.0005, 6, 16), material)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = (length * i) / 4.2;
    mesh.add(ring);
  }
  return mesh;
}

// Indian moulded 3-pin plug, pins pointing down (-y), cord leaving the top
function indianPlug(material = plugBlack) {
  const g = new THREE.Group();
  const body = rbox(0.024, 0.024, 0.02, material, 0.004);
  body.position.y = 0.012;
  g.add(body);
  // finger grips on the sides
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 4; i++) {
      const ridge = rbox(0.0012, 0.003, 0.016, material, 0.0005);
      ridge.position.set(s * 0.0122, 0.007 + i * 0.0035, 0);
      g.add(ridge);
    }
  });
  const b = boot(0.013, 0.0065, 0.0036, material);
  b.position.y = 0.024;
  g.add(b);
  return { group: g, top: 0.037 };
}

// ---------------------------------------------------------------------------
// textures
function stripTopTexture(sockets, length, width) {
  const PX = 4000; // px per metre
  const c = document.createElement('canvas');
  c.width = Math.round(length * PX);
  c.height = Math.round(width * PX);
  const x = c.getContext('2d');
  x.fillStyle = '#f3f2ec';
  x.fillRect(0, 0, c.width, c.height);
  const cy = c.height / 2;
  sockets.forEach((z) => {
    const cx = (z + length / 2) * PX;
    // recessed socket face
    x.fillStyle = '#e4e2da';
    x.beginPath();
    x.arc(cx, cy, 0.0145 * PX, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#cfcdc4';
    x.lineWidth = 3;
    x.stroke();
    // 3-pin holes (earth on top) + flat slots for 2-pin plugs
    x.fillStyle = '#26272a';
    const hole = (hx, hy, r) => {
      x.beginPath();
      x.arc(hx, hy, r, 0, Math.PI * 2);
      x.fill();
    };
    hole(cx, cy - 0.0062 * PX, 0.0024 * PX);
    hole(cx - 0.0048 * PX, cy + 0.004 * PX, 0.0017 * PX);
    hole(cx + 0.0048 * PX, cy + 0.004 * PX, 0.0017 * PX);
    x.fillRect(cx - 0.0068 * PX, cy + 0.0005 * PX, 0.0014 * PX, 0.006 * PX);
    x.fillRect(cx + 0.0054 * PX, cy + 0.0005 * PX, 0.0014 * PX, 0.006 * PX);
    // individual switch well + red indicator
    x.fillStyle = '#dad8d0';
    x.fillRect(cx + 0.0175 * PX, cy - 0.006 * PX, 0.0055 * PX, 0.012 * PX);
  });
  // rating text, as moulded into real strips
  x.fillStyle = '#b5b3aa';
  x.font = `${Math.round(0.0032 * PX)}px Arial, sans-serif`;
  x.textAlign = 'right';
  x.fillText('240V~ 10A', c.width - 0.006 * PX, c.height - 0.004 * PX);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

function wallPlateTexture() {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 280;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f3ee';
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#e1dfd7';
  x.lineWidth = 6;
  x.strokeRect(18, 18, c.width - 36, c.height - 36);
  // socket module (left)
  x.fillStyle = '#e8e6de';
  x.fillRect(40, 50, 170, 180);
  x.fillStyle = '#2a2b2e';
  x.beginPath();
  x.arc(125, 95, 13, 0, Math.PI * 2);
  x.fill();
  [[95, 160], [155, 160]].forEach(([hx, hy]) => {
    x.beginPath();
    x.arc(hx, hy, 9, 0, Math.PI * 2);
    x.fill();
  });
  // switch module (right) is a separate rocker mesh
  x.fillStyle = '#e8e6de';
  x.fillRect(230, 50, 90, 180);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
export function createCables() {
  const group = new THREE.Group();

  // ===== power strip lying on the floor against the wall =====
  const STRIP_X = -0.226;
  const STRIP_Z = 0.12;
  const LEN = 0.24;
  const WID = 0.05;
  const H = 0.03;
  const sockets = [-0.072, -0.022, 0.028, 0.078];
  const strip = new THREE.Group();
  strip.position.set(STRIP_X, FLOOR, STRIP_Z);
  group.add(strip);
  const stripBody = rbox(WID, H, LEN, plugWhite, 0.008);
  stripBody.position.y = H / 2;
  strip.add(stripBody);
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(LEN - 0.012, WID - 0.012),
    new THREE.MeshStandardMaterial({ map: stripTopTexture(sockets, LEN - 0.012, WID - 0.012), roughness: 0.45 })
  );
  // texture x runs along z, texture y across x
  top.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ');
  top.position.y = H + 0.0003;
  top.receiveShadow = true;
  strip.add(top);

  // per-socket rocker switches with red "on" lights
  const ledOn = new THREE.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xff2a1a, emissiveIntensity: 1.6 });
  sockets.forEach((z) => {
    const rocker = rbox(0.0045, 0.004, 0.0105, plugWhite, 0.0012);
    rocker.position.set(0, H + 0.002, z + 0.0203);
    rocker.rotation.x = -0.18;
    strip.add(rocker);
    const led = shade(new THREE.Mesh(new THREE.SphereGeometry(0.0013, 12, 8), ledOn));
    led.position.set(0.012, H + 0.0004, z + 0.0203);
    strip.add(led);
  });
  // illuminated master switch at the far end
  const master = rbox(0.016, 0.006, 0.012, new THREE.MeshStandardMaterial({ color: 0xd8261e, emissive: 0xb0140d, emissiveIntensity: 0.9, roughness: 0.25 }), 0.002);
  master.position.set(0, H + 0.0025, -LEN / 2 + 0.014);
  master.rotation.x = 0.2;
  strip.add(master);
  // cord strain relief at the other end
  const stripBoot = boot(0.014, 0.0055, 0.0034, plugWhite);
  stripBoot.rotation.x = Math.PI / 2;
  stripBoot.position.set(0, 0.012, LEN / 2 - 0.002);
  strip.add(stripBoot);

  // plugs pushed into sockets 0 (PC) and 2 (monitor)
  const plugInto = (i) => {
    const { group: p, top: h } = indianPlug();
    p.position.set(STRIP_X, FLOOR + H, STRIP_Z + sockets[i]);
    p.rotation.y = Math.PI / 2;
    group.add(p);
    return v(STRIP_X, FLOOR + H + h, STRIP_Z + sockets[i]);
  };
  const pcPlug = plugInto(0);
  const monPlug = plugInto(2);

  // ===== modular wall switch plate, strip plugged in =====
  const PLATE_Z = 0.33;
  const PLATE_Y = FLOOR + 0.13;
  const plate = rbox(0.008, 0.07, 0.09, new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.4 }), 0.003);
  plate.position.set(-0.27, PLATE_Y, PLATE_Z);
  group.add(plate);
  const plateFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.07),
    new THREE.MeshStandardMaterial({ map: wallPlateTexture(), roughness: 0.4 })
  );
  plateFace.rotation.y = Math.PI / 2;
  plateFace.position.set(-0.2659, PLATE_Y, PLATE_Z);
  group.add(plateFace);
  // rocker switch (on) with red indicator dot
  const wallRocker = rbox(0.004, 0.026, 0.014, plugWhite, 0.0015);
  wallRocker.position.set(-0.2635, PLATE_Y, PLATE_Z - 0.0275);
  wallRocker.rotation.z = 0.12;
  group.add(wallRocker);
  const wallLed = shade(new THREE.Mesh(new THREE.SphereGeometry(0.0012, 10, 8), ledOn));
  wallLed.position.set(-0.2648, PLATE_Y + 0.017, PLATE_Z - 0.0275);
  group.add(wallLed);
  // the strip's white plug in the wall socket: pins into the wall, cord out the front
  const { group: wallPlug } = indianPlug(plugWhite);
  wallPlug.rotation.z = -Math.PI / 2; // pins point into the wall (-x)
  wallPlug.position.set(-0.2659, PLATE_Y - 0.004, PLATE_Z + 0.0115);
  group.add(wallPlug);
  const wallPlugOut = v(-0.2659 + 0.037, PLATE_Y - 0.004, PLATE_Z + 0.0115);
  group.add(
    cable(
      [
        wallPlugOut,
        v(wallPlugOut.x + 0.012, PLATE_Y - 0.012, wallPlugOut.z),
        v(-0.218, FLOOR + 0.05, PLATE_Z + 0.004),
        v(-0.22, FLOOR + R_POWER + 0.003, PLATE_Z - 0.02),
        v(-0.224, FLOOR + R_POWER, STRIP_Z + LEN / 2 + 0.03),
        v(STRIP_X, 0.012 + FLOOR, STRIP_Z + LEN / 2 + 0.012),
      ],
      R_POWER,
      new THREE.MeshStandardMaterial({ color: 0xeeede6, roughness: 0.45 })
    )
  );

  // a plug's cord rises out of the boot, curls over and drops to the floor
  const fromPlug = (p, towardsZ) => [
    v(p.x, p.y, p.z),
    v(p.x, p.y + 0.01, p.z),
    v(p.x - 0.007, p.y + 0.019, p.z + towardsZ * 0.003),
    v(p.x - 0.022, p.y + 0.008, p.z + towardsZ * 0.008),
    v(-0.255, FLOOR + 0.01, p.z + towardsZ * 0.016),
    v(-0.262, FLOOR + R_POWER, p.z + towardsZ * 0.03),
  ];

  // ===== monitor power cord =====
  // IEC plug in the back of the monitor
  const monIec = rbox(0.02, 0.012, 0.016, plugBlack, 0.002);
  monIec.position.set(-0.066, 0.14, 0.19);
  group.add(monIec);
  group.add(
    cable(
      [
        v(-0.07, 0.132, 0.19),
        v(-0.078, 0.1, 0.192),
        v(-0.09, 0.05, 0.197),
        v(-0.105, DESK + R_POWER + 0.004, 0.203),
        v(-0.15, DESK + R_POWER, 0.206),
        v(-0.215, DESK + R_POWER, 0.198),
        v(-0.255, DESK + R_POWER, 0.19),
        v(-0.268, DESK + 0.0005, 0.188),
        v(BEHIND, DESK - 0.01, 0.187),
        v(BEHIND, -0.12, 0.186),
        v(BEHIND, -0.36, 0.184),
        v(BEHIND, FLOOR + 0.03, 0.182),
        v(BEHIND + 0.001, FLOOR + R_POWER + 0.004, 0.172),
        ...fromPlug(monPlug, 1).reverse(),
      ]
    )
  );

  // ===== PC power: IEC C13 into the PSU at the bottom back of the case =====
  const PSU_Y = 0.07;
  const PSU_Z = -0.305;
  const psuPanel = rbox(0.004, 0.06, 0.1, new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.5, metalness: 0.6 }), 0.001);
  psuPanel.position.set(-0.2095, PSU_Y, PSU_Z);
  group.add(psuPanel);
  // PSU fan grille rings
  for (let i = 1; i <= 4; i++) {
    const ring = shade(new THREE.Mesh(new THREE.TorusGeometry(0.0055 * i, 0.0007, 6, 32), steel));
    ring.rotation.y = Math.PI / 2;
    ring.position.set(-0.212, PSU_Y + 0.003, PSU_Z + 0.022);
    group.add(ring);
  }
  // rocker switch on the PSU
  const psuSwitch = rbox(0.004, 0.012, 0.008, plugBlack, 0.001);
  psuSwitch.position.set(-0.2125, PSU_Y + 0.012, PSU_Z - 0.03);
  group.add(psuSwitch);
  // C13 connector + boot pointing away from the case (-x)
  const c13 = rbox(0.018, 0.016, 0.022, plugBlack, 0.002);
  c13.position.set(-0.22, PSU_Y - 0.008, PSU_Z - 0.008);
  group.add(c13);
  const c13Boot = boot(0.012, 0.006, 0.0036);
  c13Boot.rotation.z = Math.PI / 2;
  c13Boot.position.set(-0.229, PSU_Y - 0.008, PSU_Z - 0.008);
  group.add(c13Boot);
  group.add(
    cable(
      [
        v(-0.24, PSU_Y - 0.008, PSU_Z - 0.008),
        v(-0.252, PSU_Y - 0.02, PSU_Z - 0.005),
        v(-0.259, DESK + 0.012, PSU_Z),
        v(-0.266, DESK + 0.002, PSU_Z + 0.004),
        v(BEHIND, DESK - 0.012, PSU_Z + 0.006),
        v(BEHIND, -0.14, PSU_Z + 0.01),
        v(BEHIND, -0.38, PSU_Z + 0.02),
        v(BEHIND, FLOOR + 0.03, -0.24),
        v(BEHIND + 0.001, FLOOR + R_POWER + 0.004, -0.2),
        v(-0.266, FLOOR + R_POWER, -0.1),
        v(-0.264, FLOOR + R_POWER, -0.02),
        ...fromPlug(pcPlug, -1).reverse(),
      ]
    )
  );

  // ===== keyboard USB cable to the back of the PC =====
  group.add(
    cable(
      [
        v(0.031, DESK + 0.006, 0.23),
        v(0.02, DESK + R_USB + 0.001, 0.228),
        v(-0.01, DESK + R_USB, 0.205),
        v(-0.07, DESK + R_USB, 0.13),
        v(-0.13, DESK + R_USB, 0.03),
        v(-0.17, DESK + R_USB, -0.1),
        v(-0.205, DESK + R_USB, -0.185),
        v(-0.222, DESK + 0.02, -0.245),
        v(-0.219, 0.13, -0.27),
        v(-0.214, 0.152, -0.272),
      ],
      R_USB
    )
  );
  const usb = rbox(0.009, 0.012, 0.016, plugBlack, 0.0015);
  usb.position.set(-0.2125, 0.153, -0.272);
  group.add(usb);
  const usbMetal = rbox(0.004, 0.0045, 0.012, steel, 0.0005);
  usbMetal.position.set(-0.2085, 0.153, -0.272);
  group.add(usbMetal);

  return group;
}
