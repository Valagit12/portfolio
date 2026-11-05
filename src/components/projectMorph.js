import { useEffect, useRef } from 'react';
import { clamp, ease, exactH, lerp, makePlayer, prefersReducedMotion, restStage, setMask } from './stage.js';

// Projects: grid ↔ detail box. Opening plays four steps on one timeline (closing plays it back):
//   1. iris  — the other cards fade out behind a soft edge spreading out from the clicked card's borders
//   2. move  — the clicked card slides to the first card's slot (top left, or top in one column)
//   3. grow  — its outline grows to the detail box's size
//   4. wipe  — a soft edge sweeps left → right, wiping the card's text into the details
//              (the title stays: card and box put it in exactly the same spot)
// Markup: root .swap-stage > .swap-from (the grid of .project-card) + .swap-to (the detail box);
// stage styles in src/styles/stage.scss.

const MS = { iris: 450, move: 380, grow: 380, wipe: 420 };
const SOFT = 40; // half-width of the soft edges, px

// Mask for one of the other cards: hidden wherever it's within `d` px of the picked card.
// Cards sit in a grid, so each one is either beside, above / below, or diagonal to the picked one:
// a straight edge for the first two, a circle from the picked card's nearest corner for the last.
function irisMask(r, pick, d) {
  const right = r.x >= pick.x + pick.w - 1;
  const left = r.x + r.w <= pick.x + 1;
  const below = r.y >= pick.y + pick.h - 1;
  const above = r.y + r.h <= pick.y + 1;
  const edge = (dir, gap) => `linear-gradient(${dir}, transparent ${d - gap - SOFT}px, #000 ${d - gap + SOFT}px)`;
  if ((left || right) && !(above || below)) return right ? edge('90deg', r.x - pick.x - pick.w) : edge('270deg', pick.x - r.x - r.w);
  if ((above || below) && !(left || right)) return below ? edge('180deg', r.y - pick.y - pick.h) : edge('0deg', pick.y - r.y - r.h);
  const cx = (right ? pick.x + pick.w : pick.x) - r.x;
  const cy = (below ? pick.y + pick.h : pick.y) - r.y;
  return `radial-gradient(circle at ${cx}px ${cy}px, transparent ${d - SOFT}px, #000 ${d + SOFT}px)`;
}

// Tells the page the sequence has finished (e.g. to move focus): a `morphend` event on the root.
const settled = (root, open) => root.dispatchEvent(new CustomEvent('morphend', { detail: { open } }));

function makeMorph(root, grid, detail) {
  let g = null; // geometry, measured at rest
  let picked = null;
  let shell = null;

  const measure = () => {
    const rr = root.getBoundingClientRect();
    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height };
    };
    const cards = [...grid.querySelectorAll('.project-card')];
    const pick = rel(picked);
    const first = rel(cards[0]);
    const box = rel(detail.firstElementChild);
    // What the wipe covers: everything but the title, which stays put (card and box put it in
    // the same spot). x = where each part starts, relative to its own box's left edge.
    const parts = (el, left) => [...el.children].filter((c) => c.tagName !== 'H3').map((c) => ({ el: c, x: rel(c).x - left }));
    const cardParts = parts(picked, pick.x);
    const boxParts = parts(detail.firstElementChild, box.x);
    const others = cards.filter((el) => el !== picked).map((el) => ({ el, r: rel(el) }));
    const dist = (x, y) => Math.hypot(Math.max(pick.x - x, 0, x - pick.x - pick.w), Math.max(pick.y - y, 0, y - pick.y - pick.h));
    const reach = Math.max(0, ...others.flatMap(({ r }) => [dist(r.x, r.y), dist(r.x + r.w, r.y), dist(r.x, r.y + r.h), dist(r.x + r.w, r.y + r.h)]));
    // phase boundaries (ms); no move when the picked card already is the first one
    const moves = Math.abs(pick.x - first.x) > 1 || Math.abs(pick.y - first.y) > 1;
    const d = [MS.iris, moves ? MS.move : 0, MS.grow, MS.wipe];
    const at = [0, d[0], d[0] + d[1], d[0] + d[1] + d[2]];
    g = { pick, first, box, cardParts, boxParts, others, reach, d, at, total: d.reduce((a, b) => a + b), hA: exactH(grid), hB: exactH(detail) };
  };

  const phase = (i, t) => (g.d[i] ? clamp((t - g.at[i]) / g.d[i]) : t >= g.at[i] ? 1 : 0);

  // p: 0 = grid, 1 = detail box
  const apply = (p) => {
    const t = p * g.total;
    const [e1, e2, e3, e4] = [0, 1, 2, 3].map((i) => ease(phase(i, t)));
    const { pick, first, box, others, reach } = g;

    // 1. iris
    for (const { el, r } of others) setMask(el, e1 > 0 ? irisMask(r, pick, e1 * (reach + 2 * SOFT)) : '');

    // 2. move — the card (and its outline) slide to the first slot
    const x = lerp(pick.x, first.x, e2);
    const y = lerp(pick.y, first.y, e2);
    picked.style.transform = `translate(${x - pick.x}px, ${y - pick.y}px)`;

    // 3. grow — the outline grows into the detail box; the section's height follows
    Object.assign(shell.style, {
      left: `${lerp(x, box.x, e3)}px`,
      top: `${lerp(y, box.y, e3)}px`,
      width: `${lerp(pick.w, box.w, e3)}px`,
      height: `${lerp(pick.h, box.h, e3)}px`,
    });
    root.style.height = `${lerp(g.hA, g.hB, e3)}px`;
    // clip only once it shrinks — by then the other cards are gone (see stage.scss)
    root.classList.toggle('is-clipped', e3 > 0);

    // 4. wipe — the card's text out, the details in; the title stays (see CSS: the box's own
    // title stays hidden until the end, the card's shows through)
    const edge = e4 * (box.w + 2 * SOFT) - SOFT;
    // The old text fades in just ahead of the edge and the new just behind it, so they never overlap.
    for (const { el, x } of g.cardParts) setMask(el, e4 > 0 ? `linear-gradient(90deg, transparent ${edge - x}px, #000 ${edge - x + SOFT}px)` : '');
    detail.style.visibility = e4 > 0 ? 'visible' : 'hidden';
    for (const { el, x } of g.boxParts) setMask(el, `linear-gradient(90deg, #000 ${edge - x - SOFT}px, transparent ${edge - x}px)`);
  };

  const clear = () => {
    for (const el of grid.querySelectorAll('.project-card, .project-card > *')) setMask(el, '');
    for (const el of grid.querySelectorAll('.project-card')) {
      el.style.transform = '';
      el.classList.remove('is-picked');
    }
    for (const el of detail.querySelectorAll('.project-detail > *')) setMask(el, '');
    detail.style.visibility = '';
    shell?.remove();
    shell = null;
  };

  const player = makePlayer(apply);

  const rest = (alt) => {
    player.stop(alt ? 1 : 0);
    clear();
    restStage(root, alt);
  };
  const finish = (alt) => {
    rest(alt);
    settled(root, alt);
  };

  return {
    jump: rest,
    go(target, card) {
      if (card) picked = card;
      // Already there (or nothing to animate): still report it, so focus is handed over.
      if (!picked || player.p === target) return finish(target === 1);
      const atRest = !root.classList.contains('is-animating');
      if (atRest) {
        // measure from the resting layout (is-animating lays both out and drops hover lifts)
        root.classList.add('is-animating');
        picked.classList.add('is-picked');
        measure();
        shell = document.createElement('span');
        shell.className = 'morph-shell';
        shell.setAttribute('aria-hidden', 'true');
        root.append(shell);
        apply(player.p); // first frame now, so nothing flashes before the next animation frame
      }
      player.play(target, g.total, () => finish(target === 1));
      return undefined;
    },
    destroy() {
      player.stop();
      clear();
      restStage(root, root.classList.contains('is-alt'));
    },
  };
}

// Returns a stable controller: set(open, card) plays to the detail box (true) or back (false);
// the root fires `morphend` ({ detail: { open } }) when it finishes;
// request(open, card) is for when the detail content is about to change (`deps`) — it waits for
// the new content to render, then plays.
export function useProjectMorph({ rootRef, fromRef, toRef }, deps) {
  const api = useRef(null);
  if (!api.current) {
    let want = false;
    let pending = false;
    let card = null;
    let m = null;
    api.current = {
      set(v, el) {
        want = v;
        if (el) card = el;
        m?.go(v ? 1 : 0, card);
      },
      request(v, el) {
        want = v;
        pending = true;
        if (el) card = el;
      },
      attach(x) {
        m = x;
        if (!x) return;
        x.jump(want && !pending);
        if (want && pending) x.go(1, card);
        pending = false;
      },
    };
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const m = makeMorph(root, fromRef.current, toRef.current);
    if (prefersReducedMotion()) {
      m.go = (target) => {
        m.jump(target === 1);
        settled(root, target === 1);
      };
    }
    api.current.attach(m);
    return () => {
      api.current.attach(null);
      m.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return api.current;
}
