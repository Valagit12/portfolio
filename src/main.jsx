import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/custom.scss';
import App from './App.jsx';
import { asset } from './asset.js';

// Loading screen (#loader in index.html): reveal the site once everything that would otherwise
// pop in is ready — the font, the headshot, and the fluid background (which fast-forwards its
// intro swipes before signalling). Never wait longer than MAX_WAIT_MS.
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
