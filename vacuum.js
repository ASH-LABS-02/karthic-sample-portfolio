import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from './performance.js';
import { VacuumMotion } from './vacuum-motion.js';

const FLOOR = -.47;
const onRug = (x, z) => x > .315 && x < 1.365 && z > -.445 && z < .805;
const floorAt = (x, z) => FLOOR + (onRug(x, z) ? .0035 : .0012);

function texture(w, h, draw) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const map = new THREE.CanvasTexture(canvas); map.encoding = THREE.sRGBEncoding; map.anisotropy = 8;
  return map;
}

export function createVacuum(envMap) {
  const group = new THREE.Group(); group.name = 'Demo Robot system'; group.userData.dynamic = true;
  const body = new THREE.Group(); body.name = 'Demo Robot robot'; group.add(body);
  const motion = new VacuumMotion();
  const shell = new THREE.MeshStandardMaterial({ color: 0x252d30, roughness: .43, metalness: .28, envMap, envMapIntensity: .3 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x14191a, roughness: .92 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9ba5a6, roughness: .38, metalness: .8, envMap, envMapIntensity: .4 });
  const red = new THREE.MeshStandardMaterial({ color: 0x94392e, roughness: .55, metalness: .3 });
  const pcb = new THREE.MeshStandardMaterial({ color: 0x286b59, roughness: .7 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2f6590, roughness: .55 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xd6b84b, roughness: .65 });
  const add = (geometry, material, x = 0, y = 0, z = 0, parent = body) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  };
  const box = (w, h, d, material, x, y, z, parent = body) => add(new RoundedBoxGeometry(w, h, d, 2, Math.min(.001, h / 3)), material, x, y, z, parent);
  const cylinder = (radius, h, material, x, y, z, parent = body) => add(new THREE.CylinderGeometry(radius, radius, h, 28), material, x, y, z, parent);
  const ring = (radius, thickness, material, y) => {
    const object = add(new THREE.TorusGeometry(radius, thickness, 7, 48), material, 0, y, 0); object.rotation.x = Math.PI / 2; return object;
  };

  // Open PLA chassis, a continuous front bumper and visible hardware.
  cylinder(.122, .012, shell, 0, .025, 0);
  const wall = add(new THREE.CylinderGeometry(.124, .124, .073, 48, 1, true), shell, 0, .065, 0);
  wall.material = shell.clone(); wall.material.side = THREE.DoubleSide;
  ring(.124, .0024, metal, .102); ring(.123, .003, rubber, .029);
  const bumper = add(new THREE.TorusGeometry(.127, .0055, 7, 36, Math.PI), rubber, 0, .046, 0); bumper.rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI * 2 / 10;
    cylinder(.0017, .002, metal, Math.sin(a) * .116, .103, Math.cos(a) * .116);
  }
  box(.04, .022, .03, amber, -.055, .049, .045);
  box(.04, .005, .048, pcb, -.065, .070, -.025);
  box(.021, .003, .025, rubber, -.065, .075, -.025);
  box(.017, .005, .014, metal, -.065, .077, -.050);
  box(.040, .006, .032, pcb, .063, .069, -.047);
  box(.031, .013, .025, red, .063, .078, -.047);
  for (let i = 0; i < 7; i++) box(.002, .009, .027, red, .049 + i * .0044, .088, -.047);
  // The central suction motor and its red impeller cap.
  cylinder(.054, .032, rubber, 0, .059, 0);
  cylinder(.052, .004, metal, 0, .077, 0);
  cylinder(.049, .005, rubber, 0, .081, 0);
  const rotor = new THREE.Group(); rotor.position.y = .086; rotor.userData.dynamic = true; body.add(rotor);
  cylinder(.019, .003, red, 0, 0, 0, rotor);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const fin = box(.017, .002, .009, red, Math.sin(a) * .026, .001, Math.cos(a) * .026, rotor); fin.rotation.y = a + .35;
  }
  cylinder(.007, .004, metal, 0, .003, 0, rotor); mergeStatic(rotor);

  // Ribbon-like colored wiring connects the boards to the motor.
  [0xe1b94e, 0xb94a40, 0x428b75, 0x5b8cb0, 0xd3cab2].forEach((color, i) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.074, .077, -.04 + i * .006), new THREE.Vector3(-.04, .11 + i * .001, -.073),
      new THREE.Vector3(.02, .112, -.078 + i * .004), new THREE.Vector3(.063, .078, -.04 + i * .004),
    ]);
    add(new THREE.TubeGeometry(curve, 14, .001, 5, false), new THREE.MeshStandardMaterial({ color, roughness: .65 }));
  });

  // Front ultrasonic transducers, IR sensors and the ESP32-CAM lens.
  box(.064, .026, .005, pcb, 0, .052, .127);
  [-.019, .019].forEach(x => {
    const rim = cylinder(.012, .010, metal, x, .052, .134); rim.rotation.x = Math.PI / 2;
    const face = cylinder(.0091, .001, rubber, x, .052, .140); face.rotation.x = Math.PI / 2;
    const grille = add(new THREE.TorusGeometry(.006, .0006, 4, 14), metal, x, .052, .141);
    grille.castShadow = false;
  });
  [-1, 1].forEach(side => box(.013, .011, .008, rubber, side * .084, .035, .094));
  box(.028, .026, .006, pcb, .073, .099, .034);
  const lens = cylinder(.009, .015, rubber, .073, .1, .044); lens.rotation.x = Math.PI / 2;
  const lensRim = cylinder(.0065, .002, metal, .073, .1, .053); lensRim.rotation.x = Math.PI / 2;
  const glass = cylinder(.0044, .001, new THREE.MeshStandardMaterial({ color: 0x163945, roughness: .12, metalness: .65, envMap }), .073, .1, .055); glass.rotation.x = Math.PI / 2;
  box(.016, .018, .025, blue, .073, .073, .03);
  add(new THREE.SphereGeometry(.0023, 9, 7), new THREE.MeshStandardMaterial({ color: 0x89d2b3, emissive: 0x63ab8e, emissiveIntensity: .7 }), -.077, .079, .018);

  const logo = texture(256, 80, x => {
    x.fillStyle = '#d8c472'; x.textAlign = 'center'; x.font = '700 53px Arial'; x.fillText('DEMO', 128, 58);
  });
  add(new THREE.PlaneGeometry(.052, .016), new THREE.MeshStandardMaterial({ map: logo, transparent: true, roughness: .8, depthWrite: false, emissiveMap: logo, emissive: 0xffffff, emissiveIntensity: .05 }), 0, .084, .1255);
  const bolt = texture(64, 96, x => { x.fillStyle = '#d6b84b'; x.beginPath(); x.moveTo(37, 4); x.lineTo(9, 54); x.lineTo(29, 50); x.lineTo(23, 91); x.lineTo(56, 35); x.lineTo(35, 40); x.closePath(); x.fill(); });
  [-1, 1].forEach(side => {
    const decal = add(new THREE.PlaneGeometry(.025, .041), new THREE.MeshStandardMaterial({ map: bolt, transparent: true, roughness: .8, depthWrite: false }), side * .1246, .065, 0);
    decal.rotation.y = side * Math.PI / 2;
  });

  const wheels = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .105, .022, -.015); pivot.userData.dynamic = true; body.add(pivot);
    const tyre = cylinder(.022, .019, rubber, 0, 0, 0, pivot); tyre.geometry.rotateZ(Math.PI / 2);
    const hub = cylinder(.010, .001, metal, side * .01, 0, 0, pivot); hub.geometry.rotateZ(Math.PI / 2);
    box(.0015, .012, .0025, amber, side * .011, .008, 0, pivot);
    return pivot;
  });
  const brushMaterial = new THREE.MeshStandardMaterial({ color: 0xc4b998, roughness: .95 });
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const brushes = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .095, .007, .071); pivot.userData.dynamic = true; body.add(pivot);
    cylinder(.012, .006, rubber, 0, .003, 0, pivot);
    const bristles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.00065, .00065, 1, 5), brushMaterial, 24);
    for (let i = 0; i < 24; i++) {
      const a = Math.floor(i / 8) * Math.PI * 2 / 3 + (i % 8 - 3.5) * .038;
      const direction = new THREE.Vector3(Math.sin(a), -.025, Math.cos(a)).normalize(); quaternion.setFromUnitVectors(up, direction);
      matrix.compose(new THREE.Vector3(Math.sin(a) * .033, .001, Math.cos(a) * .033), quaternion, new THREE.Vector3(1, .044, 1)); bristles.setMatrixAt(i, matrix);
    }
    pivot.add(bristles); return pivot;
  });
  const mopTexture = texture(64, 64, (x, w, h) => {
    x.fillStyle = '#899f9a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#b6c7bc'; x.lineWidth = 1;
    for (let i = 0; i < 64; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); }
  });
  const mop = box(.13, .006, .058, new THREE.MeshStandardMaterial({ map: mopTexture, roughness: 1 }), 0, .005, -.10);
  mop.userData.dynamic = true;

  // Soft contact shadow: no new real-time light or shadow map.
  const shadowMap = texture(64, 64, (x, w, h) => {
    const gradient = x.createRadialGradient(32, 32, 12, 32, 32, 31); gradient.addColorStop(0, 'rgba(0,0,0,.30)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gradient; x.fillRect(0, 0, w, h);
  });
  const shadow = add(new THREE.PlaneGeometry(.35, .35), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }), 0, .0003, 0); shadow.rotation.x = -Math.PI / 2; shadow.castShadow = false; shadow.raycast = () => {};
  mergeStatic(body);
  body.traverse(object => { if (object.isMesh) object.name = 'Vacuum'; });

  // Small floor flecks are gathered by the brushes; they never intercept clicks.
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xad9e7a, roughness: 1 }), 32);
  dust.name = 'Demo Robot floor dust'; dust.raycast = () => {}; dust.frustumCulled = false; group.add(dust);
  const grains = Array.from({ length: 32 }, (_, i) => {
    const target = motion.targets[(i * 7 + 3) % motion.targets.length];
    return { x: target.x + Math.sin(i * 13) * .025, z: target.z + Math.cos(i * 7) * .025, size: .0013 + (i % 4) * .0004, collected: -1 };
  });
  // A quiet, short-lived mop trace on hard floor, rather than a bright trail.
  const wipeMap = texture(64, 64, x => {
    const gradient = x.createRadialGradient(32, 32, 4, 32, 32, 32); gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gradient; x.fillRect(0, 0, 64, 64);
  });
  const wipes = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.12, .09), new THREE.MeshBasicMaterial({ map: wipeMap, color: 0x9aada8, transparent: true, opacity: 0, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.raycast = () => {}; group.add(mesh); return { mesh, age: 10 };
  });
  let hovered = false, elapsed = 0, brushAngle = 0, wipeDistance = 0, wipeIndex = 0, collectedCount = 0;
  const dustPosition = new THREE.Vector3(), dustScale = new THREE.Vector3(), identity = new THREE.Quaternion();

  return {
    group, body, motion,
    get collectedCount() { return collectedCount; },
    setHovered(value) { hovered = value; },
    setChairPosition(x, z) { motion.setChairPosition(x, z); },
    update(delta, { paused = false, person = null } = {}) {
      const dt = Math.min(delta, .05), step = motion.update(dt, { paused: paused || hovered, person });
      const { x, z } = motion.position;
      body.position.set(x, floorAt(x, z), z); body.rotation.y = motion.heading;
      wheels[0].rotation.x += (step.distance + step.turn * .105) / .022;
      wheels[1].rotation.x += (step.distance - step.turn * .105) / .022;
      if (!paused) { elapsed += dt; brushAngle += dt * 6; }
      brushes.forEach((brush, i) => { brush.rotation.y = brushAngle * (i ? -1 : 1); }); rotor.rotation.y = brushAngle * 3;
      mop.position.y += ((onRug(x, z) ? .015 : .005) - mop.position.y) * (1 - Math.exp(-10 * dt));
      grains.forEach((grain, i) => {
        if (!paused && grain.collected < 0 && Math.hypot(x - grain.x, z - grain.z) < .145) { grain.collected = elapsed; collectedCount++; }
        const progress = grain.collected < 0 ? 0 : Math.min(1, (elapsed - grain.collected) / .35);
        dustPosition.set(grain.x + (x - grain.x) * progress, floorAt(grain.x, grain.z) + .002 + Math.sin(progress * Math.PI) * .010, grain.z + (z - grain.z) * progress);
        dustScale.setScalar(grain.size * (1 - progress)); matrix.compose(dustPosition, identity, dustScale); dust.setMatrixAt(i, matrix);
      });
      dust.instanceMatrix.needsUpdate = true;
      wipeDistance += step.distance;
      const wipeX = x - Math.sin(motion.heading) * .10, wipeZ = z - Math.cos(motion.heading) * .10;
      if (wipeDistance > .10 && !onRug(x, z) && !onRug(wipeX, wipeZ)) {
        const wipe = wipes[wipeIndex++ % wipes.length]; wipeDistance = 0; wipe.age = 0;
        wipe.mesh.position.set(wipeX, FLOOR + .0017, wipeZ); wipe.mesh.rotation.z = -motion.heading;
      }
      wipes.forEach(wipe => { if (!paused) wipe.age += dt; wipe.mesh.material.opacity = .055 * Math.max(0, 1 - wipe.age / 5); });
    },
  };
}
