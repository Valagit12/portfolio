import { useEffect, useRef } from 'react';
import { startFluid } from './fluidDriver.js';

const EDGE_SAMPLE_MS = 800;

// Phone browsers paint their toolbars (and anything the canvas doesn't reach) with the page
// background, so keep that matched to the fluid: about once a second, read the fluid's colour
// along the top and bottom edges of the screen → --clr-edge-top / --clr-edge-bottom (the page
// background behind the bars, src/styles/other.scss) and <meta name="theme-color">.
// Resolves once the first colours are in place (the loading screen waits for it).
function matchEdgesToFluid(canvas) {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); // the fluid's own context
  if (!gl) return Promise.resolve();
  const meta = document.querySelector('meta[name="theme-color"]');
  const root = document.documentElement;
  let row = new Uint8Array(0);

  const colourAt = (cssY) => {
    const w = canvas.width;
    const y = Math.round(canvas.height - 1 - (cssY * canvas.height) / (canvas.clientHeight || 1));
    if (row.length !== w * 4) row = new Uint8Array(w * 4);
    gl.readPixels(0, Math.min(canvas.height - 1, Math.max(0, y)), w, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < row.length; i += 16) {
      r += row[i];
      g += row[i + 1];
      b += row[i + 2];
      n++;
    }
    return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
  };

  // Runs in a frame after the fluid has drawn, while its picture is still in the buffer.
  const sample = () => {
    if (document.hidden) return;
    const prev = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const bottom = colourAt(window.innerHeight - 2);
    const top = colourAt(2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prev);
    root.style.setProperty('--clr-edge-top', top);
    root.style.setProperty('--clr-edge-bottom', bottom);
    meta?.setAttribute('content', top);
  };
  setInterval(() => requestAnimationFrame(sample), EDGE_SAMPLE_MS);

  // First sample: applied instantly (.edges-instant switches off the colour fades), so the bars
  // already have their real colours when the loading screen opens instead of fading in after.
  const sampleInstantly = () => {
    root.classList.add('edges-instant');
    try {
      sample();
      getComputedStyle(root).backgroundColor; // commit the new colours before fades come back
    } catch (err) {
      console.warn('Could not read the fluid edge colours:', err);
    } finally {
      root.classList.remove('edges-instant');
    }
  };
  const sampleNextFrame = (done) =>
    requestAnimationFrame(() => {
      sampleInstantly();
      done?.();
    });

  return new Promise((resolve) => {
    if (!document.hidden) return sampleNextFrame(resolve);
    // Background tab: frames are paused, so don't hold the loading screen for them (nobody sees
    // it anyway); take the first colours instantly as soon as the tab is shown.
    resolve();
    const onShow = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onShow);
      sampleNextFrame();
    };
    document.addEventListener('visibilitychange', onShow);
    return undefined;
  });
}

// Settings live in fluidDriver.js; tune them live with the dev-only simulator at /fluid-lab.html.
export default function FluidBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // webgl-fluid has no teardown API, so only start it once per canvas
    // (StrictMode runs effects twice in development). It sizes itself from the canvas's CSS box.
    if (canvas.dataset.fluidStarted) return;
    canvas.dataset.fluidStarted = 'true';
    let edgesReady = Promise.resolve();
    try {
      startFluid(canvas); // includes the instant intro swipes
      edgesReady = matchEdgesToFluid(canvas);
    } catch (err) {
      // No WebGL: leave the plain black background.
      console.warn('Fluid background disabled:', err);
    }
    // Lets the loading screen (src/main.jsx) know the background — fluid and the browser bars'
    // colours — is ready either way.
    edgesReady.finally(() => window.dispatchEvent(new Event('fluid:ready')));
  }, []);

  // Layer covering the page → sticky screen-sized box → canvas (layout in src/styles/other.scss),
  // plus the strip that gives Safari's top bar its own colour (.top-edge, same file).
  return (
    <>
      <div className="fluid-layer" aria-hidden="true">
        <div className="fluid-viewport">
          <canvas id="fluid" ref={canvasRef}></canvas>
        </div>
      </div>
      <div className="top-edge" aria-hidden="true"></div>
    </>
  );
}
