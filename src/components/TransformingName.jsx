import { useEffect, useRef } from 'react';
import { usePlates } from './plates.js';

// The name transforms into a second line (see plates.js for the effect itself).
// On hover it transforms; mouse-out plays it in reverse; on touch, a tap toggles it.

const glyphsOf = (text) => Array.from(text);

function Line({ text, className, lineRef }) {
  return (
    <span className={className} ref={lineRef}>
      {glyphsOf(text).map((ch, i) => (
        <span key={i} className="nt-ch">
          {ch}
        </span>
      ))}
    </span>
  );
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

// `triggerRef`: another element (the profile picture) that triggers the transformation too.
export default function TransformingName({ text, altText, className = '', triggerRef }) {
  const rootRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const layerRef = useRef(null);

  const plates = usePlates({ rootRef, fromRef, toRef, layerRef }, [text, altText]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Hovering any trigger (the name or the extra one) transforms it; leaving all of them reverts.
    // A short grace period so moving between the photo and the name doesn't flicker it back.
    const targets = [root, triggerRef?.current].filter(Boolean);
    const hovered = new Set();
    let leaveTimer;
    const enter = (e) => {
      if (e.pointerType !== 'mouse') return;
      hovered.add(e.currentTarget);
      clearTimeout(leaveTimer);
      plates.set(true);
    };
    const leave = (e) => {
      if (e.pointerType !== 'mouse') return;
      hovered.delete(e.currentTarget);
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => hovered.size || plates.set(false), 150);
    };
    const tap = (e) => {
      if (e.pointerType === 'mouse') return;
      plates.set(!plates.alt);
      if (!reduced) burst(root, e.clientX, e.clientY);
    };

    for (const el of targets) {
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      el.addEventListener('pointerup', tap);
    }
    return () => {
      clearTimeout(leaveTimer);
      for (const el of targets) {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
        el.removeEventListener('pointerup', tap);
      }
    };
  }, [plates, triggerRef]);

  return (
    <h1 ref={rootRef} className={`name ${className}`} aria-label={text}>
      <Line text={text} className="nt-line nt-from" lineRef={fromRef} />
      <Line text={altText} className="nt-line nt-to" lineRef={toRef} />
      <span className="nt-layer" ref={layerRef} aria-hidden="true" />
    </h1>
  );
}
