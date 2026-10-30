import { PROFILE } from './profile.js';
// Ten editable skill volumes; other shelf books contain generic reference notes.
import { sound } from './sound.js';
import { showCertificate } from './certificates.js';
export const BOOKS = [
  {
    "title": "Skill 01",
    "color": "#7b2d3a",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 02",
    "color": "#33543f",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 03",
    "color": "#1f2a44",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 04",
    "color": "#2f4858",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 05",
    "color": "#9b5d3b",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 06",
    "color": "#5a7d7c",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 07",
    "color": "#4d4d52",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 08",
    "color": "#c9a25d",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 09",
    "color": "#3b5b8a",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  },
  {
    "title": "Skill 10",
    "color": "#6b4a7a",
    "subtitle": "[Your skill or area of interest]",
    "intro": "[Describe your experience with this skill and how you use it.]",
    "points": [
      "[A concept you understand]",
      "[An example of your work]",
      "[An outcome or lesson]"
    ],
    "usedIn": "[Your project or experience]"
  }
];

export { drawSpine } from './book-design.js';

// the open-book reader overlay
export function showReader(book, onClose) {
  if (book.kicker === 'Project' || book.kind) return showCertificate(book, onClose);
  sound.page();
  const el = document.getElementById('book-reader');
  const previousFocus = document.activeElement;
  el.setAttribute('aria-hidden', 'false');
  const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  el.querySelector('.book-reader__left').innerHTML = `
    <p class="book-reader__kicker">${esc(PROFILE.name)} · ${esc(book.kicker || "Field Notes")}</p>
    <h2 class="book-reader__title">${esc(book.title)}</h2>
    <p class="book-reader__subtitle">${esc(book.subtitle)}</p>
    <div class="book-reader__rule" style="background:${book.color}"></div>
    <p class="book-reader__intro">${esc(book.intro)}</p>`;
  el.querySelector('.book-reader__right').innerHTML = `
    <h3>${book.reference ? 'Inside this volume' : 'In practice'}</h3>
    <ul>${book.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <h3>${book.reference ? 'Collection' : 'Used in'}</h3>
    <p class="book-reader__used">${esc(book.usedIn)}</p>
    ${book.link ? `<a class="book-reader__link" href="${book.link}" target="_blank" rel="noopener">${esc(book.linkLabel || 'Open')} &#8599;</a>` : ''}`;
  el.style.setProperty('--book-color', book.color);
  el.classList.add('book-reader--open');
  el.querySelector('.book-reader__close').focus();

  const close = () => {
    el.classList.remove('book-reader--open');
    el.setAttribute('aria-hidden', 'true');
    previousFocus?.focus({ preventScroll: true });
    document.removeEventListener('keydown', onKey);
    el.removeEventListener('click', onClick);
    onClose && onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const items = [...el.querySelectorAll('button, a[href]')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  const onClick = (e) => {
    if (e.target === el || e.target.closest('.book-reader__close')) close();
  };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', onClick);
}
