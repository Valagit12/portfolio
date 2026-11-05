// Dev-only simulator for the background fluid. Uses the exact same code as the site
// (startFluid from fluidDriver.js), with every setting exposed as a control.
import { startFluid, FLUID_CONFIG, DRIVER_SETTINGS } from '../components/fluidDriver.js';

const STORE_KEY = 'fluid-lab-v1';

// kind: 'config' = library setting, 'driver' = our setting.
// restart: the library only reads it at start-up, so changing it restarts the sim.
const PRESETS = {
  Site: DRIVER_SETTINGS.PALETTE,
  Ocean: ['#4a90e2', '#1e3a8a', '#06b6d4', '#14b8a6', '#60a5fa', '#0ea5e9'],
  Twilight: ['#4a90e2', '#6d28d9', '#a855f7', '#ec4899', '#312e81', '#f472b6'],
  Sunset: ['#4a90e2', '#f97316', '#ef4444', '#facc15', '#db2777', '#7c3aed'],
  Aurora: ['#4a90e2', '#22c55e', '#10b981', '#a3e635', '#8b5cf6', '#2dd4bf'],
  Mono: ['#4a90e2', '#2f6fbd', '#78aef0', '#1d4f8f', '#a9cdf7', '#3b82f6'],
  Rainbow: ['#ff0000', '#ffbf00', '#80ff00', '#00ff40', '#00ffff', '#0040ff', '#8000ff', '#ff00bf'],
};

const groups = [
  {
    title: 'Colours',
    note: 'Load splats use these in a shuffled order; each click picks one at random. Press Re-fill to see a change on the load splats.',
    open: true,
    rows: [{ kind: 'driver', key: 'PALETTE', label: 'Palette', type: 'palette' }],
  },
  {
    title: 'Colour on load',
    note: 'Splats laid out on a grid, one colour each, added once when the page loads.',
    open: true,
    rows: [
      { kind: 'driver', key: 'START_POSITION', label: 'Position', type: 'select', text: true, refill: true,
        options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'grid'],
        help: 'Grid spreads the splats over the screen; anything else stacks them on that point.' },
      { kind: 'driver', key: 'START_SPLATS', label: 'Number of splats', min: 0, max: 30, step: 1, refill: true },
      { kind: 'driver', key: 'START_SIZE', label: 'Size', min: 0.1, max: 3, step: 0.05, refill: true,
        help: '1 = each splat reaches the edge of its grid cell at half strength.' },
      { kind: 'driver', key: 'START_BRIGHTNESS', label: 'Brightness', min: 0, max: 3, step: 0.05, refill: true },
      { kind: 'driver', key: 'START_VELOCITY', label: 'Velocity', min: 0, max: 3000, step: 10, refill: true,
        help: 'Each splat starts moving in a random direction at this speed.' },
    ],
  },
  {
    title: 'Intro swipes',
    note: 'Three invisible finger swipes on load: bottom-left → top-right, top-middle → down, then a circle. They push the fluid (no colour). Turn Instant off and press Replay swipes to watch them.',
    open: true,
    rows: [
      { kind: 'driver', key: 'INTRO_SWIPES', label: 'On', type: 'bool' },
      { kind: 'driver', key: 'INTRO_INSTANT', label: 'Instant', type: 'bool',
        help: 'On (the site): run them all before the background is first drawn. Off: play them in real time so you can watch.' },
      { kind: 'driver', key: 'INTRO_MOTION_FADE', label: 'Motion fade during intro', min: 0, max: 4, step: 0.01,
        help: 'Used only while the swipes and settle time run; the normal Motion fade applies after.' },
      { kind: 'driver', key: 'INTRO_SETTLE', label: 'Settle time', min: 0, max: 5, step: 0.1,
        help: 'Extra seconds after the last swipe, still at the intro motion fade, so the fluid has calmed down before the normal fade takes over.' },
      { kind: 'driver', key: 'INTRO_DURATION', label: 'Swipe duration', min: 0.2, max: 4, step: 0.05,
        help: 'Seconds per swipe (the circle takes 1.5×). Shorter = faster swipe = stronger push.' },
      { kind: 'driver', key: 'INTRO_GAP', label: 'Gap between swipes', min: 0, max: 2, step: 0.05, help: 'Seconds.' },
      { kind: 'driver', key: 'INTRO_FORCE', label: 'Strength', min: 0, max: 5, step: 0.05,
        help: '1 = the same push as a mouse moving that fast.' },
      { kind: 'driver', key: 'INTRO_RADIUS', label: 'Finger size', min: 0.05, max: 3, step: 0.01 },
    ],
  },
  {
    title: 'Fluid physics',
    note: 'How the fluid behaves on its own.',
    open: true,
    rows: [
      { kind: 'config', key: 'DENSITY_DISSIPATION', label: 'Colour fade', min: 0, max: 4, step: 0.01,
        help: 'How fast colour fades. 0 = never.' },
      { kind: 'config', key: 'VELOCITY_DISSIPATION', label: 'Motion fade', min: 0, max: 4, step: 0.01,
        help: 'How fast motion dies out. 0 = keeps moving forever (water); high = stops quickly (honey).' },
      { kind: 'config', key: 'CURL', label: 'Curl', min: 0, max: 60, step: 1,
        help: 'Swirl strength. Turns existing motion into eddies that keep rolling.' },
      { kind: 'config', key: 'PRESSURE', label: 'Pressure', min: 0, max: 1, step: 0.01,
        help: 'How much pressure carries over between frames. Higher = more springy, pushes spread further.' },
      { kind: 'config', key: 'PRESSURE_ITERATIONS', label: 'Pressure iterations', min: 1, max: 60, step: 1,
        help: 'Solver accuracy. Low = speckle/jagged artifacts. Costs GPU.' },
    ],
  },
  {
    title: 'Mouse, touch & scroll',
    note: 'These only push the fluid; they add no colour.',
    rows: [
      { kind: 'config', key: 'SPLAT_FORCE', label: 'Push force', min: 0, max: 20000, step: 100,
        help: 'Scales how hard movement pushes.' },
      { kind: 'driver', key: 'POINTER_RADIUS', label: 'Push size', min: 0.05, max: 3, step: 0.01 },
      { kind: 'driver', key: 'POINTER_FORCE', label: 'Mouse / touch force', min: 0, max: 2, step: 0.01,
        help: 'Multiplier on Push force for mouse and touch only. Intro swipes and scrolling are unaffected.' },
      { kind: 'driver', key: 'SCROLL_STRENGTH', label: 'Scroll strength', min: 0, max: 5, step: 0.05,
        help: '0 on the site: scrolling doesn’t move the fluid (finger drags still do). No scrolling here — test on the real page.' },
    ],
  },
  {
    title: 'Clicks & taps',
    note: 'Each click adds a splash of a random colour.',
    rows: [
      { kind: 'driver', key: 'SPLASH_RADIUS', label: 'Size', min: 0.05, max: 3, step: 0.01 },
      { kind: 'driver', key: 'SPLASH_BRIGHTNESS', label: 'Brightness', min: 0, max: 3, step: 0.05 },
      { kind: 'driver', key: 'SPLASH_FORCE', label: 'Burst force', min: 0, max: 5000, step: 10 },
    ],
  },
  {
    title: 'Look',
    rows: [
      { kind: 'config', key: 'BRIGHTNESS', label: 'Brightness', min: 0, max: 1, step: 0.01,
        help: 'How bright the fluid is drawn. 0.2 matches the old 80% dark overlay.' },
      { kind: 'config', key: 'SHADING', label: 'Shading', type: 'bool', restart: true, help: '3D-looking lighting.' },
      { kind: 'config', key: 'SUNRAYS', label: 'Sunrays', type: 'bool', restart: true },
      { kind: 'config', key: 'SUNRAYS_WEIGHT', label: 'Sunrays weight', min: 0, max: 2, step: 0.01 },
      { kind: 'config', key: 'SUNRAYS_RESOLUTION', label: 'Sunrays resolution', type: 'select', options: [64, 128, 196, 256, 512], restart: true },
      { kind: 'config', key: 'BLOOM', label: 'Bloom', type: 'bool', restart: true, help: 'Glow on bright areas.' },
      { kind: 'config', key: 'BLOOM_INTENSITY', label: 'Bloom intensity', min: 0, max: 2, step: 0.01 },
      { kind: 'config', key: 'BLOOM_THRESHOLD', label: 'Bloom threshold', min: 0, max: 1, step: 0.01 },
      { kind: 'config', key: 'BLOOM_SOFT_KNEE', label: 'Bloom soft knee', min: 0, max: 1, step: 0.01 },
      { kind: 'config', key: 'BLOOM_ITERATIONS', label: 'Bloom iterations', min: 1, max: 8, step: 1, restart: true },
      { kind: 'config', key: 'BLOOM_RESOLUTION', label: 'Bloom resolution', type: 'select', options: [64, 128, 256, 512], restart: true },
    ],
  },
  {
    title: 'Quality',
    rows: [
      { kind: 'config', key: 'SIM_RESOLUTION', label: 'Motion resolution', type: 'select', options: [32, 64, 128, 256], restart: true,
        help: 'Grid for the motion. Lower = cheaper, blobbier.' },
      { kind: 'config', key: 'DYE_RESOLUTION', label: 'Colour resolution', type: 'select', options: [128, 256, 512, 1024, 2048], restart: true,
        help: 'Grid for the colour. The library forces 512 on phones.' },
    ],
  },
  {
    title: 'Library bursts',
    note: 'webgl-fluid’s own random splats (very bright colours, random velocity). Off on the site.',
    rows: [
      { kind: 'config', key: 'IMMEDIATE', label: 'Burst on start', type: 'bool', restart: true },
      { kind: 'config', key: 'AUTO', label: 'Repeat bursts', type: 'bool' },
      { kind: 'config', key: 'INTERVAL', label: 'Repeat every (ms)', min: 300, max: 10000, step: 100 },
      { kind: 'config', key: 'SPLAT_COUNT', label: 'Splats per burst', min: 1, max: 50, step: 1 },
      { kind: 'config', key: 'SPLAT_RADIUS', label: 'Burst splat size', min: 0.01, max: 3, step: 0.01 },
    ],
  },
];

// ---- state -------------------------------------------------------------------------------

const site = { config: { ...FLUID_CONFIG }, driver: { ...DRIVER_SETTINGS } };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) {
      return {
        config: { ...site.config, ...saved.config },
        driver: { ...site.driver, ...saved.driver },
      };
    }
  } catch {
    /* storage unavailable: use site values */
  }
  return structuredClone(site);
}
const state = load();
const save = () => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

// ---- sim ---------------------------------------------------------------------------------


let sim;
try {
  sim = startFluid(document.getElementById('fluid'), state.config, state.driver);
} catch (err) {
  document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;top:12px;left:12px">WebGL unavailable: ${err}</p>`);
}

// What this browser actually runs with (the library silently lowers quality on some browsers).
if (sim?.fluid.info) {
  const i = sim.fluid.info;
  const line = document.createElement('p');
  line.className = 'note';
  line.style.margin = '0';
  line.textContent = `This browser: WebGL ${i.webgl2 ? 2 : 1}, smooth textures ${i.linearFiltering ? 'yes' : 'NO'}, colour res ${i.dyeResolution}, motion res ${i.simResolution}, pixel ratio ${i.dpr}`;
  document.querySelector('#panel .head').after(line);
  line.style.padding = '6px 12px';
  line.style.borderBottom = '1px solid var(--line)';
}

const restart = () => {
  save();
  location.reload();
};

// ---- panel -------------------------------------------------------------------------------

const get = (row) => state[row.kind][row.key];
const siteValue = (row) => site[row.kind][row.key];

function set(row, value) {
  state[row.kind][row.key] = value; // `driver` settings are read live by startFluid
  if (row.kind === 'config' && sim) sim.fluid.config[row.key] = value; // library reads its config live
  save();
}

const body = document.getElementById('body');
const rowEls = [];

for (const group of groups) {
  const details = document.createElement('details');
  details.open = !!group.open;
  details.innerHTML = `<summary>${group.title}</summary>${group.note ? `<p class="note">${group.note}</p>` : ''}`;

  for (const row of group.rows) {
    const el = document.createElement('div');
    el.className = 'row';
    const keyName = row.key;
    el.innerHTML = `
      <div class="row-top">
        <label>${row.label}${row.restart ? '<span class="restart">restarts</span>' : ''}</label>
        <span class="key">${keyName}</span>
      </div>
      <div class="ctrl"></div>
      ${row.help ? `<div class="help">${row.help}</div>` : ''}`;
    const ctrl = el.querySelector('.ctrl');

    const commit = (value) => {
      set(row, value);
      sync();
      if (row.restart) restart();
    };

    let sync;
    if (row.type === 'palette') {
      const presets = document.createElement('div');
      presets.className = 'presets';
      for (const [name, colors] of Object.entries(PRESETS)) {
        const b = document.createElement('button');
        b.textContent = name;
        b.style.background = `linear-gradient(90deg, ${colors.join(', ')})`;
        b.onclick = () => {
          set(row, [...colors]);
          sync();
          sim?.fill();
        };
        presets.append(b);
      }
      const swatches = document.createElement('div');
      swatches.className = 'swatches';
      ctrl.classList.add('palette');
      ctrl.append(presets, swatches);
      sync = () => {
        const palette = get(row);
        swatches.replaceChildren(
          ...palette.map((hex, i) => {
            const sw = document.createElement('span');
            sw.className = 'swatch';
            const pick = Object.assign(document.createElement('input'), { type: 'color', value: hex, title: hex });
            pick.addEventListener('input', () => {
              const next = [...get(row)];
              next[i] = pick.value;
              set(row, next);
              pick.title = pick.value;
              el.classList.toggle('changed', JSON.stringify(next) !== JSON.stringify(siteValue(row)));
            });
            const del = Object.assign(document.createElement('button'), { textContent: '×', title: 'Remove' });
            del.onclick = () => {
              set(row, get(row).filter((_, j) => j !== i));
              sync();
            };
            sw.append(pick, del);
            return sw;
          }),
          Object.assign(document.createElement('button'), {
            textContent: '+ Add',
            onclick: () => {
              set(row, [...get(row), '#ffffff']);
              sync();
            },
          }),
        );
        el.classList.toggle('changed', JSON.stringify(palette) !== JSON.stringify(siteValue(row)));
      };
    } else if (row.type === 'bool') {
      const input = Object.assign(document.createElement('input'), { type: 'checkbox' });
      input.addEventListener('change', () => commit(input.checked));
      ctrl.append(input);
      sync = () => {
        input.checked = !!get(row);
        el.classList.toggle('changed', get(row) !== siteValue(row));
      };
    } else if (row.type === 'select') {
      const select = document.createElement('select');
      select.innerHTML = row.options.map((o) => `<option value="${o}">${o}</option>`).join('');
      select.addEventListener('change', () => commit(row.text ? select.value : Number(select.value)));
      ctrl.append(select);
      sync = () => {
        select.value = String(get(row));
        el.classList.toggle('changed', get(row) !== siteValue(row));
      };
    } else {
      const range = Object.assign(document.createElement('input'), { type: 'range', min: row.min, max: row.max, step: row.step });
      const num = Object.assign(document.createElement('input'), { type: 'number', step: row.step });
      // Live while dragging, except settings that need a restart (applied on release).
      range.addEventListener('input', () => {
        num.value = range.value;
        if (!row.restart) {
          set(row, Number(range.value));
          el.classList.toggle('changed', get(row) !== siteValue(row));
        }
      });
      range.addEventListener('change', () => commit(Number(range.value)));
      num.addEventListener('change', () => num.value !== '' && commit(Number(num.value)));
      ctrl.append(range, num);
      sync = () => {
        range.value = get(row);
        num.value = get(row);
        el.classList.toggle('changed', get(row) !== siteValue(row));
      };
    }
    sync();
    rowEls.push(sync);
    details.append(el);
  }
  body.append(details);
}

// ---- actions -----------------------------------------------------------------------------

const toast = (msg) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.style.display = 'none'), 1800);
};

document.getElementById('refill').onclick = () => sim?.fill();
document.getElementById('replay').onclick = () => sim?.swipes();
document.getElementById('restart').onclick = restart;

const pauseBtn = document.getElementById('pause');
const syncPause = () => (pauseBtn.textContent = sim?.fluid.config.PAUSED ? 'Resume' : 'Pause');
pauseBtn.onclick = () => {
  if (!sim) return;
  sim.fluid.config.PAUSED = !sim.fluid.config.PAUSED;
  state.config.PAUSED = false; // never save "paused"
  syncPause();
};
window.addEventListener('keydown', (e) => e.code === 'KeyP' && setTimeout(syncPause)); // library toggles on P

document.getElementById('reset').onclick = () => {
  Object.assign(state, structuredClone(site));
  restart();
};

document.getElementById('collapse').onclick = (e) => {
  const panel = document.getElementById('panel');
  panel.classList.toggle('collapsed');
  e.currentTarget.textContent = panel.classList.contains('collapsed') ? '+' : '–';
};

const fmt = (obj) =>
  `{\n${Object.entries(obj)
    .map(([k, v]) => `  ${k}: ${typeof v === 'number' || typeof v === 'boolean' ? v : JSON.stringify(v).replaceAll('"', "'").replaceAll(',', ', ')},`)
    .join('\n')}\n}`;

document.getElementById('copy').onclick = async () => {
  const code =
    `export const FLUID_CONFIG = ${fmt({ ...state.config, PAUSED: false })};\n\n` +
    `export const DRIVER_SETTINGS = ${fmt(state.driver)};\n`;
  try {
    await navigator.clipboard.writeText(code);
    toast('Copied — paste into src/components/fluidDriver.js');
  } catch {
    document.getElementById('export-text').value = code;
    document.getElementById('export').style.display = 'flex';
  }
};
document.getElementById('export-close').onclick = () => (document.getElementById('export').style.display = 'none');
