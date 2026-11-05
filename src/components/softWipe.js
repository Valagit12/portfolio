import { useEffect, useRef } from 'react';
import { ease, exactH, makePlayer, prefersReducedMotion, restStage, setMask } from './stage.js';

// Experience ↔ Education: a soft edge sweeps left → right, wiping the old timeline into the new
// one while the box's height eases to fit. Markup: root .swap-stage > .swap-from + .swap-to
// (stage styles in src/styles/stage.scss).

const DURATION_MS = 700;
const SOFT = 48; // half-width of the soft edge, px

function makeWipe(root, from, to) {
  let g = null;

  const apply = (p) => {
    const e = ease(p);
    root.style.height = `${g.hA + (g.hB - g.hA) * e + g.frame}px`;
    // the old content fades out just ahead of the edge and the new just behind it
    const x = e * (g.W + 2 * SOFT) - SOFT;
    setMask(from, `linear-gradient(90deg, transparent ${x}px, #000 ${x + SOFT}px)`);
    setMask(to, `linear-gradient(90deg, #000 ${x - SOFT}px, transparent ${x}px)`);
  };
  const player = makePlayer(apply);

  const clear = () => {
    setMask(from, '');
    setMask(to, '');
  };

  const rest = (alt) => {
    player.stop(alt ? 1 : 0);
    clear();
    restStage(root, alt);
  };

  return {
    jump: rest,
    go(target) {
      if (player.p === target) return rest(target === 1);
      if (!root.classList.contains('is-animating')) {
        // lays both out (so both can be measured) and clips — the box's border is on the stage
        // itself, outside the clip, so nothing visible sits on the clip edge
        root.classList.add('is-animating', 'is-clipped');
        g = { W: root.clientWidth, hA: exactH(from), hB: exactH(to), frame: root.offsetHeight - root.clientHeight };
        apply(player.p);
      }
      player.play(target, DURATION_MS, () => rest(target === 1));
      return undefined;
    },
    destroy() {
      player.stop();
      clear();
      restStage(root, root.classList.contains('is-alt'));
    },
  };
}

// Returns a stable controller: set(alt) wipes to the second content (true) or back (false).
export function useSoftWipe({ rootRef, fromRef, toRef }) {
  const api = useRef(null);
  if (!api.current) {
    let want = false;
    let w = null;
    api.current = {
      set(v) {
        want = v;
        w?.go(v ? 1 : 0);
      },
      attach(x) {
        w = x;
        x?.jump(want);
      },
    };
  }

  useEffect(() => {
    const w = makeWipe(rootRef.current, fromRef.current, toRef.current);
    if (prefersReducedMotion()) w.go = (target) => w.jump(target === 1);
    api.current.attach(w);
    return () => {
      api.current.attach(null);
      w.destroy();
    };
  }, [rootRef, fromRef, toRef]);

  return api.current;
}
