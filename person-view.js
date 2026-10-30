// Damped first-person controls with collision-safe, interruptible walking.
import * as THREE from 'three';
import gsap from 'gsap';
import { reducedMotion } from './interface.js';
import { RoomNavigation } from './navigation.js';
export const BASE_FOV = 64;
const WALK_SPEED = 0.68;
const PITCH_LIMIT = 1.28;
const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

export class PersonControls {
  constructor(camera, { roomScale = 1 } = {}) {
    this.camera = camera; this.s = roomScale;
    this.navigation = new RoomNavigation(roomScale);
    this.bounds = this.navigation.bounds; this.boxes = this.navigation.boxes; this.circles = this.navigation.circles;
    this.yaw = 0; this.pitch = 0; this.eyeY = camera.position.y;
    this._renderYaw = 0; this._renderPitch = 0; this._turnSpeed = 0;
    this._enabled = false; this.keys = new Set(); this.pointers = new Map();
    this.drag = null; this.dragDistance = 0; this.walkTween = null;
    this.onFirstMove = null; this.onStep = null; this.onWalkTarget = null; this.onWalkEnd = null;
    this._stepDist = 0; this._bob = 0; this._velocity = new THREE.Vector2();
    this._targetFov = camera.fov; this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._path = null; this._pathCheck = 0;
    this._bind();
  }
  get enabled() { return this._enabled; }
  set enabled(on) {
    if (on && !this._enabled) {
      this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.yaw = this._renderYaw = this._euler.y;
      this.pitch = this._renderPitch = THREE.MathUtils.clamp(this._euler.x, -PITCH_LIMIT, PITCH_LIMIT);
      this.eyeY = this.camera.position.y; this._targetFov = this.camera.fov;
    }
    if (!on) {
      this.keys.clear(); this.pointers.clear(); this.drag = null; this._pinch = null;
      this._velocity.set(0, 0); this._turnSpeed = 0; this.cancelWalk();
      if (this._enabled) this.camera.position.y = this.eyeY;
    }
    this._enabled = Boolean(on);
  }
  wasDrag() { return this.dragDistance > 6; }
  _moved() { if (this.onFirstMove) { const callback = this.onFirstMove; this.onFirstMove = null; callback(); } }
  cancelWalk() {
    const active = Boolean(this._path);
    this._path = null; this.walkTween = null;
    if (active) this.onWalkEnd?.();
  }
  _bind() {
    const isScene = (event) => event.target?.tagName === 'CANVAS';
    window.addEventListener('pointerdown', (event) => {
      if (!this._enabled || !isScene(event) || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (!this.pointers.size) this.dragDistance = 0;
      event.target.focus({ preventScroll: true });
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this._pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), fov: this._targetFov };
        this.dragDistance = 100; this.drag = null;
      } else if (this.pointers.size === 1) this.drag = { x: event.clientX, y: event.clientY, id: event.pointerId, touch: event.pointerType === 'touch' };
    });
    window.addEventListener('pointermove', (event) => {
      if (!this._enabled || !this.pointers.has(event.pointerId)) return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this._pinch && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this._targetFov = THREE.MathUtils.clamp(this._pinch.fov * this._pinch.distance / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 42, 76);
        this._moved(); return;
      }
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
      this.drag.x = event.clientX; this.drag.y = event.clientY;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);
      const sensitivity = 0.0036 * (this.camera.fov / BASE_FOV) * (this.drag.touch ? 1.15 : 1);
      this.yaw += dx * sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sensitivity, -PITCH_LIMIT, PITCH_LIMIT);
      if (this.wasDrag()) this._moved();
    });
    const release = (event) => {
      this.pointers.delete(event.pointerId);
      if (this.drag?.id === event.pointerId) this.drag = null;
      if (this.pointers.size < 2) this._pinch = null;
    };
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
    window.addEventListener('wheel', (event) => {
      if (this._enabled && isScene(event)) this._targetFov = THREE.MathUtils.clamp(this._targetFov + event.deltaY * 0.02, 42, 76);
    }, { passive: true });
    const allowed = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (!this._enabled || !allowed.has(key) || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target?.tagName ?? '') || event.target?.isContentEditable) return;
      event.preventDefault(); this.keys.add(key); this.cancelWalk(); this._moved();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); this.drag = null; this._pinch = null; this._velocity.set(0, 0); this._turnSpeed = 0; this.cancelWalk(); });
  }
  setChairPosition(x, z) { this.circles[0][0] = x * this.s; this.circles[0][1] = z * this.s; }
  resolve(point) { return this.navigation.project(point); }
  walkTo(point) {
    if (!this._enabled) return;
    this.cancelWalk();
    const route = this.navigation.route(this.camera.position, point);
    if (!route.length) return;
    this._path = route; this._pathCheck = 0;
    this.walkTween = { kill: () => this.cancelWalk() };
    const target = route[route.length - 1];
    this.onWalkTarget?.(target);
    this._moved();
    if (reducedMotion.matches) {
      this.camera.position.set(target.x, this.eyeY, target.z); this._velocity.set(0, 0); this.cancelWalk();
    }
  }
  _countSteps(distance) {
    const stride = 0.32 * this.s;
    this._stepDist += distance;
    for (let count = 0; this._stepDist >= stride && count < 2; count++) { this._stepDist -= stride; this.onStep?.(); }
  }
  update(dt) {
    if (!this._enabled || !(dt > 0)) return;
    dt = Math.min(dt, 0.1);
    const turn = Number(this.keys.has('q') || this.keys.has('arrowleft')) - Number(this.keys.has('e') || this.keys.has('arrowright'));
    this._turnSpeed = damp(this._turnSpeed, turn * 1.35, 12, dt); this.yaw += this._turnSpeed * dt;
    const look = reducedMotion.matches ? 1 : 1 - Math.exp(-(this.drag ? 25 : 18) * dt);
    this._renderYaw += (this.yaw - this._renderYaw) * look;
    this._renderPitch += (this.pitch - this._renderPitch) * look;
    let vx = 0, vz = 0;
    const position = this.camera.position, speed = WALK_SPEED * this.s;
    if (this._path) {
      while (this._path.length > 1 && Math.hypot(this._path[0].x - position.x, this._path[0].z - position.z) < 0.055 * this.s) this._path.shift();
      let next = this._path[0];
      this._pathCheck += dt;
      if (this._pathCheck > 0.25) {
        this._pathCheck = 0;
        if (!this.navigation.segmentFree(position, next)) {
          const goal = this._path[this._path.length - 1];
          this._path = this.navigation.route(position, goal);
          if (!this._path.length) this.cancelWalk();
          next = this._path?.[0];
        }
      }
      if (next) {
        const dx = next.x - position.x, dz = next.z - position.z, distance = Math.hypot(dx, dz);
        if (this._path.length === 1 && distance < 0.022 * this.s) {
          position.x = next.x; position.z = next.z; this._velocity.set(0, 0); this.cancelWalk();
        } else {
          const arrival = this._path.length > 1 ? 1 : Math.min(1, distance / (0.19 * this.s));
          vx = dx / Math.max(distance, 1e-6) * speed * arrival;
          vz = dz / Math.max(distance, 1e-6) * speed * arrival;
        }
      }
    } else {
      const forward = Number(this.keys.has('w') || this.keys.has('arrowup')) - Number(this.keys.has('s') || this.keys.has('arrowdown'));
      const side = Number(this.keys.has('d')) - Number(this.keys.has('a'));
      const length = Math.hypot(forward, side) || 1, sine = Math.sin(this._renderYaw), cosine = Math.cos(this._renderYaw);
      vx = (-sine * forward + cosine * side) / length * speed;
      vz = (-cosine * forward - sine * side) / length * speed;
    }
    const rate = vx || vz ? 9 : 13;
    this._velocity.x = damp(this._velocity.x, vx, rate, dt); this._velocity.y = damp(this._velocity.y, vz, rate, dt);
    const oldX = position.x, oldZ = position.z;
    this.navigation.move(position, this._velocity.x * dt, this._velocity.y * dt);
    const distance = Math.hypot(position.x - oldX, position.z - oldZ);
    this._countSteps(distance); this._bob += distance / (0.32 * this.s) * Math.PI;
    const amplitude = reducedMotion.matches ? 0 : 0.0013 * Math.min(1, distance / Math.max(dt * speed, 1e-6));
    position.y = damp(position.y, this.eyeY + Math.sin(this._bob) * amplitude, 14, dt);
    const fov = damp(this.camera.fov, this._targetFov, 12, dt);
    if (Math.abs(fov - this.camera.fov) > 0.001) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.camera.quaternion.setFromEuler(this._euler.set(this._renderPitch, this._renderYaw, 0, 'YXZ'));
  }
}

// smooth camera move to a position + orientation (quaternion slerp, so it
// always turns the short way round, whichever way you were facing)
const cameraFlights = new WeakMap();
export function flyTo(camera, pos, quat, { duration = 1.3, onComplete } = {}) {
  cameraFlights.get(camera)?.kill();
  const fromP = camera.position.clone();
  const fromQ = camera.quaternion.clone();
  const toP = new THREE.Vector3(pos.x, pos.y, pos.z);
  const fromFov = camera.fov;
  const t = { p: 0 };
  const flight = gsap.to(t, {
    p: 1,
    duration: reducedMotion.matches ? 0 : duration,
    ease: 'sine.inOut',
    onUpdate: () => {
      camera.position.lerpVectors(fromP, toP, t.p);
      camera.quaternion.slerpQuaternions(fromQ, quat, t.p);
      camera.fov = fromFov + (BASE_FOV - fromFov) * t.p;
      camera.updateProjectionMatrix();
    },
    onComplete: () => { cameraFlights.delete(camera); onComplete?.(); },
  });
  cameraFlights.set(camera, flight);
  return flight;
}

export const eulerToQuat = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x, r.y, r.z));
