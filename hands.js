// First-person hands: two hands in hoodie sleeves that follow the camera,
// sway while walking, and reach out to press / grab things.
// They live in their own scene and are drawn after the room with a cleared
// depth buffer, so they never clip into walls or furniture.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';

// finger curl presets (radians per joint, negative = curl towards the palm)
// order: thumb, index, middle, ring, pinky
const POSES = {
  relaxed: [0.12, 0.1, 0.14, 0.18, 0.22],
  point: [0.9, 0.02, 1.35, 1.4, 1.45],
  grab: [0.8, 0.85, 0.95, 1.0, 1.05],
  pinch: [0.65, 0.6, 1.2, 1.3, 1.35],
  press: [1.35, 0.85, 0.95, 1.0, 1.05], // thumb pushed down onto a button
  // fingers wrapped round a slim object lying in the palm (a remote, a phone)
  hold: [0.15, 0.75, 0.8, 0.85, 0.9],
  holdPress: [0.5, 0.75, 0.8, 0.85, 0.9], // thumb dips onto a button
};

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

const skin = new THREE.MeshStandardMaterial({
  color: 0x8a5a3c, // neutral sample material; customize as desired
  roughness: 0.58,
  metalness: 0,
  emissive: 0x1c0804, // a hint of warmth, like light scattering in skin
});
const nailMat = new THREE.MeshStandardMaterial({ color: 0xb58572, roughness: 0.3 });
const knitTex = canvasTexture(128, 128, (x, w, h) => {
  x.fillStyle = '#1f7a78';
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.07})`;
    x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
});
knitTex.wrapS = knitTex.wrapT = THREE.RepeatWrapping;
knitTex.repeat.set(3, 3);
const sleeveMat = new THREE.MeshStandardMaterial({ map: knitTex, roughness: 0.95 });
const ribTex = canvasTexture(128, 32, (x, w, h) => {
  x.fillStyle = '#17615f';
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 6) {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.fillRect(i, 0, 2, h);
  }
});
ribTex.wrapS = THREE.RepeatWrapping;
ribTex.repeat.set(6, 1);
const cuffMat = new THREE.MeshStandardMaterial({ map: ribTex, roughness: 0.95 });

const THUMB_REST = { x: 0.1, y: 0.75, z: -0.6 };
const THUMB_BASE = { x: -0.028, y: -0.003, z: -0.02 };

// one segment of a finger, pointing along local -z, pivoting at its base
function segment(radius, length, tip) {
  const pivot = new THREE.Group();
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.0001, length - radius * 2), 4, 12);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, -length / 2);
  // slightly flattened, like a real finger
  geo.scale(1, 0.85, 1);
  pivot.add(new THREE.Mesh(geo, skin));
  if (tip) {
    const nail = new THREE.Mesh(new RoundedBoxGeometry(radius * 1.25, radius * 0.22, length * 0.45, 2, radius * 0.1), nailMat);
    nail.position.set(0, radius * 0.7, -length * 0.66);
    pivot.add(nail);
  }
  return pivot;
}

function finger(radius, length, joints = 3) {
  const ratios = joints === 3 ? [0.45, 0.3, 0.25] : [0.55, 0.45];
  const root = new THREE.Group();
  const segs = [];
  let parent = root;
  ratios.forEach((r, i) => {
    const s = segment(radius * (1 - i * 0.08), length * r, i === ratios.length - 1);
    if (i > 0) s.position.z = -length * ratios[i - 1];
    parent.add(s);
    segs.push(s);
    parent = s;
  });
  return { root, segs };
}

// a right hand + forearm; origin at the wrist, fingers along -z, palm down
function buildArm() {
  const arm = new THREE.Group();
  const hand = new THREE.Group();
  arm.add(hand);

  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.054, 0.017, 0.062, 4, 0.008), skin);
  palm.position.set(0, 0, -0.032);
  hand.add(palm);
  // fleshy pad at the base of the thumb
  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), skin);
  pad.scale.set(1, 0.7, 1.4);
  pad.position.set(-0.017, -0.004, -0.018);
  hand.add(pad);

  const fingers = [];
  [
    [-0.019, 0.05, 0.0072], // index (thumb side is -x)
    [-0.0065, 0.055, 0.0074],
    [0.0065, 0.051, 0.007],
    [0.019, 0.041, 0.0062],
  ].forEach(([x, len, r], i) => {
    const f = finger(r, len);
    f.root.position.set(x, 0.001, -0.062);
    f.root.rotation.y = (i - 1.5) * -0.05; // slight natural splay
    hand.add(f.root);
    fingers.push(f);
  });
  const thumb = finger(0.0078, 0.045, 2);
  thumb.root.position.set(THUMB_BASE.x, THUMB_BASE.y, THUMB_BASE.z);
  thumb.root.rotation.set(THUMB_REST.x, THUMB_REST.y, THUMB_REST.z);
  hand.add(thumb.root);

  // wrist + forearm in a hoodie sleeve
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.04, 16), skin);
  wrist.rotation.x = Math.PI / 2;
  wrist.scale.set(1.25, 1, 0.75);
  wrist.position.z = 0.012;
  arm.add(wrist);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.035, 20, 1, true), cuffMat);
  cuff.rotation.x = Math.PI / 2;
  cuff.scale.set(1.15, 1, 1);
  cuff.position.z = 0.04;
  arm.add(cuff);
  // the forearm sleeve is a separate mesh stretched from the shoulder to the
  // wrist every frame, so the arm always connects to the body
  const sleeveGeo = new THREE.CylinderGeometry(0.022, 0.036, 1, 20, 1, true);
  sleeveGeo.translate(0, -0.5, 0); // origin at the wrist end, extends down -y
  const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);

  const all = [thumb, ...fingers];
  const curl = { v: POSES.relaxed.slice() };
  // small living offsets added on top of the pose (idle finger movement)
  const idle = [0, 0, 0, 0, 0];
  const applyCurl = () => {
    all.forEach((f, i) => {
      const c = curl.v[i] + idle[i];
      f.segs.forEach((s, j) => {
        // thumb bends sideways-in, fingers curl down towards the palm
        s.rotation.x = -c * (i === 0 ? 0.6 : j === 0 ? 0.9 : 1.1);
      });
    });
  };
  applyCurl();
  return {
    arm,
    thumb: thumb.root,
    hand,
    sleeve,
    // gentle, independent finger flexing and a soft wrist
    live(t, seed, amount) {
      for (let i = 0; i < 5; i++) {
        idle[i] = amount * (0.07 * Math.sin(t * (0.7 + i * 0.13) + seed + i * 1.7) + 0.04 * Math.sin(t * (1.9 + i * 0.21) + i));
      }
      applyCurl();
      hand.rotation.x = amount * 0.06 * Math.sin(t * 0.8 + seed);
      hand.rotation.y = amount * 0.05 * Math.sin(t * 0.6 + seed * 2);
      hand.rotation.z = amount * 0.04 * Math.sin(t * 0.5 + seed * 3);
    },
    setPose(name, duration = 0.25) {
      const target = POSES[name] || POSES.relaxed;
      const from = curl.v.slice();
      const t = { p: 0 };
      gsap.to(t, {
        p: 1,
        duration: duration * 1.4,
        ease: 'none',
        onUpdate: () => {
          // fingers follow one after another (index first, pinky last)
          curl.v = from.map((f, i) => {
            const local = Math.min(1, Math.max(0, (t.p * 1.4 - i * 0.08) / 1));
            const e = 1 - Math.pow(1 - local, 3);
            return f + (target[i] - f) * e;
          });
          applyCurl();
        },
      });
    },
  };
}

// resting places in camera space (x right, y up, -z forward)
const REST = {
  right: { pos: new THREE.Vector3(0.095, -0.14, -0.2), rot: new THREE.Euler(-0.05, -0.2, -0.45) },
  left: { pos: new THREE.Vector3(0.095, -0.14, -0.2), rot: new THREE.Euler(-0.05, -0.2, -0.45) },
};
const HIDDEN_DROP = 0.16;
// where the arm comes from (just below and to the side of the view)
const SHOULDER = new THREE.Vector3(0.23, -0.36, 0.08);
const _wristEnd = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
function fitSleeve(s) {
  s.arm.updateMatrix();
  // just behind the cuff, in mirror-local space
  _wristEnd.set(0, 0, 0.055).applyMatrix4(s.arm.matrix);
  _dir.subVectors(SHOULDER, _wristEnd);
  const len = _dir.length();
  s.sleeve.position.copy(_wristEnd);
  s.sleeve.quaternion.setFromUnitVectors(_up, _dir.clone().negate().normalize());
  s.sleeve.scale.set(0.9, len, 0.75);
}

export function createHands() {
  const scene = new THREE.Scene();
  const rig = new THREE.Group(); // follows the camera
  scene.add(rig);

  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x4a4038, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(0.3, 0.8, 0.4);
  rig.add(key);
  rig.add(key.target);
  key.target.position.set(0, -0.1, -0.3);

  const sides = {};
  ['right', 'left'].forEach((side) => {
    const mirror = new THREE.Group();
    mirror.scale.x = side === 'left' ? -1 : 1; // the left hand is the right hand mirrored
    rig.add(mirror);
    const a = buildArm();
    a.arm.scale.setScalar(0.85);
    a.arm.position.copy(REST[side].pos);
    a.arm.rotation.copy(REST[side].rot);
    mirror.add(a.arm);
    mirror.add(a.sleeve);
    sides[side] = { ...a, mirror, busy: false };
  });

  let walkPhase = 0;
  // arm inertia: hands lag behind head turns and spring back
  const lag = { x: 0, y: 0, vx: 0, vy: 0, roll: 0 };
  const prevQ = new THREE.Quaternion();
  let havePrev = false;
  const _e1 = new THREE.Euler(0, 0, 0, 'YXZ');
  const _e2 = new THREE.Euler(0, 0, 0, 'YXZ');
  let shown = 0;
  // hands lower out of view when you stand still, and come up when you move or act
  let idleFor = 1;
  let active = 0;
  const swingAmt = [0, 0];
  const idleDrop = [1, 1];
  let shownTarget = 1;
  let night = false;
  const last = new THREE.Vector3();
  let t = 0;

  // move one arm (in camera space; the left side is mirrored) and hold it there
  function placeArm(side, camPos, euler, pose, duration) {
    const s = sides[side];
    s.busy = true;
    const target = side === 'left' ? new THREE.Vector3(-camPos.x, camPos.y, camPos.z) : camPos.clone();
    const toQ = new THREE.Quaternion().setFromEuler(euler);
    const fromP = s.arm.position.clone();
    const fromQ = s.arm.quaternion.clone();
    const k = { p: 0 };
    s.setPose(pose, duration * 0.6);
    gsap.to(k, {
      p: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        s.arm.position.lerpVectors(fromP, target, k.p);
        s.arm.quaternion.slerpQuaternions(fromQ, toQ, k.p);
      },
    });
  }
  function restArm(side, duration) {
    const s = sides[side];
    if (!s.busy) return;
    const fromP = s.arm.position.clone();
    const fromQ = s.arm.quaternion.clone();
    const toQ = new THREE.Quaternion().setFromEuler(REST[side].rot);
    const k = { p: 0 };
    s.setPose('relaxed', duration);
    gsap.to(k, {
      p: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        s.arm.position.lerpVectors(fromP, REST[side].pos, k.p);
        s.arm.quaternion.slerpQuaternions(fromQ, toQ, k.p);
      },
      onComplete: () => (s.busy = false),
    });
  }

  return {
    scene,
    setNight(isNight) {
      night = isNight;
      hemi.intensity = isNight ? 0.25 : 0.85;
      hemi.color.set(isNight ? 0x8f9cff : 0xfff4e6);
      key.intensity = isNight ? 0.2 : 0.75;
    },
    setVisible(v) {
      shownTarget = v ? 1 : 0;
    },
    // call once per frame after the room is rendered
    update(camera, dt) {
      t += dt;
      rig.position.copy(camera.position);
      rig.quaternion.copy(camera.quaternion);
      const moved = camera.position.distanceTo(last);
      last.copy(camera.position);
      walkPhase += Math.min(moved, 0.05) * 22;
      const walking = moved > 0.0005;

      let turned = false;
      // how fast the head turned this frame -> push the hands the other way
      if (havePrev && dt > 0) {
        _e1.setFromQuaternion(prevQ);
        _e2.setFromQuaternion(camera.quaternion);
        let dyaw = _e2.y - _e1.y;
        if (dyaw > Math.PI) dyaw -= Math.PI * 2;
        if (dyaw < -Math.PI) dyaw += Math.PI * 2;
        const dpitch = _e2.x - _e1.x;
        turned = Math.abs(dyaw) + Math.abs(dpitch) > 0.002;
        lag.vx += dyaw * 0.9;
        lag.vy += -dpitch * 0.9;
      }
      prevQ.copy(camera.quaternion);
      havePrev = true;
      // damped spring back to centre
      const kSpring = 60;
      const damp = 11;
      lag.vx += (-kSpring * lag.x - damp * lag.vx) * dt;
      lag.vy += (-kSpring * lag.y - damp * lag.vy) * dt;
      lag.x = THREE.MathUtils.clamp(lag.x + lag.vx * dt, -0.05, 0.05);
      lag.y = THREE.MathUtils.clamp(lag.y + lag.vy * dt, -0.04, 0.04);

      const turning = turned;
      const acting = sides.right.busy || sides.left.busy;
      // hands only come into view while doing something (pressing, holding, using);
      // a short grace after an action lets them drop away smoothly
      idleFor = acting ? 0 : idleFor + dt;
      const wantActive = idleFor < 0.25 ? 1 : 0;
      active += (wantActive - active) * Math.min(1, dt * (wantActive ? 7 : 4));
      shown += (shownTarget * active - shown) * Math.min(1, dt * 6);
      // hidden on purpose (reading, menu views): hide everything, held items too
      rig.visible = shownTarget ? shown > 0.02 || acting : false;

      ['right', 'left'].forEach((side, k) => {
        const s = sides[side];
        if (s.busy) {
          idleDrop[k] = 0;
          fitSleeve(s);
          return;
        }
        const r = REST[side];
        // an arm that isn't doing anything stays down out of view
        idleDrop[k] += (1 - idleDrop[k]) * Math.min(1, dt * 5);
        // arms swing in opposite rhythm while walking
        swingAmt[k] += ((walking ? 1 : 0) - swingAmt[k]) * Math.min(1, dt * 5);
        const swing = Math.sin(walkPhase + k * Math.PI) * swingAmt[k];
        const breathe = Math.sin(t * 1.4 + k * 0.9) * 0.003;
        const drift = Math.sin(t * 0.37 + k * 2.1) * 0.003;
        // mirrored side: lag.x must flip for the left hand
        const lx = side === 'left' ? -lag.x : lag.x;
        s.arm.position.set(
          r.pos.x + lx + drift,
          r.pos.y + lag.y + breathe + Math.abs(swing) * 0.007 - HIDDEN_DROP * idleDrop[k],
          r.pos.z + swing * 0.018
        );
        s.arm.rotation.set(
          r.rot.x + swing * 0.08 + lag.y * 1.5,
          r.rot.y + lx * 2,
          r.rot.z + swing * 0.05 + Math.sin(t * 0.45 + k) * 0.03
        );
        s.live(t, k * 3.1, 1);
        fitSleeve(s);
      });
    },
    // ---- holding things -------------------------------------------------
    // Take `obj` out of the room and hold it in front of the view.
    // camPos/camQuat: where it should sit in camera space. Two hands for big things.
    holdItem(camera, obj, camPos, camQuat, { both = false, duration = 0.7 } = {}) {
      rig.position.copy(camera.position);
      rig.quaternion.copy(camera.quaternion);
      rig.updateMatrixWorld(true);
      rig.attach(obj); // keeps its world transform; now it follows the camera
      const p0 = obj.position.clone();
      const q0 = obj.quaternion.clone();
      const k = { p: 0 };
      // where the item's edges will be once it's held (camera space)
      const savedP = rig.position.clone();
      const savedQ = rig.quaternion.clone();
      rig.position.set(0, 0, 0);
      rig.quaternion.identity();
      obj.position.copy(camPos);
      obj.quaternion.copy(camQuat);
      rig.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      rig.position.copy(savedP);
      rig.quaternion.copy(savedQ);
      obj.position.copy(p0);
      obj.quaternion.copy(q0);
      rig.updateMatrixWorld(true);
      const c = box.getCenter(new THREE.Vector3());
      // hands hold the sides: fingers up along the edge (behind it), thumb on the
      // front face, palm towards the item, wrist below
      const side = (sign) =>
        new THREE.Vector3(sign > 0 ? box.max.x + 0.006 : box.min.x - 0.006, c.y - (box.max.y - box.min.y) * 0.18 - 0.03, c.z - 0.004);
      const gripRot = new THREE.Euler().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0))
      );
      gripRot.x += 0.25; // forearm angles in from below and in front
      if (both) {
        placeArm('right', side(1), gripRot, 'grab', duration);
        placeArm('left', side(-1), gripRot, 'grab', duration); // placeArm mirrors it
      } else {
        placeArm('right', side(1), gripRot, 'grab', duration);
      }
      return new Promise((resolve) => {
        gsap.to(k, {
          p: 1,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            obj.position.lerpVectors(p0, camPos, k.p);
            obj.quaternion.slerpQuaternions(q0, camQuat, k.p);
          },
          onComplete: resolve,
        });
      });
    },
    // Put a held item back: hand it back to `parent` and slide it to its old place.
    releaseItem(obj, parent, localPos, localQuat, { duration = 0.7 } = {}) {
      parent.attach(obj);
      const p0 = obj.position.clone();
      const q0 = obj.quaternion.clone();
      const k = { p: 0 };
      // the right hand follows the item back
      const s = sides.right;
      const target = new THREE.Vector3();
      return new Promise((resolve) => {
        gsap.to(k, {
          p: 1,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            obj.position.lerpVectors(p0, localPos, k.p);
            obj.quaternion.slerpQuaternions(q0, localQuat, k.p);
            obj.updateMatrixWorld();
            obj.getWorldPosition(target);
            rig.worldToLocal(target);
            target.z += 0.06;
            target.y -= 0.04;
            if (target.length() > 0.42) target.setLength(0.42);
            s.arm.position.lerp(target, 0.25);
          },
          onComplete: () => {
            gsap.to(s.thumb.rotation, { ...THUMB_REST, duration: 0.3 });
            gsap.to(s.thumb.position, { ...THUMB_BASE, duration: 0.3 });
            restArm('right', 0.45);
            restArm('left', 0.45);
            resolve();
          },
        });
      });
    },
    // move the held item (e.g. raise the remote to point it)
    moveHeld(obj, camPos, camQuat, duration = 0.45) {
      const p0 = obj.position.clone();
      const q0 = obj.quaternion.clone();
      const k = { p: 0 };
      const handAt = camPos.clone().add(new THREE.Vector3(0.035, -0.035, 0.05));
      placeArm('right', handAt, new THREE.Euler(0.75, -0.1, 0.9), 'grab', duration);
      return new Promise((resolve) => {
        gsap.to(k, {
          p: 1,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            obj.position.lerpVectors(p0, camPos, k.p);
            obj.quaternion.slerpQuaternions(q0, camQuat, k.p);
          },
          onComplete: resolve,
        });
      });
    },
    // Put a small object INTO the right palm: it becomes part of the hand, so
    // it moves with every sway and turn instead of floating next to it.
    // gripPos/gripQuat: where it sits in hand space; armPos/armRot: where the
    // arm holds it up in camera space.
    gripItem(camera, obj, { gripPos, gripQuat, armPos, armRot, pose = 'hold', thumbRot = null, thumbPos = null, duration = 0.6 }) {
      rig.position.copy(camera.position);
      rig.quaternion.copy(camera.quaternion);
      rig.updateMatrixWorld(true);
      const s = sides.right;
      s.hand.updateMatrixWorld(true);
      s.hand.attach(obj); // keeps its world size and place for now
      const p0 = obj.position.clone();
      const q0 = obj.quaternion.clone();
      placeArm('right', armPos, armRot, pose, duration);
      // thumb swings in to lie along the object
      if (thumbRot) gsap.to(s.thumb.rotation, { x: thumbRot.x, y: thumbRot.y, z: thumbRot.z, duration });
      if (thumbPos) gsap.to(s.thumb.position, { x: thumbPos.x, y: thumbPos.y, z: thumbPos.z, duration });
      const k = { p: 0 };
      return new Promise((resolve) => {
        gsap.to(k, {
          p: 1,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            obj.position.lerpVectors(p0, gripPos, k.p);
            obj.quaternion.slerpQuaternions(q0, gripQuat, k.p);
            const r = s.hand.rotation;
            r.set(r.x * (1 - k.p), r.y * (1 - k.p), r.z * (1 - k.p)); // settle the wrist
          },
          onComplete: resolve,
        });
      });
    },
    // Keep the right hand on a moving point (a door handle while the door
    // swings). Returns stop(); call retract() afterwards.
    follow(camera, getWorldPoint) {
      const s = sides.right;
      s.busy = true;
      const startQ = s.arm.quaternion.clone();
      const tick = () => {
        camera.updateMatrixWorld();
        const p = camera.worldToLocal(getWorldPoint().clone());
        const wrist = p.sub(p.clone().normalize().multiplyScalar(0.085));
        if (wrist.length() > 0.42) wrist.setLength(0.42);
        s.arm.position.lerp(wrist, 0.5);
        s.arm.quaternion.slerp(startQ, 0.2);
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    // bring both hands back to rest (they then drop out of view)
    retract(duration = 0.45) {
      restArm('right', duration);
      restArm('left', duration);
    },
    // move the right arm (with whatever is in its hand)
    moveArm(armPos, armRot, duration = 0.45, pose = 'hold') {
      placeArm('right', armPos, armRot, pose, duration);
      return new Promise((resolve) => setTimeout(resolve, duration * 1000));
    },
    // thumb presses a button on whatever is held
    pressThumb(base = 'grab') {
      const s = sides.right;
      s.setPose(base === 'hold' ? 'holdPress' : 'press', 0.1);
      return new Promise((resolve) => setTimeout(() => {
        s.setPose(base, 0.12);
        setTimeout(resolve, 120);
      }, 160));
    },
    // reach the right hand out to a world point; resolves at the moment of contact
    reach(camera, worldPoint, pose = 'point', { retract = true } = {}) {
      const s = sides.right;
      if (s.busy) return Promise.resolve();
      s.busy = true;
      return new Promise((resolve) => {
        // the target in camera space
        const p = camera.worldToLocal(worldPoint.clone());
        const dir = p.clone().normalize();
        // fingertip is ~0.11 in front of the wrist; keep the arm within reach
        let wrist = p.clone().sub(dir.clone().multiplyScalar(pose === 'point' ? 0.11 : 0.085));
        if (wrist.length() > 0.42) wrist.setLength(0.42);
        // aim the hand's -z at the target
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
        const aim = new THREE.Quaternion().setFromRotationMatrix(m);
        // roll the hand so the working fingers face the viewer a little
        const roll = pose === 'grab' ? 1.2 : -0.55;
        aim.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
        const fromPos = s.arm.position.clone();
        const fromQ = s.arm.quaternion.clone();
        const restQ = new THREE.Quaternion().setFromEuler(REST.right.rot);
        const k = { p: 0 };
        s.setPose(pose, 0.3);
        const tl = gsap.timeline({
          onComplete: () => {
            s.busy = false;
            s.setPose('relaxed', 0.3);
          },
        });
        tl
          .to(k, {
            p: 1,
            duration: 0.5,
            ease: 'back.out(1.4)',
            onUpdate: () => {
              s.arm.position.lerpVectors(fromPos, wrist, k.p);
              s.arm.quaternion.slerpQuaternions(fromQ, aim, k.p);
            },
            onComplete: () => {
              resolve();
              // keep the hand on the object (it's about to pick it up)
              if (!retract) tl.kill();
            },
          })
          // press / tug, then let go
          .to(s.arm.position, {
            x: wrist.x + dir.x * 0.012,
            y: wrist.y + dir.y * 0.012,
            z: wrist.z + dir.z * 0.012,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
          })
          .to(k, {
            p: 0,
            duration: 0.45,
            ease: 'power2.inOut',
            onUpdate: () => {
              s.arm.position.lerpVectors(REST.right.pos, wrist, k.p);
              s.arm.quaternion.slerpQuaternions(restQ, aim, k.p);
            },
          });
      });
    },
  };
}
