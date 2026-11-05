import { useEffect, useRef } from 'react';

// Mechanical "transformation" between two pieces of content (used by the name — hover it).
// Every glyph (`.nt-ch`) is cut into four plates. Plate styles live in src/styles/plates.scss.
// Each plate is a little cube: the old piece on its front face, the new piece on the next face
// round. The plates unlatch by a hairline, roll a quarter turn early to bring the new piece to
// the front (both faces show mid-roll), then
// slide a short way (along one axis, then the other) to a nearby slot, turning as they go, and
// lock in place. Reversing plays the same animation backwards.

const T = {
  PLATE_MS: 1000, // one plate's full move
  SPREAD_MS: 350, // pieces set off at random times within this window
  SEED: 7, // which pairing / moves — change it for a different shuffle
  NEIGHBOURS: 3, // each piece goes to one of its this-many nearest free slots (keeps moves local)
  FLIP_AT: 0.1, // cube rolls start this early in a piece's move (so the new content shows up early)…
  FLIP_SPREAD: 0.12, // …give or take this much
  FLIP_LEN: 0.16, // how long a roll takes (share of the move)
  QUARTER: 0.35, // share of pieces that click through quarter turns in the plane
  SPIN: 0.2, // share of pieces that do a full turn in the plane (the rest just tilt)
  TILT_DEG: 35, // max tilt for the pieces that just tilt
  TRAVEL_SCALE: 0.88, // pieces shrink a little while sliding, and settle back to full size
  INSIDE_OUT: 0.3, // share of glyphs that turn inside out as they leave / arrive
  SPLIT_PX: 3, // max gap that opens between neighbouring plates (each moves half of it)
  ROW_LAG_MS: 110, // bottom row trails the top row, so the rows slide through each other
  LONG_TRIP_PX: 80, // pieces travelling further than this start proportionally sooner
};

const FLASH = '#d6e8ff';
const MECH = 'cubic-bezier(.65,0,.25,1)';
const lerp = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

function measure(container, origin) {
  return [...container.querySelectorAll('.nt-ch')]
    .filter((el) => el.textContent.trim())
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: r.left - origin.left,
        y: r.top - origin.top,
        w: r.width,
        h: r.height,
        color: cs.color,
        ch: el.textContent,
        font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      };
    });
}

// One face of a plate's cube, `piece.w × piece.h`, placed at (left, top) inside the plate:
// the piece's quarter of its glyph.
function face(cls, piece, left, top, color) {
  const f = document.createElement('span');
  f.className = `nt-face ${cls}`;
  f.style.cssText = `left:${left}px;top:${top}px;width:${piece.w}px;height:${piece.h}px;color:${color}`;
  const { glyph, qx, qy } = piece;
  const g = document.createElement('span');
  g.className = 'nt-glyph';
  g.style.width = `${glyph.w}px`;
  g.style.height = `${glyph.h}px`;
  g.style.left = `${-qx * piece.w}px`;
  g.style.top = `${-qy * piece.h}px`;
  g.textContent = glyph.ch;
  g.style.font = glyph.font;
  g.style.lineHeight = `${glyph.h}px`; // same box the inline glyph had
  g.style.whiteSpace = 'pre';
  f.append(g);
  return f;
}

// Seeded shuffle so the pairing is the same every time (and reversing retraces it exactly).
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every glyph → four quadrant pieces.
function piecesOf(glyphs) {
  return glyphs.flatMap((gl) => {
    const list = [];
    for (let qy = 0; qy < 2; qy++)
      for (let qx = 0; qx < 2; qx++)
        list.push({ glyph: gl, qx, qy, x: gl.x + qx * (gl.w / 2), y: gl.y + qy * (gl.h / 2), w: gl.w / 2, h: gl.h / 2 });
    return list;
  });
}

// Pairs every piece of the old content with a nearby slot in the new content, so the pieces
// slide a short way instead of crossing the whole component. Pieces are matched greedily in a
// random order, each picking one of its few nearest free slots (so neighbours still cross and
// slide through each other). Nothing appears from or vanishes into thin air: pieces with no
// partner (the bigger side has more) get a host — the pair holding the nearest piece — and are
// either drawn into it (extra old pieces) or grow out of it (extra new pieces).
function pair(pa, pb, rand) {
  const flip = pa.length > pb.length;
  const small = flip ? pb : pa;
  const large = flip ? pa : pb;
  const cx = (p) => p.x + p.w / 2;
  const cy = (p) => p.y + p.h / 2;
  const d2 = (p, q) => (cx(p) - cx(q)) ** 2 + (cy(p) - cy(q)) ** 2;

  const order = [...small.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const partner = new Array(large.length).fill(null);
  const pairs = [];
  const pairOf = new Map(); // small-side piece → index in pairs
  const k = Math.max(1, T.NEIGHBOURS);
  for (const i of order) {
    const s = small[i];
    const best = []; // k nearest free slots, nearest first
    for (let j = 0; j < large.length; j++) {
      if (partner[j]) continue;
      const d = d2(s, large[j]);
      if (best.length < k || d < best[best.length - 1].d) {
        best.push({ j, d });
        best.sort((u, v) => u.d - v.d);
        if (best.length > k) best.pop();
      }
    }
    if (!best.length) break;
    // mostly the nearest, sometimes the 2nd / 3rd nearest
    const pick = best[rand() < 0.55 ? 0 : Math.floor(rand() * best.length)].j;
    partner[pick] = s;
    pairOf.set(s, pairs.length);
    pairs.push(flip ? [large[pick], s] : [s, large[pick]]);
  }
  const hidden = [];
  large.forEach((l, j) => {
    if (partner[j]) return;
    let near = null;
    let nd = Infinity;
    for (const s of small) {
      const d = d2(l, s);
      if (d < nd) [near, nd] = [s, d];
    }
    hidden.push({ piece: l, host: near ? pairOf.get(near) : null, mode: flip ? 'tuck' : 'emerge' });
  });
  return { pairs, hidden };
}

// Builds the plates and their (paused) animations. Returns a controller.
function build(root, layer, from, to) {
  const origin = layer.getBoundingClientRect();
  const A = measure(from, origin);
  const B = measure(to, origin);
  const { pairs, hidden } = pair(piecesOf(A), piecesOf(B), rng(T.SEED));
  const width = root.getBoundingClientRect().width || 1;
  const { PLATE_MS: D, SPREAD_MS: S, SPLIT_PX, ROW_LAG_MS } = T;
  const gap = SPLIT_PX / 2;
  const total = D + S + ROW_LAG_MS + 60;
  const anims = [];
  const parts = document.createDocumentFragment();

  const rand = rng(T.SEED * 31 + 1);
  // Some glyphs turn inside out: their pieces swap to the opposite corner, so the glyph's
  // outer edges meet in the middle. Old glyphs do it as they leave, new ones as they arrive.
  const insideOutA = new Set(A.filter(() => rand() < T.INSIDE_OUT));
  const insideOutB = new Set(B.filter(() => rand() < T.INSIDE_OUT));
  const opposite = (p) => ({ x: p.x + (p.qx ? -p.w : p.w), y: p.y + (p.qy ? -p.h : p.h) });
  const pick = (list) => list[Math.floor(rand() * list.length)];

  const paths = []; // each pair's route, so hidden pieces can ride along with their host

  for (const [a, b] of pairs) {
    // each piece splits away from its own glyph's centre, at both ends of the trip
    const asx = a.qx ? 1 : -1;
    const ady = a.qy ? 1 : -1;
    const bsx = b.qx ? 1 : -1;
    const bdy = b.qy ? 1 : -1;
    const leave = insideOutA.has(a.glyph) ? opposite(a) : a;
    const arrive = insideOutB.has(b.glyph) ? opposite(b) : b;

    // Roll the cube early, so the new content shows up while the pieces are still sliding:
    // up / down (about x) or sideways (about y), either way.
    const axis = rand() < 0.5 ? 'X' : 'Y';
    const roll = rand() < 0.5 ? -90 : 90;
    const f0 = T.FLIP_AT + rand() * T.FLIP_SPREAD;
    const f1 = f0 + T.FLIP_LEN;
    const depth = axis === 'X' ? (a.h + b.h) / 2 : (a.w + b.w) / 2; // the cube's size along the roll

    // Each piece also turns in the plane: quarter-turn clicks, a full spin, or a small tilt.
    const r = rand();
    const dir = rand() < 0.5 ? -1 : 1;
    const [mid, end] =
      r < T.QUARTER
        ? [dir * pick([90, 180]), 0]
        : r < T.QUARTER + T.SPIN
          ? [dir * 180, dir * 360]
          : [(rand() * 2 - 1) * T.TILT_DEG, 0];

    // The plate is the old piece's size; both faces share its centre, pushed out to the cube's
    // surface. The new face sits a quarter turn round, so rolling by `roll` brings it to the front.
    const colorA = a.glyph.color;
    const colorB = b.glyph.color;
    const part = document.createElement('span');
    part.className = 'nt-part';
    part.style.width = `${a.w}px`;
    part.style.height = `${a.h}px`;
    const front = face('nt-front', a, 0, 0, colorA);
    front.style.transform = `translateZ(${depth / 2}px)`;
    const next = face('nt-back', b, (a.w - b.w) / 2, (a.h - b.h) / 2, colorB);
    next.style.transform = `rotate${axis}(${-roll}deg) translateZ(${depth / 2}px)`;
    part.append(front, next);
    parts.append(part);

    // a soft wave from left to right, with some jitter, and bottom rows trailing the top rows;
    // pieces with a long trip leave sooner, so nothing lingers outside a box that is shrinking
    const trip = Math.hypot(b.x + b.w / 2 - a.x - a.w / 2, b.y + b.h / 2 - a.y - a.h / 2);
    const early = Math.min(1, T.LONG_TRIP_PX / (trip || 1));
    const delay = (S * (0.6 * Math.min(1, Math.max(0, a.x / width)) + 0.4 * rand()) + a.qy * ROW_LAG_MS) * early;
    const timing = { duration: D, delay, endDelay: total - D - delay, fill: 'both' };
    // Positions are piece centres; the plate (old piece's size) is placed around them, and set
    // back by half the cube so the front face sits flush with the page.
    const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const cL = { x: leave.x + a.w / 2 + asx * gap, y: leave.y + a.h / 2 + ady * gap };
    const cR = { x: arrive.x + b.w / 2 + bsx * gap, y: arrive.y + b.h / 2 + bdy * gap };
    // Slides run along one axis, then the other (an L, like a sliding-tile puzzle).
    const cC = rand() < 0.5 ? { x: cR.x, y: cL.y } : { x: cL.x, y: cR.y };
    const P = (c, dx = 0, dy = 0) => `${c.x - a.w / 2 + dx}px ${c.y - a.h / 2 + dy}px ${-depth / 2}px`;
    paths.push({ ca, cL, cC, cR, cb, mid, end, timing, w: Math.min(a.w, b.w), h: Math.min(a.h, b.h) });

    anims.push(
      part.animate(
        [
          { offset: 0, translate: P(ca), easing: 'cubic-bezier(.4,0,.2,1)' },
          { offset: 0.08, translate: P(ca, asx * gap, ady * gap), easing: MECH },
          { offset: 0.18, translate: P(cL), easing: MECH },
          { offset: 0.5, translate: P(cC), easing: MECH },
          { offset: 0.8, translate: P(cR), easing: MECH },
          { offset: 0.9, translate: P(cb, bsx * gap, bdy * gap), easing: 'cubic-bezier(.3,1.8,.6,1)' },
          { offset: 1, translate: P(cb) },
        ],
        timing,
      ),
      // in-plane turn + a slight shrink in flight (outside the roll, so it stays flat on the page)
      part.animate(
        [
          { offset: 0, rotate: '0deg', scale: '1' },
          { offset: 0.1, rotate: '0deg', scale: '1', easing: MECH },
          { offset: 0.5, rotate: `${mid}deg`, scale: `${T.TRAVEL_SCALE}`, easing: MECH },
          { offset: 0.82, rotate: `${end}deg`, scale: `${T.TRAVEL_SCALE}`, easing: MECH },
          { offset: 0.92, rotate: `${end}deg`, scale: '1' },
          { offset: 1, rotate: `${end}deg`, scale: '1' },
        ],
        timing,
      ),
      // the cube roll
      part.animate(
        [
          { offset: 0, transform: `rotate${axis}(0deg)` },
          { offset: f0, transform: `rotate${axis}(0deg)`, easing: MECH },
          { offset: f1, transform: `rotate${axis}(${roll}deg)` },
          { offset: 1, transform: `rotate${axis}(${roll}deg)` },
        ],
        timing,
      ),
      // A face turned 90° away still shows as a thin strip under perspective, so each face is
      // only shown while it's on the turning side: the old one until the roll ends, the new one
      // from when it starts.
      front.animate(
        [
          { offset: 0, opacity: 1 },
          { offset: f1, opacity: 1 },
          { offset: Math.min(1, f1 + 0.001), opacity: 0 },
          { offset: 1, opacity: 0 },
        ],
        timing,
      ),
      next.animate(
        [
          { offset: 0, opacity: 0 },
          { offset: f0, opacity: 0 },
          { offset: f0 + 0.001, opacity: 1 },
          { offset: 1, opacity: 1 },
        ],
        timing,
      ),
      // lock-in flash (a colour change, not a filter: filters flatten the 3D)
      next.animate(
        [
          { offset: 0, color: colorB },
          { offset: 0.9, color: colorB },
          { offset: 0.95, color: FLASH },
          { offset: 1, color: colorB },
        ],
        timing,
      ),
    );
  }

  // Extra pieces have no partner, so they merge with a host plate: old ones slide into it and
  // shrink away at its centre; new ones grow out of it and slide to their own place.
  const under = document.createDocumentFragment();
  for (const { piece: p, host, mode } of hidden) {
    const h = host == null ? null : paths[host];
    const part = document.createElement('span');
    part.className = 'nt-part';
    part.style.width = `${p.w}px`;
    part.style.height = `${p.h}px`;
    part.append(face('nt-front', p, 0, 0, p.glyph.color));
    under.append(part);

    const c = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    const Q = (q) => `${q.x - p.w / 2}px ${q.y - p.h / 2}px`;
    if (!h) {
      // nothing to hide under (the other side is empty): just fade
      const fade = mode === 'tuck' ? [1, 0] : [0, 1];
      anims.push(part.animate([{ translate: Q(c), opacity: fade[0] }, { translate: Q(c), opacity: fade[1] }], { duration: total, fill: 'both' }));
      continue;
    }
    const fit = Math.min(1, h.w / p.w, h.h / p.h) * 0.9;
    const sy = p.qy ? 1 : -1;
    const TS = T.TRAVEL_SCALE;
    if (mode === 'tuck') {
      // Slides straight to the host while the host is still at rest, and is drawn into it —
      // shrinking to nothing at the host's centre — by early in the host's move.
      // (Plates are see-through, so nothing can simply hide behind another one.)
      // Offsets are mapped onto host time.
      const hd = h.timing.delay;
      const dur = hd + D;
      const at = (o) => (hd + o * D) / dur;
      anims.push(
        part.animate(
          [
            { offset: 0, translate: Q(c), rotate: '0deg', scale: '1', opacity: 1, easing: MECH },
            { offset: at(0.08), translate: Q(h.ca), rotate: '0deg', scale: `${fit}`, opacity: 1, easing: 'ease-in' },
            { offset: at(0.18), translate: Q(h.cL), rotate: '0deg', scale: `${fit * 0.4}`, opacity: 0.5, easing: 'ease-in' },
            { offset: at(0.26), translate: Q(lerp(h.cL, h.cC, 0.2)), rotate: `${h.mid * 0.2}deg`, scale: '0', opacity: 0 },
            { offset: 1, translate: Q(lerp(h.cL, h.cC, 0.2)), rotate: `${h.mid * 0.2}deg`, scale: '0', opacity: 0 },
          ],
          { duration: dur, endDelay: total - dur, fill: 'both' },
        ),
      );
    } else {
      // Grows out of the host's centre as the host starts moving, then slides to its own place.
      const corner = rand() < 0.5 ? { x: c.x, y: h.cL.y } : { x: h.cL.x, y: c.y };
      const r = rand();
      const dir = rand() < 0.5 ? -1 : 1;
      const mid = r < T.QUARTER ? dir * 90 : (rand() * 2 - 1) * T.TILT_DEG;
      anims.push(
        part.animate(
          [
            { offset: 0, translate: Q(h.ca), rotate: '0deg', scale: '0', opacity: 0 },
            { offset: 0.1, translate: Q(h.ca), rotate: '0deg', scale: '0', opacity: 0, easing: 'ease-out' },
            { offset: 0.18, translate: Q(h.cL), rotate: '0deg', scale: `${fit * 0.4}`, opacity: 0.5, easing: 'ease-out' },
            { offset: 0.26, translate: Q(lerp(h.cL, corner, 0.25)), rotate: `${mid * 0.25}deg`, scale: `${fit}`, opacity: 1, easing: MECH },
            { offset: 0.5, translate: Q(corner), rotate: `${mid}deg`, scale: `${TS}`, opacity: 1, easing: MECH },
            { offset: 0.8, translate: Q({ x: c.x, y: c.y + sy * gap }), rotate: '0deg', scale: `${TS}`, opacity: 1, easing: 'cubic-bezier(.3,1.8,.6,1)' },
            { offset: 0.9, translate: Q(c), rotate: '0deg', scale: '1', opacity: 1 },
            { offset: 1, translate: Q(c), rotate: '0deg', scale: '1', opacity: 1 },
          ],
          h.timing,
        ),
      );
    }
  }
  parts.prepend(under);
  layer.replaceChildren(parts);

  // A plate-free timer spanning the whole sequence, used to know when it has settled.
  const clock = layer.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: 'both' });
  anims.push(clock);
  anims.forEach((a) => a.pause());

  let forward = false;
  let moving = false;
  const settle = () => {
    moving = false;
    root.classList.remove('is-moving');
    root.classList.toggle('is-alt', forward);
  };
  clock.onfinish = settle;

  return {
    set(next, instant = false) {
      if (next === forward && !moving) return;
      forward = next;
      root.classList.toggle('toward-alt', next);
      anims.forEach((a) => (a.playbackRate = next ? 1 : -1));
      if (instant) {
        anims.forEach((a) => a.finish());
        settle();
        return;
      }
      moving = true;
      root.classList.add('is-moving');
      anims.forEach((a) => a.play());
    },
    destroy() {
      anims.forEach((a) => a.cancel());
      layer.replaceChildren();
    },
  };
}

// Wires up a transformation between `fromRef` and `toRef` inside `rootRef`, with plates drawn
// in `layerRef`. Rebuilds once fonts load, on resize and when `deps` change. Returns a stable
// controller: `set(alt)` transforms to the alt content (true) or back (false); `alt` is the
// requested state.
export function usePlates({ rootRef, fromRef, toRef, layerRef }, deps) {
  const api = useRef(null);
  if (!api.current) {
    let want = false;
    let ctl = null;
    api.current = {
      set(v) {
        want = v;
        ctl?.set(v);
      },
      get alt() {
        return want;
      },
      attach(c) {
        ctl = c;
        if (c && want) c.set(true, true);
      },
    };
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const { attach } = api.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctl = null;
    let alive = true;

    const rebuild = () => {
      if (!alive) return;
      ctl?.destroy();
      root.classList.remove('is-moving', 'is-alt', 'toward-alt');
      ctl = reduced
        ? {
            set(v) {
              root.classList.toggle('is-alt', v);
              root.classList.toggle('toward-alt', v);
            },
            destroy() {},
          }
        : build(root, layerRef.current, fromRef.current, toRef.current);
      root.classList.toggle('is-reduced', reduced);
      if (reduced) ctl.set(false);
      attach(ctl);
    };

    (document.fonts?.ready ?? Promise.resolve()).then(rebuild);
    let resizeTimer;
    let lastWidth = root.getBoundingClientRect().width;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const w = root.getBoundingClientRect().width;
        if (w === lastWidth) return; // the layout inside only depends on the width
        lastWidth = w;
        rebuild();
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      clearTimeout(resizeTimer);
      attach(null);
      ctl?.destroy();
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return api.current;
}
