// The fluid background's settings and input driver, shared by the site (FluidBackground.jsx)
// and the dev-only simulator (fluid-lab.html). Paste values exported from the simulator here.
import WebGLFluid from '../vendor/webgl-fluid/index.js';

// Passed straight to the webgl-fluid library.
export const FLUID_CONFIG = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 0,
  VELOCITY_DISSIPATION: 1.5,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 45,
  CURL: 40,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 5900,
  // How bright the fluid is drawn (0..1). Replaces the old 80% black CSS overlay (0.2 = 1 - 0.8),
  // done in the shader so every browser shows the same result.
  BRIGHTNESS: 0.26,
  SHADING: false,
  BLOOM: false,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: false,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1,
  // The library's own random bursts (10x-bright colours, random velocity). Off: we do our own fill.
  IMMEDIATE: false,
  AUTO: false,
  INTERVAL: 3000,
  SPLAT_COUNT: 8,
  PAUSED: false,
};

// Our own behaviour on top of the library.
export const DRIVER_SETTINGS = {
  // Colours used by the load splats and click splashes (hex). Load splats use them in a
  // shuffled order (cycling if there are more splats than colours); splashes pick one at random.
  // One shade: overlapping splats keep exactly this hue (see the display-shader patch).
  PALETTE: ['#4a90e2'],
  // On load: splats laid out on a grid, one palette colour each, sized to fill the screen together.
  START_POSITION: 'top-left', // 'grid' (spread over the screen), a corner, or 'center'
  START_SPLATS: 2,
  START_SIZE: 1.85, // 1 = half strength at the edge of each splat's grid cell
  START_BRIGHTNESS: 1,
  START_VELOCITY: 50, // random direction per splat
  // Click / tap: a splash of a random palette colour.
  SPLASH_RADIUS: 0.6,
  SPLASH_BRIGHTNESS: 0.8,
  SPLASH_FORCE: 600,
  // Mouse / touch drag / scroll only push the fluid (no colour), scaled by SPLAT_FORCE.
  POINTER_RADIUS: 0.25,
  POINTER_FORCE: 0.3, // mouse / touch drag only, on top of SPLAT_FORCE (swipes + scroll unaffected)
  SCROLL_STRENGTH: 0, // page scrolling (wheel, trackpad, momentum) doesn't move the fluid; finger drags still do
  // On load: three scripted finger swipes that push the fluid (no colour), one after another:
  // bottom-left -> top-right, top-middle -> down, then a circle. They exist so the background
  // looks good from the first frame, so by default they run instantly, before it's ever drawn.
  INTRO_SWIPES: true,
  INTRO_INSTANT: true, // false = play them in real time (simulator, to see what they do)
  INTRO_SETTLE: 0.5, // extra seconds after the last swipe (still at INTRO_MOTION_FADE)
  INTRO_MOTION_FADE: 2, // motion fade during the intro only; VELOCITY_DISSIPATION applies after
  INTRO_DURATION: 0.9, // seconds per swipe (the circle takes 1.5x)
  INTRO_GAP: 0.2, // seconds between swipes
  INTRO_FORCE: 0.35, // 1 = same push as a mouse moving at that speed
  INTRO_RADIUS: 0.4,
};

// START_POSITION anchors in screen space (0..1, y = 0 at the top). 'grid' isn't listed.
const START_ANCHORS = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
  center: { x: 0.5, y: 0.5 },
};

// Swipe paths in screen space (0..1, y = 0 at the top), as a function of progress p in 0..1.
// `aspect` keeps the circle round on any screen shape.
const INTRO_PATHS = [
  { length: 1, at: (p) => ({ x: 0.05 + 0.9 * p, y: 0.95 - 0.9 * p }) },
  { length: 1, at: (p) => ({ x: 0.5, y: 0.05 + 0.85 * p }) },
  {
    length: 1.5,
    at: (p, aspect) => {
      const r = 0.3; // fraction of the screen's shorter side
      const a = -Math.PI / 2 + p * Math.PI * 2; // start at the top, go clockwise
      const rx = aspect >= 1 ? r / aspect : r;
      const ry = aspect >= 1 ? r : r * aspect;
      return { x: 0.5 + rx * Math.cos(a), y: 0.5 + ry * Math.sin(a) };
    },
  },
];

const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

const FALLBACK_COLOR = '#4a90e2';

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  const n = parseInt(m ? m[1] : FALLBACK_COLOR.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

const paletteOf = (settings) => (settings.PALETTE?.length ? settings.PALETTE : [FALLBACK_COLOR]);

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const scaled = (c, k) => ({ r: c.r * k, g: c.g * k, b: c.b * k });

// Pick the grid (cols x rows >= n) whose cells are closest to square on this screen.
function gridFor(n, aspect) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const score = Math.abs(Math.log(aspect / cols / (1 / rows))) + (0.5 * (cols * rows - n)) / n;
    if (!best || score < best.score) best = { cols, rows, score };
  }
  return best;
}

// Starts the sim on `canvas` and drives it from window-level input, so it works through page
// content, on touch, and while scrolling (the canvas itself should have pointer-events: none).
// `settings` is read live, so it can be changed while running. Returns { fluid, fill, splash }.
// Clicks inside an element with [data-fluid-ignore] don't splash.
export function startFluid(canvas, config = FLUID_CONFIG, settings = DRIVER_SETTINGS) {
  const fluid = WebGLFluid(canvas, { ...config });
  const cfg = fluid.config; // the library's live config object

  // The library reads SPLAT_RADIUS on every splat/push; set it for ours, then put it back so
  // its own bursts (IMMEDIATE / AUTO) keep using the configured value.
  const withRadius = (radius, fn) => {
    const base = cfg.SPLAT_RADIUS;
    cfg.SPLAT_RADIUS = radius;
    fn();
    cfg.SPLAT_RADIUS = base;
  };

  // The canvas can be bigger than the screen (on phones it bleeds past the top and bottom so
  // content never scrolls past its edge), so map through its actual box, not the window.
  const box = () => canvas.getBoundingClientRect();
  const aspectOf = () => {
    const r = box();
    return r.width / (r.height || 1);
  };

  // Viewport px -> sim texture space (y up), with the library's aspect correction on deltas.
  const toTex = (cx, cy) => {
    const r = box();
    return { x: (cx - r.left) / r.width, y: 1 - (cy - r.top) / r.height };
  };
  const correct = (dx, dy) => {
    const aspect = aspectOf();
    return aspect < 1 ? [dx * aspect, dy] : [dx, dy / aspect];
  };

  // The splat shader is exp(-|p|^2 / r) with p.x scaled by the aspect ratio and
  // r = SPLAT_RADIUS / 100 (x aspect when landscape); START_SIZE 1 picks r so a splat is still
  // at half strength at the edge of its grid cell.
  const fill = () => {
    const n = Math.max(0, Math.round(settings.START_SPLATS));
    if (!n) return;
    const aspect = aspectOf();
    const { cols, rows } = gridFor(n, aspect);
    const halfCell = 0.5 * Math.max(aspect / cols, 1 / rows) * settings.START_SIZE;
    const r = (halfCell * halfCell) / Math.LN2;
    const colors = shuffled(paletteOf(settings));
    withRadius((r * 100) / Math.max(aspect, 1), () => {
      for (let i = 0; i < n; i++) {
        const anchor = START_ANCHORS[settings.START_POSITION];
        // Anchored: every splat on that point (sim space, y up). Grid: one per cell, jittered.
        const x = anchor ? anchor.x : ((i % cols) + 0.5 + (Math.random() - 0.5) * 0.3) / cols;
        const y = anchor ? 1 - anchor.y : (Math.floor(i / cols) + 0.5 + (Math.random() - 0.5) * 0.3) / rows;
        const angle = Math.random() * Math.PI * 2;
        const v = settings.START_VELOCITY;
        fluid.splat(x, y, Math.cos(angle) * v, Math.sin(angle) * v, scaled(hexToRgb(colors[i % colors.length]), settings.START_BRIGHTNESS));
      }
    });
  };

  // Scripted intro swipes. The "finger" pushes along the active path by however far it moved
  // since the last step, exactly like a real pointer.
  const INTRO_DT = 1 / 60; // the library caps its own steps at 1/60 s, so this matches real time
  const introLength = () =>
    INTRO_PATHS.reduce((sum, p) => sum + settings.INTRO_DURATION * p.length + settings.INTRO_GAP, 0);

  // Where the finger is `t` seconds into the intro: { index, pos } (sim space), or null in a gap.
  const introAt = (t) => {
    const aspect = aspectOf();
    for (let i = 0; i < INTRO_PATHS.length; i++) {
      const dur = settings.INTRO_DURATION * INTRO_PATHS[i].length;
      if (t < 0) return null;
      if (t <= dur) {
        const s = INTRO_PATHS[i].at(easeInOut(t / dur), aspect);
        return { index: i, pos: { x: s.x, y: 1 - s.y } };
      }
      t -= dur + settings.INTRO_GAP;
    }
    return null;
  };

  let introPrev = null; // { index, pos } of the last step
  const introPush = (t) => {
    const at = introAt(t);
    if (at && introPrev && introPrev.index === at.index) {
      const [dx, dy] = correct(at.pos.x - introPrev.pos.x, at.pos.y - introPrev.pos.y);
      const f = cfg.SPLAT_FORCE * settings.INTRO_FORCE;
      withRadius(settings.INTRO_RADIUS, () => fluid.push(at.pos.x, at.pos.y, dx * f, dy * f));
    }
    introPrev = at;
  };

  // Instant: run the whole intro (plus INTRO_SETTLE seconds) in one go, without drawing, so the
  // background is already arranged the first time it's seen. Real-time mode is for watching
  // them in the simulator.
  let introStart = null; // real-time mode only: ms timestamp, or 'pending' until the next frame
  // While the intro runs (swipes + settle), motion fades at INTRO_MOTION_FADE instead of the
  // normal VELOCITY_DISSIPATION, then switches back for everything after (mouse, scroll, ...).
  let baseFade = null;
  const introFadeOn = () => {
    if (baseFade === null) baseFade = cfg.VELOCITY_DISSIPATION;
    cfg.VELOCITY_DISSIPATION = settings.INTRO_MOTION_FADE;
  };
  const introFadeOff = () => {
    if (baseFade !== null) cfg.VELOCITY_DISSIPATION = baseFade;
    baseFade = null;
  };

  const swipes = () => {
    introPrev = null;
    introFadeOn();
    if (!settings.INTRO_INSTANT) {
      introStart = 'pending';
      return;
    }
    introStart = null;
    const end = introLength() + settings.INTRO_SETTLE;
    for (let t = 0; t <= end; t += INTRO_DT) {
      introPush(t);
      fluid.step(INTRO_DT);
    }
    introFadeOff();
    fluid.render();
  };

  const runIntro = (now) => {
    if (introStart === null) return;
    if (introStart === 'pending') introStart = now;
    const t = (now - introStart) / 1000;
    if (t > introLength() + settings.INTRO_SETTLE) {
      introStart = null;
      introFadeOff();
    } else introPush(t);
  };

  const splashes = []; // queued, applied in the frame loop
  const splash = (x, y) => splashes.push({ x, y });

  const pointers = new Map(); // id -> { x, y, dx, dy, moved }
  let lastPos = { x: 0.5, y: 0.5 }; // where scroll force is applied
  let scrollDelta = 0;
  let lastScrollY = window.scrollY;
  let touching = 0;

  const move = (id, cx, cy) => {
    const pos = toTex(cx, cy);
    const p = pointers.get(id);
    if (p) {
      p.dx += pos.x - p.x;
      p.dy += pos.y - p.y;
      p.x = pos.x;
      p.y = pos.y;
      p.moved = true;
    } else {
      pointers.set(id, { ...pos, dx: 0, dy: 0, moved: false });
    }
    lastPos = pos;
  };

  window.addEventListener(
    'pointermove',
    (e) => e.pointerType !== 'touch' && move('mouse', e.clientX, e.clientY),
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => pointers.delete('mouse'));

  // `click` (not pointerdown) so a tap splashes but starting a scroll on a phone doesn't.
  window.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-fluid-ignore]')) return;
    const p = toTex(e.clientX, e.clientY);
    splash(p.x, p.y);
  });

  // Touch events (not pointer events) keep firing while the page scrolls under the finger.
  const onTouch = (e) => {
    touching = e.touches.length;
    for (const t of e.changedTouches) {
      if (e.type === 'touchend' || e.type === 'touchcancel') pointers.delete(t.identifier);
      else move(t.identifier, t.clientX, t.clientY);
    }
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    window.addEventListener(type, onTouch, { passive: true });
  }

  window.addEventListener(
    'scroll',
    () => {
      scrollDelta += window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
    },
    { passive: true },
  );

  const frame = (now) => {
    const force = cfg.SPLAT_FORCE;
    runIntro(now);

    withRadius(settings.POINTER_RADIUS, () => {
      // At most one push per pointer per frame, however many move events arrived.
      for (const p of pointers.values()) {
        if (!p.moved) continue;
        const [dx, dy] = correct(p.dx, p.dy);
        const pf = force * settings.POINTER_FORCE;
        fluid.push(p.x, p.y, dx * pf, dy * pf);
        p.dx = p.dy = 0;
        p.moved = false;
      }

      // Momentum / wheel scrolling: push the fluid along with the content. While a finger is
      // down, the touch drag already does this.
      if (scrollDelta !== 0) {
        if (!touching && settings.SCROLL_STRENGTH > 0) {
          const dy = Math.max(-0.08, Math.min(0.08, scrollDelta / window.innerHeight));
          const [, cdy] = correct(0, dy);
          fluid.push(lastPos.x, lastPos.y, 0, cdy * force * settings.SCROLL_STRENGTH);
        }
        scrollDelta = 0;
      }
    });

    if (splashes.length) {
      withRadius(settings.SPLASH_RADIUS, () => {
        for (const s of splashes) {
          const angle = Math.random() * Math.PI * 2;
          const palette = paletteOf(settings);
          const color = scaled(hexToRgb(palette[Math.floor(Math.random() * palette.length)]), settings.SPLASH_BRIGHTNESS);
          const f = settings.SPLASH_FORCE;
          fluid.splat(s.x, s.y, Math.cos(angle) * f, Math.sin(angle) * f, color);
        }
      });
      splashes.length = 0;
    }

    requestAnimationFrame(frame);
  };

  fill();
  if (settings.INTRO_SWIPES) swipes();
  requestAnimationFrame(frame);
  return { fluid, fill, splash, swipes };
}
