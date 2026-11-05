// ./audio/sfx.js
//
// Every sound effect, synthesized from scratch: no audio files to download.
// Each recipe writes samples into a Float32Array (mono, -1..1). This module
// has no browser dependencies, so the sounds can also be rendered and checked
// outside the game.
//
// Building blocks:
//   tone()  - an oscillator with a pitch sweep and a decay
//   noise() - white noise through a (sweepable) filter, with a decay
//   then drive() for grit, echo() for space, and normalize() to set the level.

const TAU = Math.PI * 2;

// ---------- Envelopes ----------

/** Fast attack, exponential decay with time constant `tau` (seconds). */
const hit = (tau, attack = 0.002) => (t) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
/** Rises and falls over `dur`: the shape of a swing passing by. */
const swell = (dur, peak = 0.45) => (t) => {
    const x = t / dur;
    if (x >= 1) return 0;
    return x < peak ? Math.sin((x / peak) * Math.PI * 0.5) ** 2 : Math.cos(((x - peak) / (1 - peak)) * Math.PI * 0.5) ** 2;
};

/** Exponential glide from `a` to `b` Hz over `dur` seconds, then holds `b`. */
const glide = (a, b, dur) => (t) => (t >= dur ? b : a * Math.pow(b / a, t / dur));
const fixed = (f) => () => f;

// ---------- Generators ----------

/**
 * Add an oscillator into `out`.
 * @param {object} o - { freq: Hz or (t) => Hz, amp, env: (t) => 0..1, start, dur, wave: "sine"|"tri"|"square" }
 */
function tone(out, sr, { freq, amp = 1, env = hit(0.1), start = 0, dur = out.length / sr - start, wave = "sine" }) {
    const f = typeof freq === "function" ? freq : fixed(freq);
    const s0 = Math.round(start * sr);
    const n = Math.min(out.length - s0, Math.round(dur * sr));
    let phase = 0;
    for (let i = 0; i < n; i++) {
        const t = i / sr;
        phase += f(t) / sr;
        phase -= Math.floor(phase);
        let v;
        if (wave === "square") v = Math.tanh(Math.sin(phase * TAU) * 4);
        else if (wave === "tri") v = 1 - 4 * Math.abs(phase - 0.5);
        else v = Math.sin(phase * TAU);
        out[s0 + i] += v * amp * env(t);
    }
}

/**
 * Add filtered white noise into `out`.
 * Filter: { type: "low"|"band"|"high", freq: Hz or (t) => Hz, q }.
 * Uses a topology-preserving state-variable filter, which stays stable while
 * the cutoff sweeps.
 */
function noise(out, sr, { amp = 1, env = hit(0.05), start = 0, dur = out.length / sr - start, filter = null, rand }) {
    const s0 = Math.round(start * sr);
    const n = Math.min(out.length - s0, Math.round(dur * sr));
    const cutoff = filter ? (typeof filter.freq === "function" ? filter.freq : fixed(filter.freq)) : null;
    const k = filter ? 1 / (filter.q ?? 0.707) : 0;
    let ic1 = 0;
    let ic2 = 0;
    for (let i = 0; i < n; i++) {
        const t = i / sr;
        let v = rand() * 2 - 1;
        if (filter) {
            const g = Math.tan((Math.PI * Math.min(cutoff(t), sr * 0.45)) / sr);
            const a1 = 1 / (1 + g * (g + k));
            const a2 = g * a1;
            const a3 = g * a2;
            const v3 = v - ic2;
            const v1 = a1 * ic1 + a2 * v3;
            const v2 = ic2 + a2 * ic1 + a3 * v3;
            ic1 = 2 * v1 - ic1;
            ic2 = 2 * v2 - ic2;
            v = filter.type === "low" ? v2 : filter.type === "band" ? v1 * k : v - k * v1 - v2;
        }
        out[s0 + i] += v * amp * env(t);
    }
}

// ---------- Processing ----------

/** Soft clip for grit: more `amount` = more crunch. */
function drive(out, amount) {
    const norm = Math.tanh(amount);
    for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * amount) / norm;
}

/** Feedback echo: each repeat `delay` seconds later, `feedback` as loud. */
function echo(out, sr, delay, feedback) {
    const d = Math.round(delay * sr);
    for (let i = d; i < out.length; i++) out[i] += out[i - d] * feedback;
}

/** Scale to the given peak, and fade the last 30 ms so nothing clicks. */
function normalize(out, sr, peak) {
    let max = 0;
    for (let i = 0; i < out.length; i++) max = Math.max(max, Math.abs(out[i]));
    if (max > 0) for (let i = 0; i < out.length; i++) out[i] *= peak / max;
    const fade = Math.min(out.length, Math.round(0.03 * sr));
    for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= (i / fade) ** 2;
}

/** Small seeded generator, so a sound comes out the same every time. */
function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------- Recipes ----------
// Each: { seconds, peak, build(out, sr, rand) }. `peak` sets the mix level
// against the other sounds (hits loudest, footsteps quietest).

const metal = (out, sr, f0, ratios, amps, taus, amp = 1, start = 0) => {
    ratios.forEach((r, i) => tone(out, sr, { freq: f0 * r, amp: amp * amps[i], env: hit(taus[i], 0.001), start }));
};

/** Build into a fresh buffer (so it can be driven on its own), then mix it into `out`. */
const layer = (out, gain, build) => {
    const b = new Float32Array(out.length);
    build(b);
    for (let i = 0; i < out.length; i++) out[i] += b[i] * gain;
};

/** Bone-and-gravel crunch: a burst of tiny band-passed noise grains, each quieter than the last. */
const crunch = (out, sr, rand, { count, spread, freq, amp = 1, start = 0 }) => {
    for (let i = 0; i < count; i++) {
        const at = start + (i / count) * spread + rand() * (spread / count);
        noise(out, sr, {
            amp: amp * (1 - (i / count) * 0.6) * (0.6 + rand() * 0.4),
            env: hit(0.0035 + rand() * 0.004, 0.0003),
            start: at,
            dur: 0.03,
            filter: { type: "band", freq: freq * (0.65 + rand() * 0.7), q: 1.6 },
            rand,
        });
    }
};

/**
 * Bones breaking: a few hard cracks at uneven gaps (the snap), splinters
 * crackling off after them, and a duller, meatier snap underneath.
 * `snaps` loud cracks, `splinters` small ones spread over `spread` seconds.
 */
const bones = (out, sr, rand, { snaps, splinters, spread, amp = 1, start = 0.004 }) => {
    let at = start;
    for (let i = 0; i < snaps; i++) {
        const a = amp * (1 - i * 0.18);
        // The crack: a near-instant broadband click with a ringing, woody resonance
        noise(out, sr, { amp: a, env: hit(0.0012, 0.0001), start: at, dur: 0.012, filter: { type: "high", freq: 1800 }, rand });
        noise(out, sr, { amp: a * 0.9, env: hit(0.005, 0.0001), start: at, dur: 0.03, filter: { type: "band", freq: 1600 + rand() * 2200, q: 6 }, rand });
        tone(out, sr, { freq: glide(2600 + rand() * 1200, 1400, 0.01), amp: a * 0.35, env: hit(0.0025, 0.0001), start: at, dur: 0.02 });
        // Its body: the dull, wet part of the break
        noise(out, sr, { amp: a * 0.7, env: hit(0.012, 0.0005), start: at, dur: 0.05, filter: { type: "band", freq: 500 + rand() * 400, q: 2.5 }, rand });
        at += 0.012 + rand() * 0.022;
    }
    // Splinters: bunched up right after the cracks, thinning out
    for (let i = 0; i < splinters; i++) {
        const x = (i + rand()) / splinters;
        const t = start + 0.008 + spread * x * x;
        noise(out, sr, {
            amp: amp * (0.25 + rand() * 0.4) * (1 - x * 0.7),
            env: hit(0.0012 + rand() * 0.003, 0.0001),
            start: t,
            dur: 0.02,
            filter: { type: "band", freq: 1400 + rand() * 4000, q: 2.5 + rand() * 3 },
            rand,
        });
    }
};

/**
 * Dumbbell iron ringing off the hit: a short, clashing metallic ping, not the
 * special's full bell. `f0` sets the pitch, `decay` how long it rings.
 */
const ping = (out, sr, { f0, amp, decay, start = 0.002 }) => {
    metal(out, sr, f0, [1, 2.76, 4.07, 5.4, 8.1], [1, 0.7, 0.45, 0.35, 0.2], [decay, decay * 0.7, decay * 0.5, decay * 0.35, decay * 0.2], amp, start);
    // Slightly detuned twin, so it shimmers like struck iron instead of a pure tone
    metal(out, sr, f0 * 1.013, [1, 2.76], [0.5, 0.3], [decay * 0.8, decay * 0.5], amp, start);
};

/** Burning: a soft, wavering hiss fading out, with a few sparse, lowish pops (not a rattle). */
const sizzle = (out, sr, rand, { amp, tau, start, crackles, spread }) => {
    const waver = (t) => hit(tau, 0.02)(t) * (0.8 + 0.2 * Math.sin(t * TAU * 7));
    noise(out, sr, { amp, env: waver, start, filter: { type: "band", freq: 3500, q: 0.7 }, rand });
    for (let i = 0; i < crackles; i++) {
        const at = start + ((i + rand() * 0.8) / crackles) * spread;
        noise(out, sr, { amp: amp * (0.8 + rand()), env: hit(0.006, 0.0005), start: at, dur: 0.03, filter: { type: "band", freq: 1200 + rand() * 1200, q: 2.5 }, rand });
    }
};

/**
 * A blade's "shiiiinnn": the edge scraping along (narrow noise rising in
 * pitch) into a high steel ring that shimmers (detuned pairs beating) and
 * fades. High up, with no body under it, so it rings like a sword, not a pipe.
 */
// `f0` sets the ring's pitch; `scrape` is the edge's [from, to] Hz (rising
// for a slash, falling for a stab driven downward) over `len` seconds.
const shing = (out, sr, rand, { amp, ring = 0.45, start = 0, f0 = 3150, scrape = [2800, 6500], len = 0.16 }) => {
    noise(out, sr, { amp: amp * 0.9, env: hit(0.004, 0.0002), start, dur: 0.02, filter: { type: "high", freq: 3500 }, rand });
    noise(out, sr, { amp, env: swell(len, 0.35), start, filter: { type: "band", freq: glide(scrape[0], scrape[1], len), q: 7 }, rand });
    noise(out, sr, { amp: amp * 0.5, env: hit(ring * 0.6, 0.01), start, filter: { type: "band", freq: f0 * 2.3, q: 5 }, rand });
    [1, 1.34, 1.83, 2.41].forEach((r, i) => {
        const a = amp * [0.5, 0.35, 0.25, 0.15][i];
        const tau = ring * [1, 0.8, 0.6, 0.45][i];
        tone(out, sr, { freq: f0 * r, amp: a, env: hit(tau, 0.008), start });
        tone(out, sr, { freq: f0 * r * 1.004, amp: a * 0.8, env: hit(tau * 0.9, 0.008), start });
    });
};

/**
 * Smooth random wobble, 0..1, changing `rate` times a second. Fire's flicker
 * is irregular: a steady sine wobble sounds like a machine.
 */
const turbulence = (rand, rate, seconds) => {
    const pts = Array.from({ length: Math.ceil(seconds * rate) + 2 }, () => rand());
    return (t) => {
        const x = Math.min(t * rate, pts.length - 1.001);
        const i = Math.floor(x);
        const f = (1 - Math.cos((x - i) * Math.PI)) / 2;
        return pts[i] * (1 - f) + pts[i + 1] * f;
    };
};

/**
 * Fire catching and burning: a soft rush of low noise swelling up (not
 * snapping on) and burning off over `len` seconds, flickering slowly and
 * unevenly. Kept clean: distortion or a fast attack turns it into a crunchy
 * hit. No pitch sweep either (that makes it a whoosh). A couple of sharp,
 * sparse pops for burning wood, and a little hiss on top.
 */
const flame = (out, sr, rand, { amp, start = 0, len = 0.45 }) => {
    const body = swell(len, 0.28);
    const t1 = turbulence(rand, 9, len);
    const t2 = turbulence(rand, 14, len);
    const t3 = turbulence(rand, 25, len);
    noise(out, sr, { amp: amp, env: (t) => body(t) * (0.5 + 0.5 * t1(t)), start, filter: { type: "low", freq: 520, q: 0.5 }, rand });
    noise(out, sr, { amp: amp * 0.45, env: (t) => body(t) * (0.4 + 0.6 * t2(t)), start, filter: { type: "band", freq: 1100, q: 0.5 }, rand });
    noise(out, sr, { amp: amp * 0.12, env: (t) => body(t) * (0.3 + 0.7 * t3(t)), start, filter: { type: "high", freq: 5000 }, rand });
    for (let i = 0; i < 3; i++) {
        const at = start + len * (0.25 + 0.6 * ((i + rand() * 0.8) / 3));
        noise(out, sr, { amp: amp * (0.25 + rand() * 0.2), env: hit(0.0009, 0.0001), start: at, dur: 0.01, filter: { type: "high", freq: 1500 }, rand });
    }
};

/**
 * Kasai's flaming slash: the blade's shing, with the fire flaring up off it
 * right behind. `blade` goes to shing(); `fire` sets how loud the flames are.
 */
const kasaiSlash = (out, sr, rand, { blade, fire = 1, start = 0 }) => {
    // Catching just after the cut, so the shing comes first and the fire trails it
    flame(out, sr, rand, { amp: 1.3 * fire, start: start + 0.03, len: 0.45 });
    shing(out, sr, rand, { amp: 1, start, ...blade });
};

// Dom's attacks: the shared hits' bass thuds (the dumbbell landing), bones
// breaking on top, and the iron ringing off it (added after the grit, so it rings clean)
// `bass` adds an extra deep thump under the base hit.
const domHit = (base, breaks, breakAmp, grit, ring, bass = 0) => ({
    seconds: RECIPES_BASE[base].seconds,
    peak: RECIPES_BASE[base].peak,
    build(out, sr, rand) {
        RECIPES_BASE[base].build(out, sr, rand);
        if (bass) {
            tone(out, sr, { freq: glide(105, 36, 0.12), amp: bass, env: hit(0.13) });
            noise(out, sr, { amp: bass * 0.5, env: hit(0.07), filter: { type: "low", freq: 260 }, rand });
        }
        layer(out, breakAmp, (b) => {
            bones(b, sr, rand, breaks);
            drive(b, 4);
        });
        drive(out, grit);
        ping(out, sr, ring);
    },
    // The iron ring on its own: layered over the recorded hit (see Sound.js)
    ringBuild(out, sr) {
        ping(out, sr, ring);
    },
});

const RECIPES_BASE = {
    // Jab: a tight slap with a little body
    hit_light: {
        seconds: 0.2,
        peak: 0.75,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(190, 85, 0.05), amp: 0.9, env: hit(0.03) });
            noise(out, sr, { amp: 0.8, env: hit(0.016), filter: { type: "band", freq: 2600, q: 1.1 }, rand });
            noise(out, sr, { amp: 0.4, env: hit(0.005, 0.0005), filter: { type: "high", freq: 4500 }, rand });
            drive(out, 1.6);
        },
    },
    // Solid punch
    hit_medium: {
        seconds: 0.4,
        peak: 0.85,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(160, 60, 0.08), amp: 1, env: hit(0.055) });
            noise(out, sr, { amp: 0.85, env: hit(0.03), filter: { type: "band", freq: glide(2200, 1100, 0.05), q: 1 }, rand });
            noise(out, sr, { amp: 0.5, env: hit(0.06), filter: { type: "low", freq: 650 }, rand });
            noise(out, sr, { amp: 0.35, env: hit(0.006, 0.0005), filter: { type: "high", freq: 4000 }, rand });
            drive(out, 2.2);
        },
    },
    // Big crunchy impact
    hit_heavy: {
        seconds: 0.8,
        peak: 0.95,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(130, 42, 0.14), amp: 1.1, env: hit(0.11) });
            tone(out, sr, { freq: glide(65, 34, 0.2), amp: 0.7, env: hit(0.16) });
            noise(out, sr, { amp: 0.95, env: hit(0.05), filter: { type: "band", freq: glide(2800, 550, 0.12), q: 0.9 }, rand });
            noise(out, sr, { amp: 0.6, env: hit(0.12), filter: { type: "low", freq: 900 }, rand });
            noise(out, sr, { amp: 0.4, env: hit(0.008, 0.0005), filter: { type: "high", freq: 3500 }, rand });
            drive(out, 3);
        },
    },
    // Special move: heavy impact with a sharp crack and a sub boom
    hit_special: {
        seconds: 1.1,
        peak: 1,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(120, 30, 0.3), amp: 1.1, env: hit(0.22) });
            tone(out, sr, { freq: glide(260, 70, 0.06), amp: 0.6, env: hit(0.05) });
            noise(out, sr, { amp: 1, env: hit(0.07), filter: { type: "band", freq: glide(3500, 400, 0.25), q: 0.8 }, rand });
            noise(out, sr, { amp: 0.7, env: hit(0.018, 0.0005), filter: { type: "high", freq: 3000 }, rand });
            noise(out, sr, { amp: 0.5, env: hit(0.2), filter: { type: "low", freq: glide(1200, 200, 0.4) }, rand });
            drive(out, 3.2);
            echo(out, sr, 0.09, 0.22);
        },
    },
    // Guarded: a hard, short clack
    block: {
        seconds: 0.18,
        peak: 0.6,
        build(out, sr, rand) {
            noise(out, sr, { amp: 1, env: hit(0.012, 0.0005), filter: { type: "band", freq: 3200, q: 3.5 }, rand });
            noise(out, sr, { amp: 0.5, env: hit(0.02), filter: { type: "band", freq: 900, q: 2 }, rand });
            tone(out, sr, { freq: 720, amp: 0.3, env: hit(0.025) });
            tone(out, sr, { freq: 1690, amp: 0.2, env: hit(0.016) });
            tone(out, sr, { freq: glide(140, 90, 0.03), amp: 0.4, env: hit(0.02) });
            drive(out, 1.8);
        },
    },
    // Swings: band-passed air sweeping up past the ear
    whoosh_light: {
        seconds: 0.15,
        peak: 0.32,
        build(out, sr, rand) {
            noise(out, sr, { amp: 1, env: swell(0.15, 0.35), filter: { type: "band", freq: glide(900, 2800, 0.15), q: 2.2 }, rand });
        },
    },
    whoosh_heavy: {
        seconds: 0.26,
        peak: 0.4,
        build(out, sr, rand) {
            noise(out, sr, { amp: 1, env: swell(0.26, 0.4), filter: { type: "band", freq: glide(380, 1600, 0.26), q: 1.8 }, rand });
            noise(out, sr, { amp: 0.4, env: swell(0.26, 0.5), filter: { type: "low", freq: 300 }, rand });
        },
    },
    whoosh_special: {
        seconds: 0.4,
        peak: 0.45,
        build(out, sr, rand) {
            noise(out, sr, { amp: 1, env: swell(0.4, 0.55), filter: { type: "band", freq: glide(250, 2200, 0.4), q: 1.5 }, rand });
            tone(out, sr, { freq: glide(60, 120, 0.4), amp: 0.25, env: swell(0.4, 0.6) });
        },
    },
    // Movement
    jump: {
        seconds: 0.16,
        peak: 0.22,
        build(out, sr, rand) {
            noise(out, sr, { amp: 0.6, env: hit(0.018), filter: { type: "low", freq: 500 }, rand });
            noise(out, sr, { amp: 1, env: swell(0.16, 0.3), filter: { type: "band", freq: glide(500, 1500, 0.16), q: 1.6 }, rand });
        },
    },
    land: {
        seconds: 0.16,
        peak: 0.3,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(95, 50, 0.05), amp: 0.8, env: hit(0.035) });
            noise(out, sr, { amp: 0.6, env: hit(0.025), filter: { type: "low", freq: 600 }, rand });
            noise(out, sr, { amp: 0.25, env: hit(0.012), filter: { type: "band", freq: 2200, q: 1.5 }, rand });
        },
    },
    dash: {
        seconds: 0.2,
        peak: 0.25,
        build(out, sr, rand) {
            noise(out, sr, { amp: 0.7, env: hit(0.03), filter: { type: "band", freq: 1800, q: 1.2 }, rand });
            noise(out, sr, { amp: 1, env: swell(0.2, 0.25), filter: { type: "band", freq: glide(600, 1300, 0.2), q: 1.4 }, rand });
        },
    },
    // Body hits the floor
    knockdown: {
        seconds: 0.7,
        peak: 0.85,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(85, 34, 0.15), amp: 1, env: hit(0.12) });
            noise(out, sr, { amp: 0.85, env: hit(0.09), filter: { type: "low", freq: glide(450, 140, 0.2) }, rand });
            noise(out, sr, { amp: 0.4, env: hit(0.02), filter: { type: "band", freq: 1300, q: 1 }, rand });
            // A small second bounce
            tone(out, sr, { freq: glide(80, 40, 0.08), amp: 0.4, env: hit(0.05), start: 0.13 });
            noise(out, sr, { amp: 0.3, env: hit(0.04), filter: { type: "low", freq: 400 }, rand, start: 0.13 });
            drive(out, 2.2);
        },
    },
    // Dom's dumbbells smashing together: the bell ring over a crunchy, heavy impact
    clang: {
        seconds: 1.8,
        peak: 0.8,
        build(out, sr, rand) {
            // The ring, kept clean enough to sing
            layer(out, 1, (b) => {
                metal(b, sr, 410, [1, 2.76, 5.4, 8.93, 1.5], [1, 0.6, 0.4, 0.25, 0.35], [0.45, 0.28, 0.16, 0.09, 0.3]);
                metal(b, sr, 410, [11.7, 14.2], [0.18, 0.1], [0.05, 0.03]); // a little metallic bite on top
                noise(b, sr, { amp: 0.8, env: hit(0.01, 0.0005), filter: { type: "high", freq: 2500 }, rand });
                drive(b, 1.6);
            });
            // The impact under it, driven hard: iron on iron
            layer(out, 1.1, (b) => {
                tone(b, sr, { freq: glide(150, 45, 0.1), amp: 1, env: hit(0.09) });
                tone(b, sr, { freq: glide(70, 32, 0.22), amp: 0.7, env: hit(0.18) });
                noise(b, sr, { amp: 0.9, env: hit(0.035), filter: { type: "band", freq: glide(3200, 700, 0.08), q: 0.9 }, rand });
                crunch(b, sr, rand, { count: 12, spread: 0.06, freq: 2400, amp: 1.1 });
                bones(b, sr, rand, { snaps: 3, splinters: 30, spread: 0.14, amp: 1.2 });
                drive(b, 4.5);
            });
        },
        // Just the dumbbells' ring, to layer over the recorded clang
        ringBuild(out, sr) {
            layer(out, 0.5, (b) => {
                metal(b, sr, 410, [1, 2.76, 5.4, 8.93, 1.5], [1, 0.6, 0.4, 0.25, 0.35], [0.45, 0.28, 0.16, 0.09, 0.3]);
                metal(b, sr, 410, [11.7, 14.2], [0.18, 0.1], [0.05, 0.03]);
                drive(b, 1.6);
            });
        },
    },
    // Kasai's 1: the burning blade swishing up. A whistling swoosh (resonant
    // noise sweeping up and back down as it passes), with a flame's rumble under it.
    // Loud, so it isn't lost under the hit that follows it.
    fire_slash: {
        // Starts one 50 ms frame before the hit lands: peaks right as it connects
        seconds: 0.24,
        peak: 0.62,
        build(out, sr, rand) {
            const pass = (t) => (t < 0.05 ? 600 * Math.pow(6, t / 0.05) : 3600 * Math.pow(0.45, (t - 0.05) / 0.1));
            noise(out, sr, { amp: 1, env: swell(0.22, 0.22), filter: { type: "band", freq: pass, q: 3.5 }, rand });
            noise(out, sr, { amp: 0.35, env: swell(0.18, 0.25), filter: { type: "high", freq: 6000 }, rand });
            noise(out, sr, { amp: 0.4, env: swell(0.24, 0.3), filter: { type: "low", freq: glide(1400, 500, 0.24) }, rand });
        },
    },
    // ...and landing: the blade ringing through ("shiiiinnn"), and the fire
    // flaring up off it
    kasai_slash: {
        seconds: 0.5,
        peak: 0.6,
        build(out, sr, rand) {
            kasaiSlash(out, sr, rand, { blade: { ring: 0.16 } });
        },
    },
    // Kasai's jump 1, a downward stab: the same slash, the ring a little higher
    // and the edge scraping downward with the blade
    kasai_jump1: {
        seconds: 0.5,
        peak: 0.6,
        build(out, sr, rand) {
            kasaiSlash(out, sr, rand, { blade: { ring: 0.15, f0: 3500, scrape: [7000, 3200], len: 0.13 } });
        },
    },
    // Kasai's 1,1,1 finisher, a fiery stab: punched in, the blade tearing
    // through, and the flames bursting out of it
    kasai_stab: {
        seconds: 1.1,
        peak: 0.7,
        build(out, sr, rand) {
            // The impact
            tone(out, sr, { freq: glide(140, 48, 0.08), amp: 0.9, env: hit(0.06) });
            noise(out, sr, { amp: 0.6, env: hit(0.03), filter: { type: "band", freq: 700, q: 1.2 }, rand });
            // The blade going in: a short, piercing tear that drops in pitch
            noise(out, sr, { amp: 0.9, env: swell(0.05, 0.15), filter: { type: "band", freq: glide(6500, 1500, 0.05), q: 1.6 }, rand });
            noise(out, sr, { amp: 0.6, env: hit(0.18, 0.02), start: 0.02, filter: { type: "low", freq: 220 }, rand }); // the fwoomp
            sizzle(out, sr, rand, { amp: 0.35, tau: 0.25, start: 0.06, crackles: 6, spread: 0.5 });
            drive(out, 2.4);
            echo(out, sr, 0.08, 0.18);
            // The flames bursting out of the wound: big and long (clean, after the grit)
            flame(out, sr, rand, { amp: 1.3, start: 0.02, len: 0.75 });
            // The slash, kept clean on top (added after the grit and echo): lower and
            // heavier than the 1's, the ring lasting a little longer
            kasaiSlash(out, sr, rand, { blade: { amp: 1.1, ring: 0.22, f0: 2650, scrape: [2200, 5600], len: 0.12 }, fire: 0.5, start: 0.01 });
        },
    },
    // Kasai's fire blade
    fire: {
        seconds: 0.55,
        peak: 0.5,
        build(out, sr, rand) {
            // Roar: noise with a fluttering amplitude, sweeping down
            const flutter = (t) => swell(0.55, 0.25)(t) * (0.65 + 0.35 * Math.sin(t * TAU * 23) * Math.sin(t * TAU * 7.3));
            noise(out, sr, { amp: 1, env: flutter, filter: { type: "low", freq: glide(2600, 700, 0.5), q: 0.9 }, rand });
            noise(out, sr, { amp: 0.5, env: swell(0.4, 0.3), filter: { type: "band", freq: glide(500, 3200, 0.4), q: 1.5 }, rand });
            // Crackles
            for (let i = 0; i < 14; i++) {
                const start = 0.05 + rand() * 0.4;
                noise(out, sr, { amp: 0.5 + rand() * 0.5, env: hit(0.003, 0.0003), start, dur: 0.02, filter: { type: "high", freq: 3000 }, rand });
            }
            drive(out, 1.5);
        },
    },
    // COUNTER / PUNISH callout
    counter: {
        seconds: 1.0,
        peak: 0.38,
        build(out, sr) {
            metal(out, sr, 1046, [1, 2.0, 3.01, 4.2], [1, 0.45, 0.25, 0.12], [0.35, 0.22, 0.12, 0.07]);
            metal(out, sr, 1568, [1, 2.0], [0.7, 0.3], [0.3, 0.15], 1, 0.06);
        },
    },
    // Round intro: a war drum on each READY heartbeat...
    drum: {
        seconds: 1.1,
        peak: 0.65,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(115, 62, 0.12), amp: 1, env: hit(0.2) });
            tone(out, sr, { freq: glide(230, 120, 0.05), amp: 0.3, env: hit(0.05) });
            noise(out, sr, { amp: 0.5, env: hit(0.04), filter: { type: "low", freq: 900 }, rand });
            noise(out, sr, { amp: 0.25, env: hit(0.01), filter: { type: "band", freq: 2500, q: 1 }, rand });
            drive(out, 1.8);
            echo(out, sr, 0.16, 0.25);
        },
    },
    // ...and a huge hit on FIGHT!
    fight: {
        seconds: 2.6,
        peak: 0.95,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(100, 30, 0.4), amp: 1.2, env: hit(0.4) });
            tone(out, sr, { freq: glide(200, 60, 0.1), amp: 0.5, env: hit(0.08) });
            noise(out, sr, { amp: 1, env: hit(0.25), filter: { type: "band", freq: glide(3200, 300, 0.5), q: 0.8 }, rand });
            noise(out, sr, { amp: 0.35, env: hit(0.6), filter: { type: "high", freq: 5000 }, rand });
            metal(out, sr, 196, [1, 2.4, 3.9, 5.2], [0.5, 0.3, 0.2, 0.15], [0.8, 0.5, 0.3, 0.2], 0.6);
            drive(out, 2.6);
            echo(out, sr, 0.18, 0.3);
        },
    },
    // The knockout blow
    ko: {
        seconds: 3.6,
        peak: 1,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(90, 24, 0.7), amp: 1.3, env: hit(0.6) });
            tone(out, sr, { freq: glide(180, 45, 0.25), amp: 0.6, env: hit(0.18) });
            noise(out, sr, { amp: 1, env: hit(0.1), filter: { type: "band", freq: glide(4000, 300, 0.4), q: 0.8 }, rand });
            noise(out, sr, { amp: 0.7, env: hit(0.6), filter: { type: "low", freq: glide(1500, 150, 1) }, rand });
            noise(out, sr, { amp: 0.25, env: hit(0.9), filter: { type: "high", freq: 4500 }, rand });
            drive(out, 3);
            echo(out, sr, 0.24, 0.35);
        },
    },
    // Time over: a low gong
    gong: {
        seconds: 5,
        peak: 0.8,
        build(out, sr, rand) {
            metal(out, sr, 98, [1, 1.47, 2.09, 2.56, 3.42, 4.1], [1, 0.7, 0.55, 0.4, 0.3, 0.2], [1.4, 1.1, 0.8, 0.6, 0.4, 0.3]);
            tone(out, sr, { freq: glide(120, 60, 0.1), amp: 0.6, env: hit(0.1) });
            noise(out, sr, { amp: 0.4, env: hit(0.03), filter: { type: "low", freq: 1500 }, rand });
            drive(out, 1.6);
        },
    },
    // Last ten seconds of the clock
    clock: {
        seconds: 0.12,
        peak: 0.3,
        build(out, sr, rand) {
            tone(out, sr, { freq: 1500, amp: 0.6, env: hit(0.015), wave: "tri" });
            noise(out, sr, { amp: 0.5, env: hit(0.004, 0.0003), filter: { type: "band", freq: 3500, q: 3 }, rand });
        },
    },
    // Menus
    menu_move: {
        seconds: 0.09,
        peak: 0.28,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(500, 700, 0.03), amp: 0.7, env: hit(0.025), wave: "tri" });
            noise(out, sr, { amp: 0.4, env: hit(0.006, 0.0003), filter: { type: "band", freq: 3000, q: 2 }, rand });
        },
    },
    menu_select: {
        seconds: 0.8,
        peak: 0.5,
        build(out, sr, rand) {
            // A drum hit under a sword-like ring
            tone(out, sr, { freq: glide(140, 70, 0.08), amp: 1, env: hit(0.1) });
            noise(out, sr, { amp: 0.6, env: hit(0.03), filter: { type: "band", freq: glide(2500, 700, 0.1), q: 1 }, rand });
            metal(out, sr, 880, [1, 2.71, 4.8], [0.5, 0.25, 0.12], [0.3, 0.16, 0.08], 0.6, 0.01);
            drive(out, 1.8);
        },
    },
    menu_back: {
        seconds: 0.16,
        peak: 0.3,
        build(out, sr, rand) {
            tone(out, sr, { freq: glide(520, 300, 0.08), amp: 0.7, env: hit(0.05), wave: "tri" });
            noise(out, sr, { amp: 0.3, env: hit(0.01), filter: { type: "low", freq: 1500 }, rand });
        },
    },
};

export const RECIPES = {
    ...RECIPES_BASE,
    // 1, 1,1, 1,1,1: the ring drops in pitch and rings longer as the string gets heavier
    dom_hit_light: domHit("hit_light", { snaps: 1, splinters: 12, spread: 0.06 }, 0.9, 2.2, { f0: 640, amp: 0.35, decay: 0.12 }),
    dom_hit_medium: domHit("hit_medium", { snaps: 2, splinters: 22, spread: 0.11 }, 1.05, 2.8, { f0: 530, amp: 0.4, decay: 0.17 }),
    dom_hit_heavy: domHit("hit_heavy", { snaps: 3, splinters: 40, spread: 0.2 }, 1.25, 3.6, { f0: 445, amp: 0.45, decay: 0.24 }),
    dom_jump1: domHit("hit_medium", { snaps: 2, splinters: 20, spread: 0.1 }, 1, 2.8, { f0: 585, amp: 0.42, decay: 0.17 }),
    // 2: a deep, booming thud with a quick, low ring
    dom_standing2: domHit("hit_heavy", { snaps: 2, splinters: 24, spread: 0.12 }, 1.1, 3.4, { f0: 360, amp: 0.45, decay: 0.08 }, 0.9),
    dom_down1: domHit("hit_light", { snaps: 1, splinters: 10, spread: 0.05 }, 0.85, 2.2, { f0: 720, amp: 0.32, decay: 0.1 }),
};

/**
 * Render the synthesized ring that goes with a recorded sound (Dom's iron),
 * at the same level it has inside the synthesized version. Null if the
 * sound has none.
 * @returns {Float32Array|null}
 */
export function renderRing(name, sampleRate) {
    const r = RECIPES[name];
    if (!r?.ringBuild) return null;
    // The synthesized sound gets scaled to `peak` as a whole; scale the ring by the same amount
    const full = buildRaw(name, sampleRate);
    let max = 0;
    for (let i = 0; i < full.length; i++) max = Math.max(max, Math.abs(full[i]));
    const out = new Float32Array(Math.ceil(r.seconds * sampleRate));
    r.ringBuild(out, sampleRate);
    const scale = max > 0 ? r.peak / max : r.peak;
    for (let i = 0; i < out.length; i++) out[i] *= scale;
    const fade = Math.min(out.length, Math.round(0.03 * sampleRate));
    for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= (i / fade) ** 2;
    return out;
}

/**
 * Render one sound.
 * @returns {Float32Array} mono samples at `sampleRate`
 */
export function renderSfx(name, sampleRate) {
    const out = buildRaw(name, sampleRate);
    normalize(out, sampleRate, RECIPES[name].peak);
    return out;
}

/** A recipe's samples before normalizing. */
function buildRaw(name, sampleRate) {
    const r = RECIPES[name];
    const out = new Float32Array(Math.ceil(r.seconds * sampleRate));
    // Seed from the name so every sound has its own, repeatable noise
    let seed = 0;
    for (const c of name) seed = (seed * 31 + c.charCodeAt(0)) | 0;
    r.build(out, sampleRate, seeded(seed));
    return out;
}
