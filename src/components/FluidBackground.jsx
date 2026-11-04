import { useEffect, useRef } from 'react';
import WebGLFluid from 'webgl-fluid';

const config = {
  CAPTURE_RESOLUTION: 512,
  PRESSURE_ITERATIONS: 1,
  SHADING: false,
  COLOR_UPDATE_SPEED: 3,
  PAUSED: false,
  IMMEDIATE: true,
  AUTO: false,
  BLOOM: false,
};

export default function FluidBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // webgl-fluid has no teardown API, so only start it once per canvas
    // (StrictMode runs effects twice in development).
    if (!canvas.dataset.fluidStarted) {
      canvas.dataset.fluidStarted = 'true';
      WebGLFluid(canvas, config);
    }

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas id="fluid" ref={canvasRef}></canvas>;
}
