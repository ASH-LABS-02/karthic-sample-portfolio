import { PROFILE } from './profile.js';
import { sound } from './sound.js';
import { PROJECTS } from './project-data.js';

const escape = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
const imageCache = new Map();
let activeViewer = null;

function lines(value, limit) {
  const result = [];
  for (const word of String(value).split(/\s+/)) {
    if (!result.length || `${result.at(-1)} ${word}`.length > limit) result.push(word);
    else result[result.length - 1] += ` ${word}`;
  }
  return result;
}

function presentation(info) {
  const education = info.kind === 'degree';
  const project = info.kicker === 'Project' || Boolean(info.id);
  return {
    subject: education ? 'Academic record' : project ? 'Project portfolio' : info.kicker || 'Portfolio highlight',
    heading: education ? 'Education Profile' : project ? 'Certificate of Project Work' : 'Portfolio Milestone',
    statement: education ? 'Academic background and current studies' : project ? 'This portfolio records the design and implementation of' : 'A portfolio record of',
    title: info.title,
    author: education ? `${PROFILE.name} · ${PROFILE.graduation}` : `by ${PROFILE.name}`,
    description: info.certificateText || info.intro,
    authorRole: education ? 'Student' : project ? 'Project author' : 'Portfolio owner',
    category: info.category || info.subtitle,
    footer: education ? PROFILE.grade : project ? 'Project portfolio' : 'Portfolio record',
    titleLines: lines(info.title, 19),
    project,
  };
}

function borderMarkup() {
  const corner = '<path d="M0 72V0H72M8 90V8H90M18 56V18H56" fill="none" stroke="#a17b35" stroke-width="1.5"/>';
  return `<rect x="32" y="32" width="1336" height="986" fill="none" stroke="#9f7832" stroke-width="3"/><rect x="44" y="44" width="1312" height="962" fill="none" stroke="#b39251" stroke-width="1"/>${[[48, 48, 1, 1], [1352, 48, -1, 1], [48, 1002, 1, -1], [1352, 1002, -1, -1]].map(([x, y, sx, sy]) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${corner}</g>`).join('')}`;
}

function monogramMarkup(seal = false) {
  return `<circle cx="50" cy="50" r="46" fill="${seal ? '#fcf6e6' : 'none'}" stroke="#a17b35" stroke-width="1.6"/><circle cx="50" cy="50" r="42" fill="none" stroke="#a17b35" stroke-width=".6"/>${seal ? '<circle cx="50" cy="50" r="37" fill="none" stroke="#ad8843" stroke-width="1.8" stroke-dasharray="1 2.8"/>' : ''}<g fill="#966b23" font-family="Georgia,Times New Roman,serif"><text x="27" y="53" font-size="39">${escape(PROFILE.initials[0])}</text><text x="48" y="73" font-size="36">${escape(PROFILE.initials[1])}</text></g>`;
}

const decoration = '<path d="M-100 0H-10m20 0h90M0-5l4 5-4 5-4-5Z" fill="#a17b35" stroke="#a17b35" stroke-width="1"/>';

// Vector artwork stays sharp when a frame is picked up. No baked-in JPEG text.
export function certificateSVG(info) {
  const p = presentation(info), long = p.titleLines.length > 1;
  const text = (value, x, y, size, attributes = '') => `<text x="${x}" y="${y}" font-size="${size}" ${attributes}>${escape(value)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1050" viewBox="0 0 1400 1050">
    <defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".035"/></feComponentTransfer></filter></defs>
    <rect width="1400" height="1050" fill="#fffdf6"/><rect width="1400" height="1050" filter="url(#grain)" opacity=".6"/>
    ${borderMarkup()}<g transform="translate(647 92) scale(1.06)">${monogramMarkup()}</g>
    <g text-anchor="middle" fill="#252a25" font-family="Georgia,Times New Roman,serif">
      ${text(p.subject.toUpperCase(), 700, 259, 21, 'letter-spacing="6"')}
      ${text(p.heading, 700, 345, 58)}
      ${text(p.statement, 700, 423, 29)}
      <g transform="translate(700 461)">${decoration}</g>
      ${p.titleLines.map((line, index) => text(line, 700, (long ? 532 : 572) + index * 73, long ? 71 : 88, 'fill="#79531e"')).join('')}
      ${text(p.author, 700, long ? 654 : 638, 35)}
      ${lines(p.description, 76).map((line, index) => text(line, 700, (long ? 733 : 727) + index * 37, 28)).join('')}
      <path d="M225 900H485M915 900h260" stroke="#8e8a7e" stroke-width="1"/>
      ${text(PROFILE.name, 355, 936, 23)}${text(p.authorRole, 355, 968, 19, 'fill="#717167"')}
      ${lines(p.category, 36).map((line, index) => text(line, 1045, 933 + index * 25, 20)).join('')}
      ${text(p.footer, 1045, 987, 18, 'fill="#717167"')}
    </g><g transform="translate(640 866) scale(1.2)">${monogramMarkup(true)}</g>
  </svg>`;
}

export function certificateImage(info) {
  const key = JSON.stringify(presentation(info));
  if (!imageCache.has(key)) imageCache.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(certificateSVG(info))}`);
  return imageCache.get(key);
}

function paperHTML(info) {
  const p = presentation(info);
  return `<article class="certificate-paper${p.titleLines.length > 1 ? ' certificate-paper--long' : ''}" aria-label="${escape(p.heading)}">
    <svg class="certificate-paper__border" viewBox="0 0 1400 1050" preserveAspectRatio="none" aria-hidden="true">${borderMarkup()}</svg>
    <svg class="certificate-paper__mark" viewBox="0 0 100 100" aria-hidden="true">${monogramMarkup()}</svg>
    <p class="certificate-paper__subject">${escape(p.subject)}</p>
    <p class="certificate-paper__kind">${escape(p.heading)}</p>
    <p class="certificate-paper__statement">${escape(p.statement)}</p>
    <svg class="certificate-paper__divider" viewBox="-110 -8 220 16" aria-hidden="true">${decoration}</svg>
    <div class="certificate-paper__identity"><h2 id="certificate-title">${p.titleLines.map(escape).join('<br>')}</h2><p>${escape(p.author)}</p></div>
    <p class="certificate-paper__description">${escape(p.description)}</p>
    <div class="certificate-paper__footer"><div><span>${escape(PROFILE.name)}</span><small>${escape(p.authorRole)}</small></div><svg viewBox="0 0 100 100" aria-hidden="true">${monogramMarkup(true)}</svg><div><span>${escape(p.category)}</span><small>${escape(p.footer)}</small></div></div>
  </article>`;
}

export function showCertificate(info, onClose) {
  activeViewer?.();
  const p = presentation(info), previousFocus = document.activeElement;
  const dialog = document.getElementById('certificate-viewer');
  const index = PROJECTS.findIndex((project) => project.title === info.title);
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
  dialog.innerHTML = `<header class="certificate-toolbar"><span>${p.project ? 'Project collection' : 'Portfolio collection'}</span><div>${index >= 0 ? `<span class="certificate-count">${String(index + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}</span>` : ''}<button class="certificate-close" type="button" aria-label="Close certificate"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header>
    <div class="certificate-layout"><div class="certificate-presentation">${paperHTML(info)}</div><aside class="certificate-notes"><h3>${p.project ? 'Project notes' : 'About this record'}</h3><h4>${info.kind === 'degree' ? 'Core coursework' : 'Key outcomes'}</h4><ul>${info.points.map((point) => `<li>${escape(point)}</li>`).join('')}</ul><div class="certificate-stack"><h4>${p.project ? 'Built with' : 'Context'}</h4><p>${escape(info.usedIn)}</p></div>${info.link || info.url ? `<a class="certificate-link" href="${escape(info.link || info.url)}" target="_blank" rel="noopener">View on GitHub${arrow}</a>` : ''}</aside></div>`;
  sound.page();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true; dialog.classList.remove('is-visible');
    dialog.close();
    dialog.removeEventListener('cancel', cancel);
    dialog.removeEventListener('click', click);
    dialog.removeEventListener('close', close);
    dialog.removeEventListener('keydown', keydown);
    activeViewer = null;
    previousFocus?.focus({ preventScroll: true });
    onClose?.();
  };
  const cancel = (event) => { event.preventDefault(); close(); };
  const click = (event) => { if (event.target === dialog || event.target.closest('.certificate-close')) close(); };
  const keydown = (event) => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button, a[href]')];
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('click', click);
  dialog.addEventListener('close', close);
  dialog.addEventListener('keydown', keydown);
  activeViewer = close;
  dialog.showModal();
  dialog.querySelector('.certificate-close').focus({ preventScroll: true });
  requestAnimationFrame(() => { if (!closed) dialog.classList.add('is-visible'); });
}
