import { PROFILE } from './profile.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 512, H = 256;
// +X front cover, -X back cover, +Y/-Y paper edges, +Z spine, -Z fore-edge.
const faces = [[48, 0, 176, 256], [224, 0, 176, 256], [448, 0, 64, 128], [448, 128, 64, 128], [0, 0, 48, 256], [400, 0, 48, 256]];
const number = book => String(book.volume || 1).padStart(2, '0');

function colors(book) {
  const paper = book.jacket === 3;
  const hex = parseInt(book.color.slice(1), 16);
  const light = .2126 * (hex >> 16) + .7152 * ((hex >> 8) & 255) + .0722 * (hex & 255) > 154;
  return {
    base: paper ? '#e8dfca' : book.color,
    ink: paper || light ? '#263e3c' : '#f5e8cc',
    accent: paper ? (light ? '#71634b' : book.color) : (light ? '#88602e' : '#d5b77d'),
  };
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function cloth(x, w, h, base, seed) {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  let n = seed * 41 + 17;
  const random = () => ((n = n * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < w * h / 14; i++) {
    x.fillStyle = random() > .5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.025)';
    x.fillRect(random() * w, random() * h, .5, .8);
  }
}
function text(x, value, px, py, size, ink, family = 'Georgia', align = 'left') {
  x.fillStyle = ink; x.font = `600 ${size}px ${family}`; x.textAlign = align; x.textBaseline = 'alphabetic'; x.fillText(value, px, py);
}
function rule(x, x1, y1, x2, y2, ink, width = .7) {
  x.strokeStyle = ink; x.lineWidth = width; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
}
function wrap(x, value, max) {
  const lines = [];
  for (const word of value.split(/\s+/)) {
    if (!lines.length || x.measureText(`${lines.at(-1)} ${word}`).width > max) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}

export function drawSpine(book, w = 96, h = 640) {
  const c = canvas(w, h), x = c.getContext('2d'), { base, ink, accent } = colors(book);
  // Draw in one consistent space so narrow and thick volumes share a type scale.
  x.scale(w / 48, h / 256); cloth(x, 48, 256, base, book.volume || 1);
  const shading = x.createLinearGradient(0, 0, 48, 0);
  shading.addColorStop(0, 'rgba(0,0,0,.3)'); shading.addColorStop(.25, 'rgba(255,255,255,.09)'); shading.addColorStop(.75, 'rgba(0,0,0,0)'); shading.addColorStop(1, 'rgba(0,0,0,.2)');
  x.fillStyle = shading; x.fillRect(0, 0, 48, 256);
  if (book.jacket === 1 || book.jacket === 3) {
    x.fillStyle = book.jacket === 3 ? accent : '#e8dfca'; x.fillRect(4, 10, 40, 26);
    text(x, number(book), 24, 29, 13, book.jacket === 3 ? '#fff7e8' : '#263e3c', 'Arial', 'center');
    rule(x, 7, 222, 41, 222, accent);
  } else {
    [12, 16, 223, 227].forEach(y => rule(x, 6, y, 42, y, accent));
    text(x, number(book), 24, 36, 10, ink, 'Arial', 'center');
  }
  x.save(); x.translate(24, 133); x.rotate(-Math.PI / 2);
  let size = book.jacket === 1 ? 18 : 17;
  const family = book.jacket === 1 ? 'Arial' : 'Georgia';
  x.font = `600 ${size}px ${family}`;
  while (x.measureText(book.title.toUpperCase()).width > 171 && size > 10) x.font = `600 ${--size}px ${family}`;
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(book.title.toUpperCase(), 0, 0); x.restore();
  text(x, PROFILE.initials.split('').join(' '), 24, 246, 9, ink, 'Georgia', 'center');
  return c;
}

function cover(book, back = false, scale = 1) {
  const c = canvas(176 * scale, 256 * scale), x = c.getContext('2d'), { base, ink, accent } = colors(book), style = book.jacket || 0;
  x.scale(scale, scale);
  cloth(x, 176, 256, base, (book.volume || 1) + (back ? 100 : 0));
  // Binding groove, printed rules and a modest publisher's mark.
  rule(x, back ? 169 : 7, 0, back ? 169 : 7, 256, 'rgba(0,0,0,.22)', 2);
  if (style === 0) {
    x.strokeStyle = accent; x.lineWidth = .7; x.strokeRect(15, 14, 146, 228); x.strokeRect(18, 17, 140, 222);
  } else if (style === 1) {
    x.fillStyle = '#e8dfca'; x.fillRect(14, 16, 148, 29);
    text(x, 'THE REFERENCE SERIES', 22, 35, 8, '#263e3c', 'Arial');
  } else if (style === 2) {
    x.fillStyle = ink; x.globalAlpha = .12; x.fillRect(102, 0, 74, 256); x.globalAlpha = 1;
    rule(x, 18, 37, 156, 37, accent, 2);
  } else {
    x.fillStyle = accent; x.fillRect(0, 0, 176, 8);
    text(x, 'FIELD / NOTES', 19, 34, 9, accent, 'Arial');
  }
  if (back) {
    text(x, book.collection.toUpperCase(), 26, 66, 8, ink, 'Arial');
    x.font = '11px Georgia'; const lines = wrap(x, book.subtitle, 122);
    lines.forEach((line, i) => text(x, line, 26, 94 + i * 16, 11, ink));
    [0, 1, 2].forEach(i => rule(x, 26, 162 + i * 7, 136 - i * 14, 162 + i * 7, accent));
    text(x, `${PROFILE.initials} / ${number(book)}`, 26, 217, 10, ink, 'Arial');
    return c;
  }
  if (style !== 1 && style !== 3) text(x, `VOLUME ${number(book)}`, 88, 39 + (style === 2 ? 15 : 0), 8, ink, 'Arial', 'center');
  let size = 24, titleLines;
  do {
    x.font = `600 ${size}px ${style === 1 ? 'Arial' : 'Georgia'}`;
    titleLines = wrap(x, book.title, 130);
    if (titleLines.length <= 3 && titleLines.every(line => x.measureText(line).width <= 134)) break;
    size--;
  } while (size > 12);
  const top = style === 1 ? 79 : 76, lineHeight = size * 1.13;
  titleLines.forEach((line, i) => text(x, line, style === 1 ? 22 : 88, top + i * lineHeight, size, ink, style === 1 ? 'Arial' : 'Georgia', style === 1 ? 'left' : 'center'));
  // Three related diagram motifs give the jackets individual identities.
  const cy = Math.max(166, top + titleLines.length * lineHeight + 20);
  x.strokeStyle = accent; x.lineWidth = 1; x.globalAlpha = .8;
  if (style === 1) {
    [[47, cy], [88, cy - 16], [128, cy + 7]].forEach(([a, b], i, nodes) => {
      if (i) rule(x, nodes[i - 1][0], nodes[i - 1][1], a, b, accent);
      x.strokeRect(a - 6, b - 6, 12, 12);
    });
  } else {
    [12, 23, 34].forEach((r, i) => { x.beginPath(); x.arc(88, cy, r, style === 2 ? i * .5 : 0, style === 2 ? Math.PI * 1.6 + i * .5 : Math.PI * 2); x.stroke(); });
    rule(x, 48, cy, 128, cy, accent);
  }
  x.globalAlpha = 1;
  text(x, PROFILE.initials.split('').join(' '), 88, 226, 10, ink, 'Georgia', 'center');
  text(x, 'PERSONAL REFERENCE LIBRARY', 88, 237, 6, ink, 'Arial', 'center');
  return c;
}

function pages(book, w, h, horizontal = false, scale = 1) {
  const c = canvas(w * scale, h * scale), x = c.getContext('2d'), { base } = colors(book);
  x.scale(scale, scale);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  x.fillStyle = '#e6ddc7'; x.fillRect(4, 4, w - 8, h - 8);
  for (let i = 6; i < w - 5; i += 2) rule(x, i, 5, i, h - 5, i % 3 ? '#c7bda5' : '#f7eed9', .6);
  // A tiny woven headband follows the bound edge of the page block.
  if (horizontal) {
    for (let i = 5; i < w - 5; i += 4) { x.fillStyle = i % 8 ? base : '#ece3cf'; x.fillRect(i, h - 8, 3, 3); }
  }
  return c;
}

function jacketTexture(info, scale, laidFlat) {
  const image = canvas(W * scale, H * scale), x = image.getContext('2d'); x.scale(scale, scale);
  const images = [cover(info, false, scale), cover(info, true, scale), pages(info, 64, 128, true, scale), pages(info, 64, 128, true, scale), drawSpine(info, 48 * scale, 256 * scale), pages(info, 48, 256, false, scale)];
  faces.forEach(([px, py, w, h], i) => {
    x.save();
    if (i === 4 && laidFlat) { x.translate(px + w, py + h); x.rotate(Math.PI); x.drawImage(images[i], 0, 0, w, h); }
    else x.drawImage(images[i], px, py, w, h);
    x.restore();
  });
  const map = new THREE.CanvasTexture(image); map.encoding = THREE.sRGBEncoding; map.anisotropy = 8;
  return map;
}

export function createLibraryBook(info, width, height, depth, { interactive = true, laidFlat = false } = {}) {
  const map = jacketTexture(info, 1, laidFlat);
  const geometry = new RoundedBoxGeometry(width, height, depth, 2, Math.min(.0012, width * .06));
  const uv = geometry.attributes.uv;
  geometry.groups.forEach(({ start, count, materialIndex }) => {
    const [px, py, w, h] = faces[materialIndex];
    // Half-texel insets keep mip filtering inside each jacket/paper panel.
    for (let i = start; i < start + count; i++) uv.setXY(i, (px + .5 + uv.getX(i) * (w - 1)) / W, 1 - (py + .5 + (1 - uv.getY(i)) * (h - 1)) / H);
  });
  geometry.clearGroups(); uv.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ map, roughness: .8, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .025 });
  const book = new THREE.Mesh(geometry, material); book.castShadow = book.receiveShadow = true;
  if (laidFlat) book.rotation.z = Math.PI / 2;
  book.name = interactive ? 'ShelfBook' : 'LibraryVolume';
  book.userData = { info, libraryVolume: true, dimensions: { width, height, depth } };
  if (interactive) book.userData.book = book;
  // Only the held volume needs close-up artwork. Release it on return so the
  // whole library stays inexpensive on mobile and repeated reads do not leak.
  let readingMap = null;
  book.userData.setReadingDetail = (reading) => {
    if (reading && !readingMap) {
      readingMap = jacketTexture(info, 4, laidFlat); readingMap.anisotropy = map.anisotropy;
      material.map = material.emissiveMap = readingMap;
    } else if (!reading && readingMap) {
      material.map = material.emissiveMap = map; readingMap.dispose(); readingMap = null;
    }
  };
  return book;
}
