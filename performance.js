// Performance helpers: fewer draw calls, cheaper shadows.
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Meshes with these names are clicked / hovered, so they stay separate objects.
const INTERACTIVE = new Set([
  'project', 'Telephone', 'Curtain', 'Window', 'AC', 'Chair', 'Lamp', 'FanSwitch', 'FanRegulator',
  'ShelfBook', 'Highlight', 'TubeLight', 'Door', 'Book', 'Book001', 'SwitchBoard', 'Switch', 'Fan', 'Vacuum',
]);

function materialKey(m) {
  return [
    m.type, m.color && m.color.getHex(), m.map && m.map.uuid, m.roughness, m.metalness,
    m.emissive && m.emissive.getHex(), m.emissiveIntensity, m.transparent, m.opacity, m.side,
    m.flatShading, m.envMap && m.envMap.uuid, m.envMapIntensity, m.vertexColors,
    m.bumpMap?.uuid, m.bumpScale, m.normalMap?.uuid, m.clearcoat, m.clearcoatRoughness,
    m.transmission, m.ior, m.depthWrite, m.depthTest, m.alphaTest, m.blending, m.toneMapped,
  ].join('|');
}

// Merge static, non-interactive meshes under `root` into one mesh per material.
// Objects (or ancestors) with userData.dynamic = true are left alone.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return; // e.g. mirrors
    if (INTERACTIVE.has(o.name) || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    if (o.children.length) return;
    const key = materialKey(o.material);
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [], cast: false, receive: false });
    const b = buckets.get(key);
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    // keep a common attribute set (position, normal, uv)
    Object.keys(g.attributes).forEach((a) => {
      if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    });
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!g.boundingSphere) g.computeBoundingSphere();
    b.geos.push(g);
    b.cast = b.cast || (o.castShadow && g.boundingSphere.radius > 0.025);
    b.receive = b.receive || o.receiveShadow;
    victims.push(o);
  });
  let removed = 0;
  buckets.forEach((b) => {
    if (b.geos.length < 2) return;
    const merged = mergeBufferGeometries(b.geos, false);
    if (!merged) return;
    const m = new THREE.Mesh(merged, b.material);
    m.name = 'StaticMerged';
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    root.add(m);
    removed += b.geos.length;
  });
  // remove only the meshes that went into a merged bucket
  const mergedKeys = new Set([...buckets].filter(([, b]) => b.geos.length >= 2).map(([k]) => k));
  victims.forEach((o) => {
    if (mergedKeys.has(materialKey(o.material))) o.parent.remove(o);
  });
  return removed;
}

// Small things barely show in the room light's shadow; drop them from it.
export function trimShadowCasters(scene, minRadius = 0.035) {
  const s = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || !o.castShadow) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.getWorldScale(s);
    if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < minRadius) o.castShadow = false;
  });
}

// Mirrors re-render the room; only do it when near, and every 3rd frame.
export function throttleMirror(mirror, camera, maxDistance = 2.2, isSlow = () => false) {
  const original = mirror.onBeforeRender;
  const pos = new THREE.Vector3();
  let frame = 0;
  mirror.onBeforeRender = function (...args) {
    frame++;
    mirror.getWorldPosition(pos);
    if (pos.distanceTo(camera.position) > maxDistance) return;
    if (frame % (isSlow() ? 8 : 3)) return;
    original.apply(this, args);
  };
}
