import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const finishes = new Map();
const fontReady = document.fonts?.load('500 28px Inter') || Promise.resolve();

function walnutTexture(anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d');
  c.fillStyle = '#513522'; c.fillRect(0, 0, 512, 512);
  let seed = 927;
  const random = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < 580; i++) {
    const y = random() * 512;
    c.strokeStyle = i % 3 ? `rgba(19,10,5,${0.06 + random() * 0.14})` : `rgba(191,141,85,${0.04 + random() * 0.1})`;
    c.lineWidth = 0.35 + random() * 1.4;
    c.beginPath(); c.moveTo(0, y);
    c.bezierCurveTo(180, y - 5, 360, y + 7, 512, y + random() * 2); c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

function materials(envMap, anisotropy) {
  const key = `${envMap?.uuid || ''}:${anisotropy}`;
  if (finishes.has(key)) return finishes.get(key);
  const grain = walnutTexture(anisotropy);
  const verticalGrain = grain.clone();
  verticalGrain.center.set(0.5, 0.5); verticalGrain.rotation = Math.PI / 2;
  const horizontal = new THREE.MeshPhysicalMaterial({ map: grain, roughness: 0.4, clearcoat: 0.24, clearcoatRoughness: 0.45, envMap, envMapIntensity: 0.35 });
  const vertical = horizontal.clone(); vertical.map = verticalGrain;
  const result = {
    horizontal, vertical,
    brass: new THREE.MeshStandardMaterial({ color: 0xc8af73, metalness: 0.78, roughness: 0.34, envMap, envMapIntensity: 0.65 }),
    backing: new THREE.MeshStandardMaterial({ color: 0x30251e, roughness: 0.8 }),
    mat: new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.98 }),
    bevel: new THREE.MeshStandardMaterial({ color: 0xd5cbb5, roughness: 0.95 }),
  };
  finishes.set(key, result);
  return result;
}

function ring(width, height, thickness, depth) {
  const outer = new THREE.Shape();
  outer.moveTo(-width / 2, -height / 2); outer.lineTo(width / 2, -height / 2);
  outer.lineTo(width / 2, height / 2); outer.lineTo(-width / 2, height / 2); outer.closePath();
  const inner = new THREE.Path();
  inner.moveTo(-width / 2 + thickness, -height / 2 + thickness);
  inner.lineTo(-width / 2 + thickness, height / 2 - thickness);
  inner.lineTo(width / 2 - thickness, height / 2 - thickness);
  inner.lineTo(width / 2 - thickness, -height / 2 + thickness); inner.closePath();
  outer.holes.push(inner);
  return new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 1 });
}

function captionTexture(project, index, anisotropy) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 112;
  const c = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding; texture.anisotropy = anisotropy;
  const draw = () => {
    c.fillStyle = '#c1aa72'; c.fillRect(0, 0, 1024, 112);
    for (let y = 0; y < 112; y += 3) { c.fillStyle = y % 2 ? '#ffffff0d' : '#3c2b130a'; c.fillRect(0, y, 1024, 1); }
    c.fillStyle = '#302818'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 43;
    const label = `${String(index + 1).padStart(2, '0')}  /  ${project.title}`;
    do { c.font = `500 ${size--}px Inter, Arial, sans-serif`; } while (c.measureText(label).width > 860 && size > 22);
    c.fillText(label, 512, 58);
    [28, 996].forEach((x) => { c.beginPath(); c.arc(x, 56, 4.5, 0, Math.PI * 2); c.fill(); });
    texture.needsUpdate = true;
  };
  draw(); fontReady.then(draw).catch(() => {});
  return texture;
}

// The artwork is unchanged; these are physical mouldings, a recessed mat and
// engraved gallery labels around it. Every mesh remains part of one pickup.
export function createProjectFrame(project, { envMap, anisotropy = 8, index = 0 } = {}) {
  const imageW = 0.36, imageH = 0.27, matPad = 0.024, rail = 0.025;
  const innerW = imageW + matPad * 2, innerH = imageH + matPad * 2;
  const width = innerW + rail * 2, height = innerH + rail * 2;
  const group = new THREE.Group(), finish = materials(envMap, anisotropy);
  group.name = 'ProjectFrame'; group.userData.homeScale = group.scale.clone();
  const backing = new THREE.Mesh(new RoundedBoxGeometry(width - 0.003, height - 0.003, 0.004, 2, 0.001), finish.backing);
  backing.position.z = -0.008; backing.castShadow = true; group.add(backing);

  const x = width / 2, y = height / 2, ix = innerW / 2, iy = innerH / 2;
  const rails = [
    [[-x, y], [x, y], [ix, iy], [-ix, iy]],
    [[-x, -y], [-ix, -iy], [ix, -iy], [x, -y]],
    [[-x, -y], [-x, y], [-ix, iy], [-ix, -iy]],
    [[x, -y], [ix, -iy], [ix, iy], [x, y]],
  ];
  rails.forEach((points, index) => {
    const shape = new THREE.Shape(points.map(([px, py]) => new THREE.Vector2(px, py)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.019, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, steps: 1 });
    const position = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + x) / width, (position.getY(i) + y) / height);
    const mesh = new THREE.Mesh(geometry, index < 2 ? finish.horizontal : finish.vertical);
    mesh.position.z = -0.005; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  });

  const outerBead = new THREE.Mesh(ring(width - 0.009, height - 0.009, 0.0011, 0.0005), finish.brass);
  outerBead.position.z = 0.0143; group.add(outerBead);
  const innerBead = new THREE.Mesh(ring(innerW + 0.004, innerH + 0.004, 0.002, 0.001), finish.brass);
  innerBead.position.z = 0.0134; group.add(innerBead);

  const mat = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), finish.mat);
  mat.position.z = 0.0097; mat.receiveShadow = true; group.add(mat);
  const bevel = new THREE.Mesh(ring(imageW + 0.005, imageH + 0.005, 0.0025, 0.0014), finish.bevel);
  bevel.position.z = 0.0098; group.add(bevel);
  const image = new THREE.TextureLoader().load(project.image);
  image.encoding = THREE.sRGBEncoding; image.anisotropy = anisotropy;
  const picture = new THREE.Mesh(new THREE.PlaneGeometry(imageW, imageH), new THREE.MeshStandardMaterial({ map: image, roughness: 0.96 }));
  picture.position.z = 0.0115; picture.receiveShadow = true;
  picture.userData.certificateFace = true; group.add(picture);

  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.208, 0.023, 0.002, 2, 0.0007), finish.brass);
  plate.position.set(0, -y - 0.021, 0.004); group.add(plate);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.203, 0.021), new THREE.MeshStandardMaterial({ map: captionTexture(project, index, anisotropy), metalness: 0.48, roughness: 0.5, envMap, envMapIntensity: 0.3 }));
  label.position.copy(plate.position); label.position.z += 0.0011; group.add(label);

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.name = 'project';
    object.userData = { ...object.userData, url: project.url, title: project.title, group };
  });
  return group;
}
