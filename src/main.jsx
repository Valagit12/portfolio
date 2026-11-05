import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/custom.scss';
import App from './App.jsx';
import { asset } from './asset.js';

// Loading screen (#loader in index.html): reveal the site once everything that would otherwise
// pop in is ready — the font, the headshot, and the fluid background (which fast-forwards its
// intro swipes and sets the browser bars' colours from it before signalling). Never wait longer
// than MAX_WAIT_MS.
const MAX_WAIT_MS = 5000;

const fluidReady = new Promise((resolve) => window.addEventListener('fluid:ready', resolve, { once: true }));
const fontReady = Promise.all([
  document.fonts?.load('400 1em "Geist Variable"'),
  document.fonts?.load('300 1em "Geist Variable"'),
]);
const headshotReady = (() => {
  const img = new Image();
  img.src = asset('img/headshot.webp');
  return img.decode();
})();

// iOS Safari colours its top and bottom bars from a fixed element at the screen's edges, so
// while the loader is fixed the bars stay black (matching it). Once the opening hole has
// uncovered the top and bottom edges, pin the loader in place as a plain absolute box (looks
// identical) so the bars take the page's colours in step with the animation, not after it.
function releaseBarsWhenUncovered(loader) {
  let released = false;
  const release = () => {
    if (released || !loader.isConnected) return;
    released = true;
    const { top, width, height } = loader.getBoundingClientRect();
    Object.assign(loader.style, {
      position: 'absolute',
      inset: 'auto',
      top: `${top + window.scrollY}px`,
      left: '0px',
      width: `${width}px`,
      height: `${height}px`,
    });
  };

  // The hole is centred on the loader; release once it has opened halfway along the top edge.
  const { width, height } = loader.getBoundingClientRect();
  const reach = Math.hypot(width / 4, height / 2);
  const watch = () => {
    if (released || !loader.isConnected) return;
    // --hole is a registered property, so its animated value can be read each frame.
    const hole = parseFloat(getComputedStyle(loader).getPropertyValue('--hole')) || 0;
    if (hole >= reach) release();
    else requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);

  // Browsers that can't animate --hole (and the reduced-motion fade) never report it growing:
  // release when the animation ends instead.
  loader.addEventListener('animationend', (e) => e.target === loader && release());
}

const settle = (p) => Promise.resolve(p).catch(() => {}); // a failed asset shouldn't block the page
const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS));

Promise.race([Promise.all([fluidReady, fontReady, headshotReady].map(settle)), timeout]).then(() => {
  const loader = document.getElementById('loader');
  if (!loader) return document.documentElement.classList.remove('loading');
  // Two frames so the first real paint (incl. the fluid's GPU work) lands before the reveal.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('loading');
      loader.classList.add('done');
      releaseBarsWhenUncovered(loader);
      loader.addEventListener('animationend', (e) => e.target === loader && loader.remove());
      setTimeout(() => loader.remove(), 1500); // in case animationend never fires (e.g. hidden tab)
    }),
  );
});

// No space-bar scrolling. Space still works where it means something (buttons, links, fields).
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  const t = e.target;
  if (t instanceof Element && t.closest('input, textarea, select, button, a, [contenteditable], [role="button"]')) return;
  e.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
