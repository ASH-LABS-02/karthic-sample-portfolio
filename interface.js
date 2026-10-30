import { sound, isMuted, setMuted, unlock } from './sound.js';
import { showCertificate } from './certificates.js';
import { VACUUM, vacuumContent, initVacuumTabs } from './vacuum-data.js';

const dialog = document.getElementById('portfolio-panel');
const content = document.getElementById('panel-content');
const nav = document.querySelector('.room-nav');
let onDismiss = () => {};
let closing;
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function setActiveView(view = 'room') {
  nav.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

export function closePanel({ returnToRoom = true } = {}) {
  if (!dialog.open) return;
  clearTimeout(closing);
  dialog.classList.remove('is-visible');
  closing = setTimeout(() => {
    dialog.close();
    if (returnToRoom) onDismiss();
  }, reducedMotion.matches ? 0 : 240);
}

export function openPanel(view, { onClose, projects = [], projectInfo = {} } = {}) {
  if (onClose) onDismiss = onClose;
  clearTimeout(closing);
  dialog.dataset.panel = view;
  if (view === 'vacuum') { content.innerHTML = vacuumContent(); initVacuumTabs(content); }
  else content.replaceChildren(document.getElementById(`${view}-content`).content.cloneNode(true));
  if (view === 'projects') {
    const list = content.querySelector('.project-list');
    projects.forEach((project, index) => {
      const info = projectInfo[project.title];
      const row = document.createElement('button');
      row.className = 'project-row';
      row.type = 'button';
      row.innerHTML = `<img src="${project.image}" alt="" width="88" height="66" /><span><small>0${index + 1}</small><strong>${project.title}</strong><em>${info.subtitle}</em></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;
      row.addEventListener('click', () => {
        showCertificate({ ...info, kicker: 'Project', link: project.url }, () => row.focus({ preventScroll: true }));
      });
      list.append(row);
    });
    const robot = document.createElement('button'); robot.className = 'project-row'; robot.type = 'button';
    robot.innerHTML = `<img src="${VACUUM.image}" alt="" width="88" height="66"/><span><small>06 · HARDWARE PROJECT</small><strong>${VACUUM.title}</strong><em>${VACUUM.subtitle}</em></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;
    robot.addEventListener('click', () => openPanel('vacuum'));
    list.append(robot);
  }
  content.scrollTop = 0;
  setActiveView(view === 'vacuum' ? 'projects' : view);
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.classList.add('is-visible'));
  sound.page();
  document.getElementById('panel-close').focus({ preventScroll: true });
}

function paintSound() {
  document.querySelectorAll('[data-sound]').forEach((button) => {
    button.classList.toggle('sound-toggle--off', isMuted());
    button.setAttribute('aria-pressed', String(!isMuted()));
    button.setAttribute('aria-label', isMuted() ? 'Turn sound on' : 'Turn sound off');
    button.querySelector('span').textContent = isMuted() ? 'Sound off' : 'Sound on';
  });
}
document.querySelectorAll('[data-sound]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    unlock();
    setMuted(!isMuted());
    paintSound();
    if (!isMuted()) sound.switch();
  });
});
paintSound();

dialog.addEventListener('cancel', (event) => { event.preventDefault(); closePanel(); });
dialog.addEventListener('click', (event) => { if (event.target === dialog) closePanel(); });
document.getElementById('panel-close').addEventListener('click', () => closePanel());
const help = document.getElementById('room-help');
const hint = document.getElementById('look-hint');
help.addEventListener('click', () => {
  const show = !hint.classList.contains('look-hint--show');
  hint.classList.toggle('look-hint--show', show);
  help.setAttribute('aria-expanded', String(show));
});
