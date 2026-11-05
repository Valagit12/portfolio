import { useEffect, useRef } from 'react';

// Mechanical "transformation" between two lines of text. Every glyph is cut into four plates
// (quadrants). On hover the plates unlatch by a hairline, then each one travels to a far-off slot
// in the new text (the pairing is scrambled), sliding through the others, flips over to reveal a
// piece of the new glyph there, and locks in place.
// Mouse-out plays the same animation in reverse; on touch, a tap toggles it.

const TIMING = {
  PLATE_MS: 1000, // one plate's full move
  SPREAD_MS: 350, // pieces set off at random times within this window
  MIN_TRAVEL: 0.12, // every piece travels at least this much of the name's width
  SEED: 7, // which scramble — change it for a different shuffle
  SPIN: 0.45, // share of pieces that do a full turn in flight (the rest just tilt)
  TILT_DEG: 70, // max tilt for the pieces that don't spin
  INSIDE_OUT: 0.3, // share of letters that turn inside out as they leave / arrive
  SPLIT_PX: 3, // max gap that opens between neighbouring plates (each moves half of it)
  ROW_LAG_MS: 110, // bottom row trails the top row, so the rows slide through each other
};

const FLASH = '#d6e8ff';

const glyphsOf = (text) => Array.from(text).map((ch) => ({ ch, blank: !ch.trim() }));

function Line({ text, className, lineRef }) {
  return (
    <span className={className} ref={lineRef}>
      {glyphsOf(text).map(({ ch }, i) => (
        <span key={i} className="nt-ch">
          {ch}
        </span>
      ))}
    </span>
  );
}

function measure(line, origin) {
  return [...line.querySelectorAll('.nt-ch')]
    .filter((el) => el.textContent.trim())
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { ch: el.textContent, x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    });
}

function face(cls, glyph, qx, qy) {
  const f = document.createElement('span');
  f.className = `nt-face ${cls}`;
  if (glyph) {
    const g = document.createElement('span');
    g.className = 'nt-glyph';
    g.textContent = glyph.ch;
    g.style.width = `${glyph.w}px`;
    g.style.height = `${glyph.h}px`;
    g.style.left = `${-qx * (glyph.w / 2)}px`;
    g.style.top = `${-qy * (glyph.h / 2)}px`;
    f.append(g);
  }
  return f;
}

// Seeded shuffle so the scramble is the same every time (and reversing retraces it exactly).
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every glyph → four quadrant pieces. Pads the list with blank pieces (spread along the line)
// up to `n`, so both sides have the same number of plates.
function piecesOf(glyphs, n) {
  const list = glyphs.flatMap((gl) =>
    [0, 1, 2, 3].map((q) => {
      const qx = q % 2;
      const qy = q >> 1;
      return { glyph: gl, qx, qy, x: gl.x + qx * (gl.w / 2), y: gl.y + qy * (gl.h / 2), w: gl.w / 2, h: gl.h / 2 };
    }),
  );
  const real = list.length;
  for (let i = 0; list.length < n; i++) list.push({ ...list[Math.floor(((i + 0.5) * real) / (n - real))], glyph: null });
  return list;
}

// Pairs old pieces with new slots at random, then swaps pairs until (almost) every piece
// travels at least `minTravel` px — that's what makes the parts cross the whole name.
function scramble(PA, PB, minTravel, rand) {
  const n = PA.length;
  const perm = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const dist = (i, j) => Math.abs(PA[i].x - PB[j].x);
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < n; i++) {
      if (dist(i, perm[i]) >= minTravel) continue;
      for (let j = 0; j < n; j++) {
        if (dist(i, perm[j]) >= minTravel && dist(j, perm[i]) >= Math.min(minTravel, dist(j, perm[j]))) {
          [perm[i], perm[j]] = [perm[j], perm[i]];
          break;
        }
      }
    }
  }
  return perm;
}

// Tap feedback (touch only): a small burst of sparks from the touch point.
const SPARKS = { COUNT: 12, DISTANCE_PX: [24, 56], SIZE_PX: [4, 7], MS: [450, 750], COLORS: ['#4a90e2', '#8fbfff', '#d6e8ff'] };

function burst(root, clientX, clientY) {
  const r = root.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;
  const between = ([lo, hi]) => lo + Math.random() * (hi - lo);
  for (let i = 0; i < SPARKS.COUNT; i++) {
    const spark = document.createElement('span');
    const size = between(SPARKS.SIZE_PX);
    spark.className = 'nt-spark';
    spark.setAttribute('aria-hidden', 'true');
    spark.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;background:${
      SPARKS.COLORS[i % SPARKS.COLORS.length]
    }`;
    root.append(spark);
    const angle = (i / SPARKS.COUNT) * Math.PI * 2 + Math.random() * 0.6;
    const dist = between(SPARKS.DISTANCE_PX);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    spark
      .animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx * 0.8}px, ${dy * 0.8}px) scale(0.9)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
        ],
        { duration: between(SPARKS.MS), easing: 'cubic-bezier(.2,.7,.3,1)' },
      )
      .finished.then(() => spark.remove(), () => spark.remove());
  }
}

// Builds the plates and their (paused) animations. Returns a controller.
function build(root, layer, from, to) {
  const origin = root.getBoundingClientRect();
  const A = measure(from, origin);
  const B = measure(to, origin);
  const n = 4 * Math.max(A.length, B.length);
  const PA = piecesOf(A, n);
  const PB = piecesOf(B, n);
  const width = origin.width || 1;
  const perm = scramble(PA, PB, width * TIMING.MIN_TRAVEL, rng(TIMING.SEED));
  const { PLATE_MS: D, SPREAD_MS: S, SPLIT_PX, ROW_LAG_MS } = TIMING;
  const gap = SPLIT_PX / 2;
  const total = D + S + ROW_LAG_MS + 60;
  const base = getComputedStyle(root).color;
  const anims = [];
  layer.replaceChildren();

  const rand = rng(TIMING.SEED * 31 + 1);
  // Some letters turn inside out: their four pieces swap to the opposite corner, so the
  // letter's outer edges meet in the middle. Old letters do it as they leave, new ones as they arrive.
  const insideOutA = new Set(A.filter(() => rand() < TIMING.INSIDE_OUT));
  const insideOutB = new Set(B.filter(() => rand() < TIMING.INSIDE_OUT));
  const opposite = (p) => ({ x: p.x + (p.qx ? -p.w : p.w), y: p.y + (p.qy ? -p.h : p.h) });

  for (let i = 0; i < n; i++) {
    const a = PA[i];
    const b = PB[perm[i]];
    // each piece splits away from its own glyph's centre, at both ends of the trip
    const asx = a.qx ? 1 : -1;
    const ady = a.qy ? 1 : -1;
    const bsx = b.qx ? 1 : -1;
    const bdy = b.qy ? 1 : -1;
    const leave = a.glyph && insideOutA.has(a.glyph) ? opposite(a) : a;
    const arrive = b.glyph && insideOutB.has(b.glyph) ? opposite(b) : b;

    // Spin in the plane while travelling: a full turn either way, or just a tilt that rights itself.
    const r = rand();
    const turns = r < TIMING.SPIN / 2 ? -1 : r < TIMING.SPIN ? 1 : 0;
    const tilt = (rand() * 2 - 1) * TIMING.TILT_DEG;

    const part = document.createElement('span');
    part.className = 'nt-part';
    part.style.height = `${a.h}px`;
    part.append(face('nt-front', a.glyph, a.qx, a.qy), face('nt-back', b.glyph, b.qx, b.qy));
    layer.append(part);

    const delay = S * rand() + a.qy * ROW_LAG_MS;
    const timing = { duration: D, delay, endDelay: total - D - delay, fill: 'both' };
    const P = (x, y) => `${x}px ${y}px`;
    const mech = 'cubic-bezier(.65,0,.25,1)';

    anims.push(
      part.animate(
        [
          { offset: 0, translate: P(a.x, a.y), easing: 'cubic-bezier(.4,0,.2,1)' },
          { offset: 0.1, translate: P(a.x + asx * gap, a.y + ady * gap), easing: mech },
          { offset: 0.24, translate: P(leave.x + asx * gap, leave.y + ady * gap), easing: mech },
          { offset: 0.72, translate: P(arrive.x + bsx * gap, arrive.y + bdy * gap), easing: mech },
          { offset: 0.86, translate: P(b.x + bsx * gap, b.y + bdy * gap), easing: 'cubic-bezier(.3,1.8,.6,1)' },
          { offset: 1, translate: P(b.x, b.y) },
        ],
        timing,
      ),
      part.animate(
        [
          { offset: 0, transform: 'rotate(0deg)' },
          { offset: 0.24, transform: 'rotate(0deg)', easing: mech },
          { offset: 0.48, transform: `rotate(${turns * 180 + tilt}deg)`, easing: mech },
          { offset: 0.72, transform: `rotate(${turns * 360}deg)` },
          { offset: 1, transform: `rotate(${turns * 360}deg)` },
        ],
        timing,
      ),
      part.animate(
        [
          { offset: 0, rotate: 'y 0deg' },
          { offset: 0.4, rotate: 'y 0deg', easing: mech },
          { offset: 0.64, rotate: 'y 180deg' },
          { offset: 1, rotate: 'y 180deg' },
        ],
        timing,
      ),
      part.animate(
        [
          { offset: 0, width: `${a.w}px` },
          { offset: 0.5, width: `${a.w}px` },
          { offset: 0.54, width: `${b.w}px` },
          { offset: 1, width: `${b.w}px` },
        ],
        timing,
      ),
      part.animate(
        [
          // lock-in flash (a colour change, not a filter: filters flatten the 3D flip)
          { offset: 0, color: base },
          { offset: 0.9, color: base },
          { offset: 0.95, color: FLASH },
          { offset: 1, color: base },
        ],
        timing,
      ),
    );
  }

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
    set(next) {
      if (next === forward && !moving) return;
      forward = next;
      moving = true;
      root.classList.add('is-moving');
      anims.forEach((a) => {
        a.playbackRate = next ? 1 : -1;
        a.play();
      });
    },
    get alt() {
      return forward;
    },
    destroy() {
      anims.forEach((a) => a.cancel());
      layer.replaceChildren();
    },
  };
}

// `triggerRef`: another element (the profile picture) that triggers the transformation too.
export default function TransformingName({ text, altText, className = '', triggerRef }) {
  const rootRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctl = null;
    let alive = true;

    const rebuild = () => {
      if (!alive) return;
      const wasAlt = ctl?.alt ?? false;
      ctl?.destroy();
      root.classList.remove('is-moving', 'is-alt');
      ctl = reduced
        ? { set: (v) => root.classList.toggle('is-alt', v), get alt() { return root.classList.contains('is-alt'); }, destroy() {} }
        : build(root, layerRef.current, fromRef.current, toRef.current);
      root.classList.toggle('is-reduced', reduced);
      if (wasAlt) ctl.set(true);
    };

    (document.fonts?.ready ?? Promise.resolve()).then(rebuild);
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuild, 150);
    };
    // Hovering any trigger (the name or the extra one) transforms it; leaving all of them reverts.
    // A short grace period so moving between the photo and the name doesn't flicker it back.
    const targets = [root, triggerRef?.current].filter(Boolean);
    const hovered = new Set();
    let leaveTimer;
    const enter = (e) => {
      if (e.pointerType !== 'mouse') return;
      hovered.add(e.currentTarget);
      clearTimeout(leaveTimer);
      ctl?.set(true);
    };
    const leave = (e) => {
      if (e.pointerType !== 'mouse') return;
      hovered.delete(e.currentTarget);
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => hovered.size || ctl?.set(false), 150);
    };
    const tap = (e) => {
      if (e.pointerType === 'mouse') return;
      ctl?.set(!ctl.alt);
      if (!reduced) burst(root, e.clientX, e.clientY);
    };

    window.addEventListener('resize', onResize);
    for (const el of targets) {
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      el.addEventListener('pointerup', tap);
    }
    return () => {
      alive = false;
      clearTimeout(resizeTimer);
      clearTimeout(leaveTimer);
      ctl?.destroy();
      window.removeEventListener('resize', onResize);
      for (const el of targets) {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
        el.removeEventListener('pointerup', tap);
      }
    };
  }, [text, altText, triggerRef]);

  return (
    <h1 ref={rootRef} className={`name ${className}`} aria-label={text}>
      <Line text={text} className="nt-line nt-from" lineRef={fromRef} />
      <Line text={altText} className="nt-line nt-to" lineRef={toRef} />
      <span className="nt-layer" ref={layerRef} aria-hidden="true" />
    </h1>
  );
}
