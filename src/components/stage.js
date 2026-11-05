// Shared pieces of the .swap-stage animations: softWipe.js (Experience ↔ Education) and
// projectMorph.js (projects grid ↔ detail box). Stage styles in src/styles/stage.scss.

export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const clamp = (t) => Math.min(1, Math.max(0, t));
export const lerp = (a, b, t) => a + (b - a) * t;
// Exact (unrounded) height: the stage is clipped to it while animating, and offsetHeight rounds —
// rounding down would shave the bottom row's border.
export const exactH = (el) => el.getBoundingClientRect().height;
export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function setMask(el, image) {
  el.style.maskImage = image;
  el.style.webkitMaskImage = image;
}

// A progress value `p` (0 ↔ 1) played toward a target on animation frames, calling `onFrame(p)`
// each frame. Every playback gets an id, so a frame from a stopped or replaced one never acts.
export function makePlayer(onFrame) {
  let p = 0;
  let raf = 0;
  let run = 0;
  return {
    get p() {
      return p;
    },
    // Stops any playback; optionally jumps to `to`.
    stop(to = p) {
      cancelAnimationFrame(raf);
      run++;
      p = to;
    },
    // Plays to `target`, taking `fullMs` for a whole 0 → 1 trip; calls `onDone` on arrival.
    play(target, fullMs, onDone) {
      cancelAnimationFrame(raf);
      const p0 = p;
      const dur = fullMs * Math.abs(target - p0);
      const start = performance.now();
      const id = ++run;
      const frame = (now) => {
        if (id !== run) return;
        p = dur > 0 ? lerp(p0, target, clamp((now - start) / dur)) : target;
        onFrame(p);
        if (p !== target) raf = requestAnimationFrame(frame);
        else onDone();
      };
      raf = requestAnimationFrame(frame);
    },
  };
}

// Ends an animation at rest: drops the animating / clipped state and the scripted height, and
// marks which content is showing.
export function restStage(root, alt) {
  root.classList.remove('is-animating', 'is-clipped');
  root.classList.toggle('is-alt', alt);
  root.style.height = '';
}
