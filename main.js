import { PROFILE } from './profile.js';
import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createProjectFrame } from './project-frames.js';
import { createCodeScreen, createWallClock, createSteam } from './live.js';
import { upgradeDevices } from './devices.js';
import { createCables } from './cables.js';
import { createWindow, createAC, createTubeLight } from './room-extras.js';
import { createFurniture } from './furniture.js';
import { createWallDecor } from './wall-decor.js';
import { createDoorWallDecor } from './door-wall.js';
import { createFanSystem } from './fan.js';
import { createDoorway, runIntro } from './intro.js';
import { PersonControls, flyTo, eulerToQuat, BASE_FOV } from './person-view.js';
import { showReader } from './books.js';
import { PROJECTS, PROJECT_INFO } from './project-data.js';
import { certificateImage } from './certificates.js';
import { mergeStatic, trimShadowCasters, throttleMirror } from './performance.js';
import { sound } from './sound.js';
import { openPanel, closePanel, setActiveView, reducedMotion } from './interface.js';
import { createHands } from './hands.js';
import { configureRenderer, finishRoom, colorTextures, walkMarker } from './room-finish.js';
import { NIGHT_LOOK } from './night-look.js';
import { createVacuum } from './vacuum.js';
import { VACUUM_RADIUS } from './vacuum-motion.js';

// VARIABLES
// Every visit begins with the main light off, regardless of an older preference.
let theme = 'dark';
let bookCover = null;
let lightSwitch = null;
let titleText = null;
let subtitleText = null;
let mixer;
let isMobile = window.matchMedia('(max-width: 992px)').matches;
let canvas = document.querySelector('.experience-canvas');
const loaderWrapper = document.getElementById('loader-wrapper');
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  document.querySelector('.loader-progress').style.width = `${Math.max(20, (loaded / total) * 100)}%`;
};
THREE.DefaultLoadingManager.onLoad = () => loaderWrapper.classList.add('is-loaded');
let clipNames = [
  'fan_rotation',
  'fan_rotation.001',
  'fan_rotation.002',
  'fan_rotation.003',
  'fan_rotation.004',
];
// The same certificate artwork is used in the room and the project list.
const projects = PROJECTS.map((project) => ({ ...project, image: certificateImage(project) }));
let inProjectsView = false;

// live details (see live.js)
let codeScreen = null;
let wallClock = null;
let steam = null;
let plant = null;
let devices = null;
let roomWindow = null;
let airCon = null;
let furniture = null;
let fanSystem = null;
let tubeLight = null;
let doorway = null;
let wallDecor = null;
let roomFinish = null;
let vacuum = null;
let vacuumObstacle = null;

function updateLiveScene(now, delta) {
  const t = reducedMotion.matches ? 0 : now / 1000;
  roomFinish?.update();
  wallDecor?.userData.update(t, delta);
  if (codeScreen) codeScreen.update(now);
  if (wallClock) wallClock.update();
  if (steam) steam.update(t);
  if (plant) {
    plant.rotation.z = Math.sin(t * 0.7) * 0.012;
    plant.rotation.x = Math.sin(t * 0.53 + 1.3) * 0.008;
  }
  const breathe = reducedMotion.matches ? 1 : 0.96 + 0.04 * Math.sin(t * 0.55);
  fanLight1.intensity = fanLight2.intensity = fanLight3.intensity = fanLight4.intensity = (theme === 'dark' ? NIGHT_LOOK.fanIntensity : 0.45) * breathe;
  if (roomWindow) roomWindow.update(t);
  if (airCon) airCon.update(t);
  if (furniture) furniture.update(t);
  if (vacuum) {
    vacuum.update(delta, { paused: reducedMotion.matches || !controls.enabled, person: { x: camera.position.x / ROOM_SCALE, z: camera.position.z / ROOM_SCALE } });
    const p = vacuum.motion.position;
    vacuumObstacle[0] = p.x * ROOM_SCALE; vacuumObstacle[1] = p.z * ROOM_SCALE;
    furniture.setVacuumPosition(p.x, p.z, VACUUM_RADIUS);
  }
  if (fanSystem) fanSystem.update(t);
  if (devices) {
    devices.update(t);
    fanLight1.color.copy(devices.rgbAt(t, 0.5));
    fanLight2.color.copy(devices.rgbAt(t, 0.12));
    fanLight3.color.copy(devices.rgbAt(t, 0));
    fanLight4.color.copy(devices.rgbAt(t, 0.12));
    fanLight5.color.copy(devices.rgbAt(t, 0.24));
  }
  // soft glow from the monitor onto the desk, flickering with the screen
  monitorLight.intensity = monitorGlow * (0.99 + 0.01 * Math.sin(t * 0.8));
}

// desk telephone: click it to show the number
const PHONE_DISPLAY = PROFILE.phone;
const PHONE_TEL = PROFILE.phoneHref;
let telephone = null;
// camera faces the back wall (z = -1.2) where the frames hang
let projectsCameraPos = {
  x: 0.98,
  y: 0.74,
  z: -0.22,
};
let projectsCameraRot = {
  x: 0,
  y: 0,
  z: 0,
};

// SCENE & CAMERA
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  BASE_FOV,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
let defaultCameraPos = {
  x: 1.009028643133046,
  y: 0.5463638814987481,
  z: 0.4983449671971262,
};
let defaultCamerRot = {
  x: -0.8313297556598935,
  y: 0.9383399492446749,
  z: 0.7240714481613063,
};
camera.position.set(defaultCameraPos.x, defaultCameraPos.y, defaultCameraPos.z);

// RENDERER
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
// Keep native sharpness, with a 2x cap for very dense displays.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const textureAnisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
const renderBudget = { slow: false };
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// shadows are re-rendered a few times a second instead of every frame (see animate)
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
// filmic tone mapping: bright walls roll off softly instead of clipping to flat white
configureRenderer(renderer);

// STATS
// const stats = new Stats();
// document.querySelector('.experience').appendChild(stats.dom);

// CONTROLS: first-person, standing in the room (see person-view.js)
const ROOM_SCALE = isMobile ? 0.95 : 1;
const controls = new PersonControls(camera, { roomScale: ROOM_SCALE });
const destinationMarker = walkMarker(scene, ROOM_SCALE);
controls.onWalkTarget = destinationMarker.show;
controls.onWalkEnd = destinationMarker.hide;
controls.onStep = () => sound.footstep(0.25); // soft footsteps
// where the visitor stands after walking in: eye height, looking at the desk
function setStandingView() {
  const s = ROOM_SCALE;
  // a camera's lookAt points its -z at the target (a plain Object3D would face away)
  const eye = new THREE.PerspectiveCamera();
  eye.position.set(1.42 * s, 0.62 * s, 0.72 * s);
  eye.lookAt(0.02 * s, 0.19 * s, 0.15 * s);
  defaultCameraPos = { x: eye.position.x, y: eye.position.y, z: eye.position.z };
  defaultCamerRot = { x: eye.rotation.x, y: eye.rotation.y, z: eye.rotation.z };
}
// the spot the visitor was standing at before a menu moved the camera
let personPose = null;

// LOAD MODEL & ASSET
// const loadingManager = new THREE.LoadingManager();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.load(
  'models/room.glb',
  function (room) {
    // live monitor: code being typed, server logs and a real clock
    codeScreen = createCodeScreen();

    room.scene.children.forEach((child) => {
      // disable shadow by wall
      if (child.name !== 'Wall') {
        child.castShadow = true;
      }
      child.receiveShadow = true;

      if (child.children) {
        child.children.forEach((innerChild) => {
          // disable shadow by book cover & switch btn
          if (innerChild.name !== 'Book001' && innerChild.name !== 'Switch') {
            innerChild.castShadow = true;
          }

          // add texture to book cover
          if(innerChild.name === 'Book001') {
            const bookCoverTexture = new THREE.TextureLoader().load(
              'textures/book-cover.svg'
            );
            bookCoverTexture.flipY = false;
            bookCoverTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            // printed cover outside, plain cream inside so the design doesn't
            // show mirrored when the book opens. A little self-light keeps the
            // gold lettering readable from across the desk.
            innerChild.material = new THREE.MeshStandardMaterial({
              side: THREE.FrontSide,
              color: 0xffffff,
              map: bookCoverTexture,
              emissive: 0xffffff,
              emissiveMap: bookCoverTexture,
              emissiveIntensity: 0.12,
              roughness: 0.75,
            });
            const coverInside = new THREE.Mesh(
              innerChild.geometry,
              new THREE.MeshStandardMaterial({
                side: THREE.BackSide,
                color: 0xe6dccb,
              })
            );
            coverInside.name = 'Book001';
            innerChild.add(coverInside);
          }

          innerChild.receiveShadow = true;
        });
      }

      if (child.name === 'Stand') {
        child.children[0].material = new THREE.MeshBasicMaterial({
          map: codeScreen.texture,
        });
      }

      // the plant sways a little, as if there's a breeze
      if (child.name === 'Plant_Pot') {
        plant = child.getObjectByName('Plant');
      }

      // transparent texture for glass
      if (child.name === 'CPU') {
        child.children[0].material = new THREE.MeshPhysicalMaterial();
        child.children[0].material.roughness = 0;
        child.children[0].material.color.set(0x999999);
        child.children[0].material.ior = 3;
        child.children[0].material.transmission = 0;
        child.children[0].material.opacity = 0.8;
        child.children[0].material.depthWrite = false;
        child.children[0].material.depthTest = false;
        child.children[1].material = new THREE.MeshPhysicalMaterial();
        child.children[1].material.roughness = 0;
        child.children[1].material.color.set(0x999999);
        child.children[1].material.ior = 3;
        child.children[1].material.transmission = 0;
        child.children[1].material.opacity = 0.8;
        child.children[1].material.depthWrite = false;
        child.children[1].material.depthTest = false;
      }

      if (child.name === 'Book') {
        bookCover = child.children[0];

        // adding texture to book
        const bookTexture = new THREE.TextureLoader().load(
          'textures/book-inner.svg'
        );
        bookTexture.flipY = false;
        bookTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        // shown exactly as printed: room lighting and tone mapping would wash it out
        child.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: bookTexture,
          toneMapped: false,
        });
      }

      if (child.name === 'SwitchBoard') {
        lightSwitch = child.children[0];
        // its own bright-white plastic (it shared the desk's material)
        // dark graphite plate + light rocker, 1.5x bigger, so it reads on the wall
        child.material = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.3, metalness: 0.2 });
        lightSwitch.material = new THREE.MeshStandardMaterial({ color: 0xe8e8e5, roughness: 0.35 });
        room.scene.updateMatrixWorld(true);
        const before = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
        child.scale.multiplyScalar(1.5);
        child.updateMatrixWorld(true);
        const after = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
        // keep it centred where it was and flat against the wall
        child.position.y += before.y - after.y;
        child.position.z += before.z - after.z;
        child.castShadow = true;
        lightSwitch.castShadow = true;
      }

      // paint the room: warm greige walls, stone floor, off-white ceiling.
      // walls, floor and ceiling are one mesh, so colour by which way each face points
      if (child.name === 'Wall') {
        child.receiveShadow = true;
      }
    });

    // the phone sits inside the room so it scales with it on mobile
    telephone = createTelephone();
    room.scene.add(telephone.group);

    // realistic keyboard, monitor finish, glass PC with RGB fans
    devices = upgradeDevices(room.scene, renderer);

    // power cords, floor power strip and keyboard USB cable
    const cables = createCables();
    room.scene.add(cables);

    // sliding window with curtains (left wall, near the back corner)
    roomWindow = createWindow(devices.envMap);
    room.scene.add(roomWindow.group);

    // LED tube light: the room's main light, worked by the wall light switch
    tubeLight = createTubeLight(devices.envMap);
    room.scene.add(tubeLight.group);

    // split AC high on the left wall, above the name
    airCon = createAC(devices.envMap);
    room.scene.add(airCon.group);

    // ceiling fan, its wall switch + regulator, and the AC remote
    fanSystem = createFanSystem(devices.envMap);
    room.scene.add(fanSystem.group);

    // entrance wall + door the visitor walks in through
    doorway = createDoorway(devices.envMap);
    room.scene.add(doorway.group);

    // chair, rug, sideboard, lamp, plant and everyday clutter
    furniture = createFurniture(devices.envMap);
    // walking keeps clear of the chair wherever it's dragged to
    furniture.onChairMove = (p) => { controls.setChairPosition(p.x, p.z); vacuum?.setChairPosition(p.x, p.z); };
    room.scene.add(furniture.group);

    vacuum = createVacuum(devices.envMap);
    vacuum.update(0, { paused: true }); room.scene.add(vacuum.group);
    const robotPosition = vacuum.motion.position;
    vacuumObstacle = [robotPosition.x * ROOM_SCALE, robotPosition.z * ROOM_SCALE, VACUUM_RADIUS * ROOM_SCALE];
    controls.navigation.circles.push(vacuumObstacle);
    furniture.setVacuumPosition(robotPosition.x, robotPosition.z, VACUUM_RADIUS);

    // whiteboard, cork board, art print and floating shelf on the bare walls
    wallDecor = createWallDecor(devices.envMap);
    room.scene.add(wallDecor);
    // coat rack, shoe rack, mirror, calendar and keys by the door
    const doorWallDecor = createDoorWallDecor(renderer);
    room.scene.add(doorWallDecor);

    // PERFORMANCE: merge static props into a few meshes, trim tiny shadow
    // casters, and only update the mirror when it's close
    [cables, wallDecor, doorWallDecor, furniture.group, doorway.group].forEach(mergeStatic);
    doorWallDecor.traverse((o) => {
      if (o.name === 'Mirror') throttleMirror(o, camera, 2.2, () => renderBudget.slow);
    });
    renderer.shadowMap.needsUpdate = true;

    // wall clock on the left wall, left of the name, on real time
    wallClock = createWallClock();
    wallClock.group.rotation.y = Math.PI / 2;
    wallClock.group.position.set(-0.266, 0.62, 0.7);
    room.scene.add(wallClock.group);

    // steam from the coffee mug
    steam = createSteam(new THREE.Vector3(0.196, 0.06, -0.096));
    room.scene.add(steam.group);

    roomFinish = finishRoom(room.scene, devices.envMap, furniture.chairGroup);
    scene.add(room.scene);
    trimShadowCasters(scene);

    // add animation
    mixer = new THREE.AnimationMixer(room.scene);
    const clips = room.animations;
    clipNames.forEach((clipName) => {
      const clip = THREE.AnimationClip.findByName(clips, clipName);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
      }
    });

    loadIntroText();

    // add event listeners
    logoListener();
    aboutMenuListener();
    projectsMenuListener();
    init3DWorldClickListeners();
    initProjectHover();
    initResponsive(room.scene);
    setStandingView();
    colorTextures(scene, textureAnisotropy);
    switchTheme(theme, true);

    // start outside the door; "Enter" opens it and walks in to a standing view
    disableOrbitControls();
    runIntro({
      camera,
      doorway,
      roomScene: room.scene,
      endPos: defaultCameraPos,
      endRot: defaultCamerRot,
      hands,
      onDone: () => {
        enableOrbitControls();
        showLookHint();
      },
    });
    animate();
  },
  undefined,
  function (error) {
    console.error(error);
    document.getElementById('loader-status').textContent = 'The room couldn’t load. Please refresh to try again.';
  }
);

// A diffuse sky fill and one directional shadow are cheaper and softer than
// rendering a point light's six shadow cameras every few frames.
const ROOM_DAY = 0.85;
const AMBIENT_DAY = 0.78;
const ambientLight = new THREE.HemisphereLight(0xdce6ef, 0x76644d, AMBIENT_DAY);
scene.add(ambientLight);
const roomLight = new THREE.PointLight(0xfff0d9, ROOM_DAY, 6);
roomLight.position.set(0.8, 1.32, 0.4);
scene.add(roomLight);
const sunlight = new THREE.DirectionalLight(0xffecd0, 1.45);
sunlight.position.set(0.04, 1.38, -0.82);
sunlight.target.position.set(0.95, -0.32, 0.85);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
Object.assign(sunlight.shadow.camera, { left: -2.3, right: 2.3, top: 2.3, bottom: -2.3, near: 0.05, far: 6 });
sunlight.shadow.bias = -0.00035;
sunlight.shadow.normalBias = 0.003;
sunlight.shadow.radius = 3;
scene.add(sunlight, sunlight.target);
// add light for pc fans
const fanLight1 = new THREE.PointLight(0x9fc6b0, 0.45, 0.2);
const fanLight2 = new THREE.PointLight(0x9fc6b0, 0.45, 0.12);
const fanLight3 = new THREE.PointLight(0x9fc6b0, 0.45, 0.2);
const fanLight4 = new THREE.PointLight(0x9fc6b0, 0.45, 0.2);
const fanLight5 = new THREE.PointLight(0x9fc6b0, 0.45, 0.05);
fanLight1.position.set(0, 0.29, -0.29);
fanLight2.position.set(-0.15, 0.29, -0.29);
fanLight3.position.set(0.21, 0.29, -0.29);
fanLight4.position.set(0.21, 0.19, -0.29);
fanLight5.position.set(0.21, 0.08, -0.29);
// One localized fill is sufficient; the fan rings have their own emissive finish.
scene.add(fanLight3);
// cool light from the monitor screen onto the keyboard and desk
const monitorLight = new THREE.PointLight(0xb7d2dc, 0.13, 0.6);
let monitorGlow = 0.13;
monitorLight.position.set(0.06, 0.22, 0.17);
scene.add(monitorLight);
const clock = new THREE.Clock();
const hands = createHands();
let shadowTime = 0;
let qualityTime = 0;
let averageFrame = 1 / 60;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (document.hidden) return;
  controls.update(dt);
  if (mixer && !reducedMotion.matches) mixer.update(dt);
  updateLiveScene(performance.now(), dt);
  shadowTime += dt;
  if (shadowTime > (renderBudget.slow ? 0.25 : 0.13)) { renderer.shadowMap.needsUpdate = true; shadowTime = 0; }
  averageFrame += (dt - averageFrame) * 0.025;
  qualityTime += dt;
  if (qualityTime > 2) {
    // Preserve native pixel density. Under load, spend less on reflections and
    // shadow refreshes rather than making every surface and letter blurry.
    if (averageFrame > 0.04) renderBudget.slow = true;
    else if (averageFrame < 0.028) renderBudget.slow = false;
    qualityTime = 0;
  }
  updatePhonePopupPosition();
  renderer.render(scene, camera);
  // first-person hands on top (own depth, so they never clip into walls)
  // no hands in the menu views or while a book/card is being read
  hands.setVisible(
    document.getElementById('close-btn').style.display !== 'block' &&
      !document.getElementById('book-reader').classList.contains('book-reader--open') && !document.getElementById('portfolio-panel').open && !document.getElementById('certificate-viewer').open
  );
  hands.update(camera, dt);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(hands.scene, camera);
  renderer.autoClear = true;
  // stats.update();
}

function loadIntroText() {
  const loader = new FontLoader();
  loader.load('fonts/unione.json', (font) => {
    const front = new THREE.MeshStandardMaterial({ color: 0xe2e3d9, roughness: 0.52, metalness: 0.24, flatShading: true, envMap: devices.envMap, envMapIntensity: 0.35 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x7c8177, roughness: 0.48, metalness: 0.35, envMap: devices.envMap, envMapIntensity: 0.35 });
    const geometry = new TextGeometry(PROFILE.name.toUpperCase(), { font, size: 0.08, height: 0.01, curveSegments: 6 });
    titleText = new THREE.Mesh(geometry, [front, edge]);
    titleText.rotation.y = Math.PI / 2;
    titleText.position.set(-0.27, 0.55, 0.5).multiplyScalar(ROOM_SCALE);
    titleText.scale.setScalar(ROOM_SCALE); titleText.castShadow = true;
    scene.add(titleText); paintName(true);
  });
  loader.load('fonts/helvatica.json', (font) => {
    const geometry = new TextGeometry(PROFILE.tagline, { font, size: 0.018, height: 0.0005, curveSegments: 5 });
    subtitleText = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xd8ddcf, roughness: 0.85 }));
    subtitleText.rotation.y = Math.PI / 2;
    subtitleText.position.set(-0.262, 0.5, 0.5).multiplyScalar(ROOM_SCALE);
    subtitleText.scale.setScalar(ROOM_SCALE);
    scene.add(subtitleText); paintName(true);
  });
}
function fadeColor(color, value, duration = 0.9) {
  const target = new THREE.Color(value);
  gsap.to(color, { r: target.r, g: target.g, b: target.b, duration, overwrite: true });
}
function paintName(immediate = false) {
  [titleText, subtitleText].filter(Boolean).forEach((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material, index) => {
      const night = theme === 'dark';
      const color = night ? (index === 1 ? 0x858c80 : 0xe7e8dc) : (index === 1 ? 0x68725f : 0x263a2f);
      fadeColor(material.color, color, immediate ? 0 : 0.6);
      material.emissive.set(night ? (object === subtitleText ? 0xc8c1ae : index === 1 ? 0x7e7b98 : 0xc2bead) : 0x000000);
      material.emissiveIntensity = night ? (object === subtitleText ? 0.48 : index === 1 ? 0.1 : 0.42) : 0;
    });
  });
}
function switchTheme(themeType, immediate = false) {
  const night = themeType === 'dark', duration = immediate ? 0 : 0.9;
  wallDecor?.userData.setNight(night); roomFinish?.setNight(night, immediate);
  hands.setNight(night); tubeLight?.setOn(!night, immediate); devices?.setNight(night);
  airCon?.setNight(night, immediate);
  // The wall switch controls the interior light; the scene outside stays at night.
  roomWindow?.setNight(true, immediate); furniture?.setNight(night, immediate);
  document.body.classList.toggle('dark-theme', night); document.body.classList.toggle('light-theme', !night);
  if (lightSwitch) gsap.to(lightSwitch.rotation, { z: night ? Math.PI / 7 : 0, duration: immediate ? 0 : 0.25, overwrite: true });
  fadeColor(roomLight.color, night ? NIGHT_LOOK.roomColor : 0xfff0d9, duration);
  fadeColor(ambientLight.color, night ? NIGHT_LOOK.skyColor : 0xe3decf, duration);
  fadeColor(ambientLight.groundColor, night ? NIGHT_LOOK.groundColor : 0x76644d, duration);
  fadeColor(sunlight.color, NIGHT_LOOK.moonColor, duration);
  gsap.to(roomLight, { intensity: night ? NIGHT_LOOK.roomIntensity : ROOM_DAY, duration, overwrite: true });
  gsap.to(ambientLight, { intensity: night ? NIGHT_LOOK.skyIntensity : AMBIENT_DAY, duration, overwrite: true });
  gsap.to(sunlight, { intensity: NIGHT_LOOK.moonIntensity, duration, overwrite: true });
  gsap.to(fanLight3, { distance: night ? NIGHT_LOOK.fanReach : 0.2, duration, overwrite: true });
  fadeColor(monitorLight.color, night ? 0x9fbfff : 0xb7d2dc, duration);
  monitorGlow = night ? NIGHT_LOOK.monitorGlow : 0.13;
  paintName(immediate);
  const button = document.getElementById('lighting-toggle');
  button?.classList.toggle('is-lit', !night);
  button?.setAttribute('aria-pressed', String(!night));
  button?.setAttribute('aria-label', night ? 'Turn room lights on' : 'Turn room lights off');
  if (button) button.querySelector('span').textContent = night ? 'Lights off' : 'Lights on';
}
function changeLighting() {
  theme = theme === 'dark' ? 'light' : 'dark'; sound.switch(); switchTheme(theme);
}
document.getElementById('lighting-toggle')?.addEventListener('click', changeLighting);

function enableOrbitControls() {
  controls.enabled = true;
}

function disableOrbitControls() {
  // remember where the visitor was standing so "close" can bring them back
  const wasEnabled = controls.enabled;
  controls.enabled = false;
  if (wasEnabled) personPose = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
}

// small "how to look around" hint after walking in
function showLookHint() {
  const hint = document.getElementById('look-hint');
  if (!hint) return;
  hint.classList.add('look-hint--show');
  const help = document.getElementById('room-help');
  help.setAttribute('aria-expanded', 'true');
  const hide = () => {
    hint.classList.remove('look-hint--show');
    help.setAttribute('aria-expanded', 'false');
  };
  controls.onFirstMove = () => setTimeout(hide, 1200);
  setTimeout(hide, 9000);
}

function disableCloseBtn() {
  document.getElementById('close-btn').style.display = 'none';
}

function resetBookCover() {
  if (!bookCover) return;

  gsap.to(bookCover.rotation, {
    x: 0,
    duration: 1.5,
  });
}

function resetProjects() {
  // frames always stay on the wall; just leave the projects view
  inProjectsView = false;
}

function resetCamera() {
  cancelOperation();
  closePanel({ returnToRoom: false });
  setActiveView('room');
  resetBookCover();
  resetProjects();
  disableCloseBtn();
  if (controls.enabled) {
    // logo clicked while walking around: go back to the standing spot
    disableOrbitControls();
    personPose = null;
  }
  const pose = personPose || { pos: defaultCameraPos, quat: eulerToQuat(defaultCamerRot) };
  flyTo(camera, pose.pos, pose.quat, { onComplete: enableOrbitControls });

  // reset dimmed light for about display
  if (theme !== 'dark') {
    gsap.to(roomLight, {
      intensity: ROOM_DAY,
      duration: 1.5,
    });
  }
}

function logoListener() {
  document.getElementById('logo').addEventListener('click', function (e) {
    e.preventDefault();
    if (document.body.classList.contains('intro')) return;
    resetCamera();
  });
  document.getElementById('room-menu').addEventListener('click', resetCamera);
}

function cameraToAbout() {
  cancelOperation();
  disableOrbitControls();
  openPanel('about', { onClose: resetCamera });
}

function aboutMenuListener() {
  document.getElementById('about-menu').addEventListener('click', function (e) {
    e.preventDefault();
    disableOrbitControls();
    resetProjects();
    cameraToAbout();
  });
}

function projectsMenuListener() {
  // desktop: 3 on top, 2 below. mobile (portrait): 2 columns
  const layout = isMobile
    ? [
        // kept below the tube light (y 1.36)
        [0.72, 1.08],
        [1.24, 1.08],
        [0.72, 0.7],
        [1.24, 0.7],
        [0.98, 0.32],
      ]
    : [
        [0.45, 0.95],
        [0.98, 0.95],
        [1.51, 0.95],
        [0.715, 0.53],
        [1.245, 0.53],
      ];

  projects.forEach((project, i) => {
    const frame = createProjectFrame(project, { envMap: devices.envMap, anisotropy: textureAnisotropy, index: i });
    const [x, y] = layout[i % layout.length];
    // the room is scaled to 0.95 on mobile (see initResponsive)
    const roomScale = isMobile ? 0.95 : 1;
    frame.position.set(x * roomScale, y * roomScale, -1.188 * roomScale);
    project.mesh = frame;
    scene.add(frame);
  });

  document
    .getElementById('projects-menu')
    .addEventListener('click', function (e) {
      e.preventDefault();
      cameraToProjects();
    });
}

function cameraToProjects() {
  cancelOperation();
  disableOrbitControls();
  resetBookCover();
  if (theme !== 'dark') {
    gsap.to(roomLight, { intensity: ROOM_DAY, duration: 1.5 });
  }
  flyTo(camera, projectsCameraPos, eulerToQuat(projectsCameraRot), {
    onComplete: () => { inProjectsView = true; },
  });
  openPanel('projects', { onClose: resetCamera, projects, projectInfo: PROJECT_INFO });
}

// lift a frame slightly and show a pointer when hovering it
function initProjectHover() {
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let hovered = null;
  let lastPick = 0;
  const setHovered = (group, uv) => {
    if (hovered === group) {
      hovered?.userData.setHover?.(true, uv);
      return;
    }
    if (hovered?.userData.setHover) hovered.userData.setHover(false);
    else if (hovered) gsap.to(hovered.scale, { x: 1, y: 1, z: 1, duration: reducedMotion.matches ? 0 : 0.3, overwrite: true });
    hovered = group;
    if (hovered?.userData.setHover) hovered.userData.setHover(true, uv);
    else if (hovered) {
      gsap.to(hovered.scale, { x: 1.05, y: 1.05, z: 1.05, duration: reducedMotion.matches ? 0 : 0.35, ease: 'power2.out', overwrite: true });
    }
    canvas.style.cursor = hovered ? 'pointer' : '';
  };
  canvas.addEventListener('pointerleave', () => { setHovered(null); vacuum?.setHovered(false); canvas.title = ''; });
  canvas.addEventListener('pointerdown', () => { hovered?.userData.resetHover?.(); setHovered(null); });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || e.target !== canvas || document.body.classList.contains('intro')) return;
    if (!controls.enabled || (controls.drag && controls.wasDrag())) { setHovered(null); vacuum?.setHovered(false); return; }
    const now = performance.now();
    if (now - lastPick < 30) return;
    lastPick = now;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children)[0];
    vacuum?.setHovered(hit?.object.name === 'Vacuum');
    canvas.title = hit?.object.name === 'Vacuum' ? 'Project Six · Open project details' : '';
    let highlight = null;
    if (hit?.object.name === 'Highlight') {
      highlight = hit.object;
      while (highlight.parent && !highlight.userData.holdItem) highlight = highlight.parent;
    }
    setHovered(controls.enabled && hit ? (hit.object.name === 'project' ? hit.object.userData.group : highlight) : null, hit?.uv);
    if (furniture) furniture.hoverShelfBook(hit && hit.object.name === 'ShelfBook' ? hit.object : null);
    if (hit && ['Vacuum', 'Highlight', 'TubeLight', 'SwitchBoard', 'Switch', 'ShelfBook', 'Telephone', 'Curtain', 'Window', 'AC', 'Chair', 'Lamp', 'FanSwitch', 'FanRegulator', 'Door'].includes(hit.object.name)) {
      canvas.style.cursor = 'pointer';
    }
  });
}

function init3DWorldClickListeners() {
  const mousePosition = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let intersects;

  window.addEventListener('click', function (e) {
    if (e.target !== canvas) return;
    // store value set to prevent multi time update in foreach loop
    // nothing in the room is clickable until the visitor has walked in
    if (document.body.classList.contains('intro')) return;
    // a drag to look around isn't a click
    if (controls.wasDrag()) return;


    // prevent about focus on button click which are positioned above book in mobile view
    const closeBtn = document.getElementById('close-btn');
    const projectsBtn = document.getElementById('projects-menu');
    if (
      e.target === closeBtn ||
      closeBtn.contains(e.target) ||
      e.target === projectsBtn ||
      projectsBtn.contains(e.target)
    ) {
      return false;
    }

    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mousePosition, camera);
    intersects = raycaster.intersectObjects(scene.children);

    // a person does it with their hands: walk up, reach out, act on contact
    if (!replayingClick && intersects[0] && controls.enabled) {
      const how = HAND_ACTIONS[intersects[0].object.name];
      if (how) {
        operateWithHand(intersects[0], how);
        return;
      }
    }

    // clicks on the number card itself shouldn't reach the 3D scene
    const phonePopup = document.getElementById('phone-popup');
    if (phonePopup.contains(e.target)) return;
    // clicking anywhere else puts the handset back
    if (
      telephone &&
      telephone.open &&
      !(intersects[0] && intersects[0].object.name === 'Telephone')
    ) {
      togglePhone(false);
    }

    // a framed project: first zoom to the wall, then open its link
    // curtains open/close, AC on/off
    const hitName = intersects[0] && intersects[0].object.name;
    if (hitName === 'Vacuum') {
      cancelOperation(); disableOrbitControls(); vacuum?.setHovered(false);
      openPanel('vacuum', { onClose: () => { setActiveView('room'); vacuum?.setHovered(false); enableOrbitControls(); } });
      return;
    }
    if ((hitName === 'Curtain' || hitName === 'Window') && roomWindow) {
      roomWindow.toggle();
      return;
    }
    if (hitName === 'AC' && airCon) {
      airCon.toggle();
      return;
    }
    if (hitName === 'FanSwitch' && fanSystem) {
      fanSystem.toggle();
      return;
    }
    if (hitName === 'FanRegulator' && fanSystem) {
      fanSystem.stepSpeed();
      return;
    }
    if (hitName === 'Highlight') {
      // read a resume highlight (degree, role, achievement)
      disableOrbitControls();
      showReader(intersects[0].object.userData.info, enableOrbitControls);
      return;
    }
    if (hitName === 'ShelfBook' && furniture) {
      // stand still while reading, then carry on looking around
      disableOrbitControls();
      furniture.openShelfBook(intersects[0].object, enableOrbitControls);
      return;
    }
    if (hitName === 'Chair' && furniture) {
      furniture.spinChair();
      return;
    }
    if (hitName === 'Lamp' && furniture) {
      furniture.toggleLamp();
      return;
    }

    // desk telephone: lift the handset and show the number
    if (intersects[0] && intersects[0].object.name === 'Telephone') {
      togglePhone();
      return;
    }

    if (intersects[0] && intersects[0].object.name === 'project') {
      if (inProjectsView) {
        const url = intersects[0].object.userData.url;
        url && window.open(url, '_blank', 'noopener');
      } else {
        cameraToProjects();
      }
      return;
    }

    // clicked/tapped the floor: walk there
    const first = intersects[0];
    if (first && controls.enabled && first.point.y < -0.44 * ROOM_SCALE) {
      controls.walkTo(first.point);
      return;
    }

    if (hitName === 'Book' || hitName === 'Book001') { cameraToAbout(); return; }
    if (['SwitchBoard', 'Switch', 'TubeLight'].includes(hitName)) changeLighting();
  });
}

// TELEPHONE
// small LCD on the phone, drawn on a canvas so it can show the number
function drawPhoneScreen(ctx, text, on) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = on ? '#9fe8a5' : '#53675a';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = on ? '#0d2a12' : '#2c3a30';
  ctx.font = `bold ${on ? 50 : 56}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 2);
}

function createTelephone() {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x1d2228, roughness: 0.45 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xe9e9e4, roughness: 0.6 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
  const parts = [];
  const add = (mesh, parent = group) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parts.push(mesh);
    parent.add(mesh);
    return mesh;
  };

  // base (front of the phone faces +x, towards the viewer)
  add(new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.024, 0.118), body)).position.set(0, 0.012, 0);
  // raised cradle at the back for the handset
  const cradle = add(new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.11), body));
  cradle.position.set(-0.031, 0.03, 0);
  // two hook prongs
  [-0.045, 0.045].forEach((z) => {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.012), accent)).position.set(-0.031, 0.039, z);
  });

  // LCD screen
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 96;
  const screenCtx = screenCanvas.getContext('2d');
  drawPhoneScreen(screenCtx, 'CALL ME', false);
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.anisotropy = 4;
  const screen = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.086, 0.016),
      new THREE.MeshBasicMaterial({ map: screenTexture })
    )
  );
  screen.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  screen.position.set(0.007, 0.0245, 0);
  screen.castShadow = false;

  // keypad: 4 rows x 3 columns
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const key = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.014), keyMat));
      key.position.set(0.022 + row * 0.0095, 0.026, (col - 1) * 0.022);
    }
  }

  // handset, resting on the cradle along z
  const handset = new THREE.Group();
  handset.position.set(-0.031, 0.05, 0);
  group.add(handset);
  const grip = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.08, 4, 12), body), handset);
  grip.rotation.x = Math.PI / 2;
  [-0.05, 0.05].forEach((z) => {
    const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.018, 20), body), handset);
    cup.position.set(0, -0.004, z);
  });

  // coiled cord from the base to the handset end
  const coil = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const a = t * Math.PI * 2 * 14;
    coil.push(
      new THREE.Vector3(
        -0.054 - Math.sin(t * Math.PI) * 0.018 + Math.cos(a) * 0.0035,
        0.008 + Math.sin(a) * 0.0035 + t * 0.03,
        -0.05 + t * 0.0 - Math.sin(t * Math.PI) * 0.03
      )
    );
  }
  add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 400, 0.0011, 6), body));

  parts.forEach((mesh) => (mesh.name = 'Telephone'));

  // back-left corner of the desk, between the pencil cup and the book,
  // so the front of the desk stays clear
  group.position.set(-0.1, 0.018, 0.555);
  group.scale.setScalar(0.85);

  return { group, handset, screenCtx, screenTexture, open: false };
}

function togglePhone(force) {
  if (!telephone) return;
  const open = force !== undefined ? force : !telephone.open;
  if (open === telephone.open) return;
  telephone.open = open;

  gsap.to(telephone.handset.position, {
    y: open ? 0.085 : 0.05,
    x: open ? -0.02 : -0.031,
    duration: 0.45,
    ease: open ? 'back.out(2)' : 'power2.out',
  });
  gsap.to(telephone.handset.rotation, {
    x: open ? -0.35 : 0,
    duration: 0.45,
  });
  drawPhoneScreen(telephone.screenCtx, open ? PHONE_DISPLAY : 'CALL ME', open);
  telephone.screenTexture.needsUpdate = true;

  const popup = document.getElementById('phone-popup');
  popup.classList.toggle('phone-popup--open', open);
  popup.setAttribute('aria-hidden', String(!open));
  updatePhonePopupPosition();
}

// keep the number card floating just above the phone
const phonePopupAnchor = new THREE.Vector3();
function updatePhonePopupPosition() {
  if (!telephone || !telephone.open) return;
  const popup = document.getElementById('phone-popup');
  telephone.group.getWorldPosition(phonePopupAnchor);
  phonePopupAnchor.y += 0.1;
  phonePopupAnchor.project(camera);
  const x = (phonePopupAnchor.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-phonePopupAnchor.y * 0.5 + 0.5) * window.innerHeight;
  const half = popup.offsetWidth / 2 + 12;
  popup.style.left = `${Math.min(Math.max(x, half), window.innerWidth - half)}px`;
  popup.style.top = `${Math.max(y, popup.offsetHeight + 70)}px`;
}

document.getElementById('phone-popup-close').addEventListener('click', (e) => {
  e.preventDefault();
  togglePhone(false);
});

// RESPONSIVE
function initResponsive(roomScene) {
  if (isMobile) {
    roomScene.scale.set(0.95, 0.95, 0.95);

    // rect light
    // rectLight.width = 0.406;
    // rectLight.height = 0.3;
    // rectLight.position.z = -0.34;

    // project wall, framed for a portrait screen
    projectsCameraPos = {
      x: 0.98 * ROOM_SCALE,
      y: 0.68 * ROOM_SCALE,
      z: 0.65 * ROOM_SCALE,
    };
    projectsCameraRot = {
      x: 0,
      y: 0,
      z: 0,
    };
  }
}

// close button
document.getElementById('close-btn').addEventListener('click', (e) => {
  e.preventDefault();
  resetCamera();
});

// contact menu
document.getElementById('contact-btn').addEventListener('click', (e) => {
  e.preventDefault();
  disableOrbitControls();
  cancelOperation();
  openPanel('contact', { onClose: resetCamera });
});

// update camera, renderer on resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// DRAG THE CHAIR: press on it and drag across the floor; a quick click still spins it
(() => {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let drag = null;
  const toNdc = (e) => ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);

  window.addEventListener('pointerdown', (e) => {
    if (!furniture || !controls.enabled || e.target.tagName !== 'CANVAS') return;
    ray.setFromCamera(toNdc(e), camera);
    const first = ray.intersectObjects(scene.children, true)[0];
    if (!first || first.object.name !== 'Chair') return;
    const g = furniture.chairGroup;
    const room = g.parent;
    // drag along a horizontal plane at the height you grabbed it, so the chair
    // stays under the cursor (room-local offsets)
    floor.constant = -first.point.y;
    if (!ray.ray.intersectPlane(floor, hit)) return;
    const local = room.worldToLocal(hit.clone());
    drag = { id: e.pointerId, room, dx: g.position.x - local.x, dz: g.position.z - local.z, moved: 0, sx: e.clientX, sy: e.clientY };
    controls.drag = null; // don't turn the head while dragging the chair
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    controls.drag = null;
    drag.moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    if (drag.moved > 8) sound.chairRoll(0.45);
    ray.setFromCamera(toNdc(e), camera);
    if (!ray.ray.intersectPlane(floor, hit)) return;
    const local = drag.room.worldToLocal(hit.clone());
    // keep it inside the room, clear of the walls
    const x = THREE.MathUtils.clamp(local.x + drag.dx, 0.05, 1.7);
    const z = THREE.MathUtils.clamp(local.z + drag.dz, -0.9, 2.05);
    furniture.moveChair(x, z);
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // a real drag shouldn't also count as a click (which would spin the chair)
    if (drag.moved > 6) controls.dragDistance = 999;
    drag = null;
    canvas.style.cursor = '';
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
})();

// HANDS: which things are operated by hand, and how
const HAND_ACTIONS = {
  Switch: { pose: 'point', walk: true },
  SwitchBoard: { pose: 'point', walk: true },
  FanSwitch: { pose: 'point', walk: true },
  FanRegulator: { pose: 'pinch', walk: true },
  Lamp: { pose: 'point', walk: true },
  Telephone: { pose: 'grab', walk: true },
  Curtain: { pose: 'grab', walk: true },
  Window: { pose: 'grab', walk: true },
  Chair: { pose: 'grab', walk: true },
  ShelfBook: { custom: 'book' },
  Highlight: { custom: 'highlight' },
  project: { custom: 'project' },
  AC: { custom: 'remote' }, // pick up the remote and use it
  TubeLight: { pose: 'point', walk: false },
  Door: { custom: 'door' }, // grab the handle and pull the door open
};
let replayingClick = false;
let operating = false;
let operationVersion = 0;
let activeApproach = null;

function cancelOperation() {
  if (!operating) return;
  operationVersion++;
  activeApproach?.cancel();
  hands.retract(0.18);
}
function operateWithHand(hit, how) {
  if (operating) return;
  operating = true; controls.enabled = false;
  const version = ++operationVersion;
  const step = async (promise) => {
    await promise;
    if (version !== operationVersion) throw new Error('Interaction cancelled');
  };
  const perform = async () => {
    if (how.custom) { await runHandFlow(hit, how.custom, step); return; }
    const target = hit.point.clone();
    await step(approach(target, how.walk));
    await step(hands.reach(camera, target, how.pose));
    const projected = target.clone().project(camera);
    controls.enabled = true; replayingClick = true;
    try {
      canvas.dispatchEvent(new MouseEvent('click', { clientX: (projected.x * 0.5 + 0.5) * innerWidth, clientY: (-projected.y * 0.5 + 0.5) * innerHeight, bubbles: true }));
    } finally { replayingClick = false; }
  };
  perform().catch((error) => {
    if (version === operationVersion) console.error(error);
  }).finally(() => {
    operating = false;
    if (version !== operationVersion || document.getElementById('book-reader').classList.contains('book-reader--open') || document.getElementById('portfolio-panel').open || document.getElementById('certificate-viewer').open) return;
    controls.enabled = true;
  });
}

// A collision-checked path, with rounded corners only where there is clearance.
function walkingCurve(points) {
  const path = new THREE.CurvePath();
  let previous = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i], after = points[i + 1];
    const radius = Math.min(0.085 * ROOM_SCALE, previous.distanceTo(corner) * 0.25, corner.distanceTo(after) * 0.25);
    const enter = corner.clone().lerp(previous, radius / Math.max(1e-6, previous.distanceTo(corner)));
    const exit = corner.clone().lerp(after, radius / Math.max(1e-6, corner.distanceTo(after)));
    const curve = new THREE.QuadraticBezierCurve3(enter, corner, exit);
    const clear = Array.from({ length: 13 }, (_, k) => curve.getPoint(k / 12)).every((point) => controls.navigation.isFree(point.x, point.z));
    if (clear) { path.add(new THREE.LineCurve3(previous, enter)); path.add(curve); previous = exit; }
    else { path.add(new THREE.LineCurve3(previous, corner)); previous = corner; }
  }
  path.add(new THREE.LineCurve3(previous, points[points.length - 1]));
  return path;
}
function approach(target, walk = true, { reach = 0.3, lookOnly = false } = {}) {
  activeApproach?.cancel();
  const from = camera.position.clone(), flat = new THREE.Vector3(target.x - from.x, 0, target.z - from.z);
  let stand = from.clone();
  if (walk && !lookOnly && flat.length() > reach * ROOM_SCALE + 0.12) {
    stand.copy(target).sub(flat.clone().setLength(reach * ROOM_SCALE)); stand.y = from.y; controls.resolve(stand);
  }
  const route = walk ? controls.navigation.route(from, stand) : [{ x: from.x, z: from.z }];
  const points = [from, ...route.map((point) => new THREE.Vector3(point.x, from.y, point.z))];
  if (points.length < 2) points.push(from.clone());
  const curve = walkingCurve(points), distance = curve.getLength();
  const look = target.clone().sub(points[points.length - 1]);
  const toQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.clamp(Math.atan2(look.y, Math.hypot(look.x, look.z)) * 0.85, -1.2, 1.2), Math.atan2(-look.x, -look.z), 0, 'YXZ'));
  const fromQ = camera.quaternion.clone(), progress = { p: 0 }, previous = from.clone();
  return new Promise((resolve) => {
    let tween;
    const current = { cancel: () => { tween?.kill(); if (activeApproach === current) activeApproach = null; resolve(); } };
    activeApproach = current;
    tween = gsap.to(progress, {
      p: 1, duration: reducedMotion.matches ? 0 : Math.min(2.6, 0.45 + distance / (0.78 * ROOM_SCALE)), ease: 'sine.inOut',
      onUpdate: () => {
        curve.getPointAt(progress.p, camera.position);
        camera.quaternion.slerpQuaternions(fromQ, toQ, progress.p);
        if (!reducedMotion.matches) controls._countSteps(previous.distanceTo(camera.position));
        previous.copy(camera.position);
      },
      onComplete: () => { if (activeApproach === current) activeApproach = null; resolve(); },
    });
  });
}

// ---- picking things up --------------------------------------------------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const camQ = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
let heldItem = null;

// hold `obj` in front of the eyes, run `whileHeld`, then put it back exactly
async function holdAndReturn(obj, camPos, quat, opts, whileHeld, step) {
  const parent = obj.parent, localPos = (opts.returnPosition || obj.position).clone(), localQuat = obj.quaternion.clone(), localScale = (obj.userData.homeScale || obj.scale).clone();
  try {
    const target = obj.getWorldPosition(new THREE.Vector3());
    await step(approach(target, true, { reach: 0.32 }));
    await step(hands.reach(camera, target, 'grab', { retract: false }));
    heldItem = obj;
    await step(hands.holdItem(camera, obj, camPos, quat, { ...opts, duration: 0.55 }));
    await step(whileHeld());
    await step(approach(parent.localToWorld(localPos.clone()), false));
    await step(hands.releaseItem(obj, parent, localPos, localQuat, { duration: 0.55 }));
  } finally {
    if (obj.parent !== parent) parent.attach(obj);
    obj.position.copy(localPos); obj.quaternion.copy(localQuat); obj.scale.copy(localScale);
    heldItem = null; hands.retract(0.2);
  }
}

function readUntilClosed(info) {
  return new Promise((resolve) => showReader(info, resolve));
}

async function runHandFlow(hit, kind, step) {
  const version = operationVersion;
  if (kind === 'book') {
    const book = hit.object.userData.book;
    furniture?.resetShelfBookHover(book);
    book.userData.setReadingDetail?.(true);
    try {
      await holdAndReturn(book, new THREE.Vector3(0.0, -0.04, -0.27), camQ(0.15, -Math.PI / 2, 0.08), { returnPosition: book.userData.home }, async () => {
        await step(wait(350));
        await readUntilClosed(book.userData.info);
      }, step);
    } finally { book.userData.setReadingDetail?.(false); }
    return;
  }
  if (kind === 'highlight') {
    let item = hit.object;
    while (item.parent && !item.userData.holdItem) item = item.parent;
    item.userData.resetHover?.();
    const size = new THREE.Box3().setFromObject(item).getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, size.y);
    const both = span > 0.2;
    await holdAndReturn(item, new THREE.Vector3(0, -0.03, -Math.min(0.6, Math.max(0.3, span * 1.5))), camQ(0.08), { both }, async () => {
      await step(wait(350));
      await readUntilClosed(hit.object.userData.info);
    }, step);
    return;
  }
  if (kind === 'project') {
    const frame = hit.object.userData.group;
    const title = hit.object.userData.title;
    const info = { kicker: 'Project', title, ...(PROJECT_INFO[title] || { subtitle: '', color: '#333', intro: '', points: [], usedIn: '' }), link: hit.object.userData.url, linkLabel: 'Open on GitHub' };
    await holdAndReturn(frame, new THREE.Vector3(0, -0.02, -0.5), camQ(0.06), { both: true }, async () => {
      await step(wait(350));
      await readUntilClosed(info);
    }, step);
    return;
  }
  if (kind === 'door') {
    if (!doorway) return;
    const handleAt = () => doorway.handlePoint('inside');
    // 1. walk up to the door and take the handle
    await step(approach(handleAt(), true, { reach: 0.34 }));
    await step(hands.reach(camera, handleAt(), 'grab', { retract: false }));
    const stop = hands.follow(camera, handleAt);
    try {
    // 2. press the lever and pull: the door opens into the room, so step back with it
    await step(doorway.pressHandle('inside', true));
    sound.doorOpen();
    const from = camera.position.clone();
    const back = from.clone().add(new THREE.Vector3(-0.16 * ROOM_SCALE, 0, 0));
    controls.resolve(back);
    const k = { p: 0 };
    gsap.to(k, { p: 1, duration: 0.55, ease: 'power1.inOut', onUpdate: () => { if (version === operationVersion) camera.position.lerpVectors(from, back, k.p); } });
    await step(gsap.to(doorway.pivot.rotation, { y: -0.55, duration: 0.55, ease: 'power1.inOut' }));
    stop();
    hands.retract(0.4);
    doorway.pressHandle('inside', false);
    // 3. it swings wide, you get a look at the hallway, then it closes by itself
    gsap.to(doorway.pivot.rotation, { y: -1.45, duration: 1.0, ease: 'power2.out' });
    await step(wait(1500));
    sound.doorClose();
    await step(gsap.to(doorway.pivot.rotation, { y: 0, duration: 1.0, ease: 'power2.in' }));
    } finally { stop(); hands.retract(0.2); doorway.pressHandle('inside', false); if (version !== operationVersion) gsap.to(doorway.pivot.rotation, { y: 0, duration: 0.6, overwrite: true }); }
    return;
  }
  if (kind === 'remote') {
    const remote = fanSystem && fanSystem.remote;
    if (!remote || !airCon) return;
    const parent = remote.parent;
    const localPos = remote.position.clone();
    const localQuat = remote.quaternion.clone();
    const localScale = remote.scale.clone();
    const remoteAt = remote.getWorldPosition(new THREE.Vector3());
    try {
    // 1. walk to the sideboard and pick the remote up
    await step(approach(remoteAt, true, { reach: 0.3 }));
    await step(hands.reach(camera, remoteAt, 'grab', { retract: false }));
    heldItem = remote;
    // lies along the palm (palm up), buttons up, fingertips curled over its far edge
    const inPalm = {
      gripPos: new THREE.Vector3(0.004, -0.017, -0.05),
      gripQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, Math.PI)),
      // thumb lies across the buttons, nail up, tip near the power key
      thumbPos: new THREE.Vector3(-0.026, -0.014, -0.022),
      thumbRot: new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion()
          .setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0.02, -0.022, -0.035).normalize())
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI))
      ),
    };
    await step(hands.gripItem(camera, remote, { ...inPalm, armPos: new THREE.Vector3(0.07, -0.12, -0.23), armRot: new THREE.Euler(0.45, 0.2, Math.PI), duration: 0.55 }));
    // 2. turn to the AC, raise the remote and press the button
    const acAt = airCon.group.getWorldPosition(new THREE.Vector3());
    await step(approach(acAt, false));
    await step(hands.moveArm(new THREE.Vector3(0.06, -0.085, -0.26), new THREE.Euler(0.65, 0.15, Math.PI)));
    await step(hands.pressThumb('hold'));
    airCon.toggle();
    await step(wait(700));
    // 3. turn back and put it down where it was
    const home = parent.localToWorld(localPos.clone());
    await step(approach(home, false));
    await step(hands.releaseItem(remote, parent, localPos, localQuat));
    heldItem = null;
    await step(wait(200));
    } finally { if (remote.parent !== parent) parent.attach(remote); remote.position.copy(localPos); remote.quaternion.copy(localQuat); remote.scale.copy(localScale); heldItem = null; hands.retract(0.2); }
  }
}
