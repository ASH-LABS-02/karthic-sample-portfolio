// Live details that make the room feel lived-in:
// a monitor with code being typed and real-time server logs,
// a wall clock on real time, steam from the coffee and a swaying plant.
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// MONITOR: IDE with live typing + terminal logs + real clock
// ---------------------------------------------------------------------------
const FILES = [
  {
    name: 'ExampleController.java',
    lang: 'java',
    code: `package com.example.portfolio.web;

@RestController
@RequestMapping("/api/v1/example")
@RequiredArgsConstructor
public class ExampleController {

    private final ExampleService exampleService;

    @PostMapping("/items")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ExampleItem> create(
            @Valid @RequestBody ExampleRequest request) {
        // Replace this sample with code from your own work.
        ExampleItem item = exampleService.create(request);
        return ResponseEntity.ok(item);
    }

    @GetMapping("/items/{id}")
    public ExampleItem find(@PathVariable UUID id) {
        return exampleService.find(id);
    }
}`,
  },
  {
    name: 'example_service.py',
    lang: 'py',
    code: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Your Project")
items = {}

class ExampleItem(BaseModel):
    title: str
    description: str

@app.post("/items/{item_id}")
async def save_item(item_id: str, item: ExampleItem):
    # Example code displayed as room decoration.
    items[item_id] = item
    return {"id": item_id, "item": item}`,
  },
  {
    name: 'SecurityConfig.java',
    lang: 'java',
    code: `@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http,
                                    JwtAuthFilter jwtFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/items/**").hasAnyRole("ADMIN", "USER")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}`,
  },
];

const LOG_TEMPLATES = [
  ['INFO', 'http-worker-{n}', 'c.e.project.ExampleController', 'GET /api/items/{id} 200 ({ms} ms)'],
  ['INFO', 'http-worker-{n}', 'c.e.project.ExampleService', 'sample item {id} loaded ({ms} ms)'],
  ['DEBUG', 'http-worker-{n}', 'c.e.project.AuthFilter', 'example session validated'],
  ['INFO', 'task-worker-{n}', 'c.e.project.TaskService', 'sample task {id} completed in {ms} ms'],
  ['INFO', 'event-worker-{n}', 'c.e.project.EventListener', 'sample event #{id} -> COMPLETED'],
  ['INFO', 'http-worker-{n}', 'c.e.project.RouteFilter', 'routed /items/{id} -> example-service ({ms} ms)'],
  ['DEBUG', 'scheduling-1', 'c.e.project.HealthJob', 'sample health check passed'],
  ['INFO', 'scheduling-1', 'c.e.project.ExampleJob', 'example job {id} completed in {ms} ms'],
];

const JAVA_KW = new Set(
  'package import public private protected class interface return new final static void throws throw if else for while try catch this null true false var'.split(' ')
);
const PY_KW = new Set(
  'from import def async await return for in if else elif with as class None True False lambda'.split(' ')
);

const C = {
  bg: '#1e1f22',
  panel: '#2b2d30',
  border: '#393b40',
  text: '#bcbec4',
  dim: '#6f737a',
  kw: '#cf8e6d',
  str: '#6aab73',
  ann: '#b3ae60',
  com: '#7a7e85',
  num: '#2aacb8',
  fn: '#56a8f5',
  info: '#6aab73',
  warn: '#e0b45a',
  debug: '#7a8fb5',
};

// split one line of code into coloured tokens
function tokenize(line, lang) {
  const out = [];
  const kw = lang === 'py' ? PY_KW : JAVA_KW;
  const re = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(@\w+)|(\b\d+\b)|(\b[A-Za-z_]\w*\b)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    if (m[1] && (lang === 'py' ? m[1][0] === '#' : m[1][0] === '/')) out.push([m[1], C.com]);
    else if (m[1]) out.push([m[1], C.text]);
    else if (m[2]) out.push([m[2], C.str]);
    else if (m[3]) out.push([m[3], C.ann]);
    else if (m[4]) out.push([m[4], C.num]);
    else if (m[5]) {
      const next = line[re.lastIndex];
      if (kw.has(m[5])) out.push([m[5], C.kw]);
      else if (next === '(') out.push([m[5], C.fn]);
      else out.push([m[5], C.text]);
    } else out.push([m[0], C.text]);
  }
  return out;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));

export function createCodeScreen() {
  const W = 1280;
  const H = 740;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  // the monitor's UVs run right-to-left, so flip the canvas horizontally
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;

  const FONT = '20px "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace';
  const LINE_H = 27;
  const TOP = 44 + 34; // title bar + tabs
  const TERM_H = 196;
  const STATUS_H = 30;
  const editorBottom = H - TERM_H - STATUS_H;
  const visibleLines = Math.floor((editorBottom - TOP - 10) / LINE_H);

  let fileIndex = 0;
  let typed = 0; // characters typed in current file
  let nextKeyAt = 0;
  let pauseUntil = 0;
  const logs = [];
  let nextLogAt = 0;
  let lastDraw = 0;

  function addLog(now) {
    const [level, thread, logger, msg] = LOG_TEMPLATES[rand(0, LOG_TEMPLATES.length)];
    const d = new Date();
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    const fill = (s) =>
      s.replace('{n}', rand(1, 9)).replace('{ms}', rand(12, 240)).replace('{id}', rand(1000, 9999));
    logs.push({ ts, level, thread: fill(thread), logger, msg: fill(msg) });
    if (logs.length > 20) logs.shift();
    nextLogAt = now + rand(900, 2600);
  }

  function step(now) {
    const file = FILES[fileIndex];
    if (now < pauseUntil) return;
    if (typed >= file.code.length) {
      // finished this file: hold for a moment, then open the next one
      if (!pauseUntil || pauseUntil < now - 10) {
        pauseUntil = now + 3500;
        return;
      }
      fileIndex = (fileIndex + 1) % FILES.length;
      typed = 0;
      pauseUntil = 0;
      return;
    }
    while (now >= nextKeyAt && typed < file.code.length) {
      const ch = file.code[typed];
      typed++;
      // human-ish rhythm: faster through indentation, short pauses at line ends
      let delay = rand(28, 75);
      if (ch === ' ' && file.code[typed] === ' ') delay = 6;
      if (ch === '\n') delay = rand(120, 380);
      if (Math.random() < 0.01) delay += 600; // thinking...
      nextKeyAt = (nextKeyAt || now) + delay;
      if (nextKeyAt < now - 200) nextKeyAt = now; // tab was in background
    }
  }

  function draw(now) {
    const file = FILES[fileIndex];
    const d = new Date();
    ctx.textBaseline = 'middle';

    // window
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // title bar
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, 0, W, 44);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(26 + i * 24, 22, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.fillText('example-project  —  ' + file.name, W / 2, 23);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.dim;
    ctx.fillText(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, W - 20, 23);
    ctx.textAlign = 'left';

    // tabs
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 44, W, 34);
    let x = 16;
    FILES.forEach((f, i) => {
      ctx.font = '17px system-ui, sans-serif';
      const w = ctx.measureText(f.name).width + 34;
      if (i === fileIndex) {
        ctx.fillStyle = '#26282c';
        ctx.fillRect(x - 8, 44, w, 34);
        ctx.fillStyle = C.fn;
        ctx.fillRect(x - 8, 75, w, 3);
      }
      ctx.fillStyle = i === fileIndex ? C.text : C.dim;
      ctx.fillText(f.name, x + 10, 61);
      ctx.fillStyle = f.lang === 'py' ? '#e0b45a' : '#cf8e6d';
      ctx.fillRect(x - 2, 56, 6, 10);
      x += w + 6;
    });
    ctx.fillStyle = C.border;
    ctx.fillRect(0, 77, W, 1);

    // code
    const text = file.code.slice(0, typed);
    const lines = text.split('\n');
    const first = Math.max(0, lines.length - visibleLines);
    ctx.font = FONT;
    for (let i = first; i < lines.length; i++) {
      const y = TOP + 14 + (i - first) * LINE_H;
      ctx.fillStyle = C.dim;
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), 54, y);
      ctx.textAlign = 'left';
      let cx = 76;
      if (i === lines.length - 1) {
        ctx.fillStyle = '#26282c';
        ctx.fillRect(60, y - LINE_H / 2, W - 60, LINE_H);
      }
      for (const [tok, col] of tokenize(lines[i], file.lang)) {
        ctx.fillStyle = col;
        ctx.fillText(tok, cx, y);
        cx += ctx.measureText(tok).width;
      }
      // blinking caret
      if (i === lines.length - 1 && Math.floor(now / 530) % 2 === 0) {
        ctx.fillStyle = '#ced0d6';
        ctx.fillRect(cx + 1, y - 11, 2, 22);
      }
    }

    // terminal
    const ty = editorBottom;
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, ty, W, TERM_H);
    ctx.fillStyle = C.border;
    ctx.fillRect(0, ty, W, 1);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = C.text;
    ctx.fillText('Run', 18, ty + 18);
    ctx.fillStyle = C.dim;
    ctx.fillText('ExampleApplication', 58, ty + 18);
    ctx.font = '15px "JetBrains Mono", Menlo, Consolas, monospace';
    const shown = logs.slice(-6);
    shown.forEach((l, i) => {
      const y = ty + 46 + i * 24;
      let lx = 16;
      const part = (s, c) => {
        ctx.fillStyle = c;
        ctx.fillText(s, lx, y);
        lx += ctx.measureText(s).width;
      };
      part(l.ts + '  ', C.dim);
      part(l.level.padEnd(5) + ' ', l.level === 'WARN' ? C.warn : l.level === 'DEBUG' ? C.debug : C.info);
      part(`[${l.thread}] `, C.dim);
      part(l.logger + ' : ', C.fn);
      part(l.msg, C.text);
    });

    // status bar
    const sy = H - STATUS_H;
    ctx.fillStyle = '#2b2d30';
    ctx.fillRect(0, sy, W, STATUS_H);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = C.dim;
    ctx.fillText('⎇ main', 16, sy + 15);
    ctx.fillStyle = C.info;
    ctx.fillText('● Spring Boot 3.3  ·  running on :8080', 100, sy + 15);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.dim;
    ctx.fillText(
      `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}   UTF-8   ${file.lang === 'py' ? 'Python 3.12' : 'Java 21'}`,
      W - 16,
      sy + 15
    );
    ctx.textAlign = 'left';

    texture.needsUpdate = true;
  }

  // a few log lines so the terminal isn't empty on load
  const t0 = performance.now();
  for (let i = 0; i < 4; i++) addLog(t0);
  logs.unshift({
    ts: '',
    level: 'INFO',
    thread: 'main',
    logger: 'c.e.i.ExampleApplication',
    msg: 'Started ExampleApplication in 2.84 seconds',
  });
  nextLogAt = t0 + 1500;

  return {
    texture,
    update(now) {
      step(now);
      if (now >= nextLogAt) addLog(now);
      // redraw ~20 fps, enough for typing and the caret
      if (now - lastDraw > 80) {
        lastDraw = now;
        draw(now);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// WALL CLOCK on real local time
// ---------------------------------------------------------------------------
export function createWallClock() {
  const group = new THREE.Group();
  const R = 0.07;

  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 512;
  const f = faceCanvas.getContext('2d');
  f.fillStyle = '#f7f5f0';
  f.fillRect(0, 0, 512, 512);
  f.translate(256, 256);
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    f.save();
    f.rotate((i / 60) * Math.PI * 2);
    f.fillStyle = '#1d1d1d';
    f.fillRect(major ? -5 : -2, -238, major ? 10 : 4, major ? 38 : 16);
    f.restore();
  }
  f.fillStyle = '#1d1d1d';
  f.font = '600 58px Georgia, serif';
  f.textAlign = 'center';
  f.textBaseline = 'middle';
  [12, 3, 6, 9].forEach((n, i) => {
    const a = (i / 4) * Math.PI * 2;
    f.fillText(String(n), Math.sin(a) * 160, -Math.cos(a) * 160 + 2);
  });
  const faceTex = new THREE.CanvasTexture(faceCanvas);

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(R, 64),
    new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.8 })
  );
  face.position.z = 0.0068; // just in front of the backing disc
  group.add(face);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R + 0.004, 0.006, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.4, metalness: 0.3 })
  );
  rim.position.z = 0.0068;
  rim.castShadow = true;
  group.add(rim);

  const back = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.006, R + 0.006, 0.012, 64),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  back.rotation.x = Math.PI / 2;
  back.castShadow = true;
  group.add(back);

  const hand = (len, width, color, z) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, len, 0.0015),
      new THREE.MeshStandardMaterial({ color })
    );
    mesh.position.y = len / 2 - len * 0.15;
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.position.z = z;
    group.add(pivot);
    return pivot;
  };
  const hour = hand(R * 0.55, 0.006, 0x1a1a1a, 0.008);
  const minute = hand(R * 0.8, 0.004, 0x1a1a1a, 0.0095);
  const second = hand(R * 0.88, 0.0016, 0xc0392b, 0.011);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.003, 20),
    new THREE.MeshStandardMaterial({ color: 0xc0392b })
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.0125;
  group.add(cap);

  return {
    group,
    update() {
      const d = new Date();
      const s = d.getSeconds() + d.getMilliseconds() / 1000;
      const m = d.getMinutes() + s / 60;
      const h = (d.getHours() % 12) + m / 60;
      // clockwise when looking at the face
      second.rotation.z = -(s / 60) * Math.PI * 2;
      minute.rotation.z = -(m / 60) * Math.PI * 2;
      hour.rotation.z = -(h / 12) * Math.PI * 2;
    },
  };
}

// ---------------------------------------------------------------------------
// STEAM rising from the coffee
// ---------------------------------------------------------------------------
export function createSteam(origin) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);

  const group = new THREE.Group();
  group.position.copy(origin);
  const puffs = [];
  const COUNT = 9;
  const LIFE = 3.6;
  for (let i = 0; i < COUNT; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: 0xf2f2f2, transparent: true, opacity: 0, depthWrite: false })
    );
    sprite.userData = { offset: (i / COUNT) * LIFE, seed: Math.random() * 10 };
    group.add(sprite);
    puffs.push(sprite);
  }

  return {
    group,
    update(t) {
      puffs.forEach((p) => {
        const { offset, seed } = p.userData;
        const life = ((t + offset) % LIFE) / LIFE; // 0..1
        const rise = life * 0.1;
        p.position.set(
          Math.sin(t * 0.9 + seed + life * 4) * 0.008 * life,
          rise,
          Math.cos(t * 0.7 + seed + life * 3) * 0.008 * life
        );
        const size = 0.014 + life * 0.04;
        p.scale.set(size, size * 1.3, 1);
        p.material.opacity = Math.sin(life * Math.PI) * 0.3;
      });
    },
  };
}
