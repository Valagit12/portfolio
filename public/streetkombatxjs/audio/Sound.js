// ./audio/Sound.js
//
// Plays the sound effects through Web Audio, which starts instantly and lets
// many sounds overlap, unlike <audio> elements.
//
// The sounds are CC0 recordings in res/sfx/ (one .mp3 per name, mixed from
// the packs listed in res/sfx/CREDITS.md). They download in the background
// during the intro. Until a file has arrived, or if it fails to load, the
// synthesized version of the same name (see sfx.js) plays instead.
//
//   Sound.unlock()                      call from a click / key press
//   Sound.play("hit_heavy", { pan })    fire and forget
//
// Browsers only allow audio after a user gesture, so nothing plays until
// unlock() has run inside one. Muting uses the header's sound toggle
// (Assets.soundEnabled), the same switch as the menu music.

import { Assets } from "../gfx/Assets.js";
import { RECIPES, renderSfx, renderRing } from "./sfx.js";

const VOLUME = 0.8;
// The same sound twice within this many seconds plays once (e.g. a trade
// where both fighters get hit on the same tick)
const MIN_GAP = 0.03;
const SFX_DIR = "./res/sfx/";

export const Sound = {
    ctx: null,
    out: null,
    buffers: {}, // synthesized fallbacks
    recorded: {}, // decoded recordings from res/sfx/
    rings: {}, // Dom's synthesized iron ring, played over his recorded hits
    loading: null,
    lastPlayed: {},

    /** Create / resume the audio context. Safe to call on every gesture. */
    unlock() {
        if (!Sound.ctx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return; // no Web Audio: play silently
            Sound.ctx = new Ctx();
            Sound.out = Sound.ctx.createGain();
            Sound.out.gain.value = VOLUME;
            // A gentle limiter so stacked hits don't clip
            const limiter = Sound.ctx.createDynamicsCompressor();
            limiter.threshold.value = -6;
            limiter.knee.value = 6;
            limiter.ratio.value = 8;
            limiter.attack.value = 0.002;
            limiter.release.value = 0.12;
            Sound.out.connect(limiter).connect(Sound.ctx.destination);
        }
        if (Sound.ctx.state === "suspended") Sound.ctx.resume().catch(() => {});
    },

    /** The recording if it has loaded, otherwise the synthesized stand-in. */
    _buffer(name) {
        if (Sound.recorded[name]) return Sound.recorded[name];
        if (!Sound.buffers[name]) {
            const sr = Sound.ctx.sampleRate;
            const data = renderSfx(name, sr);
            const buffer = Sound.ctx.createBuffer(1, data.length, sr);
            buffer.getChannelData(0).set(data);
            Sound.buffers[name] = buffer;
        }
        return Sound.buffers[name];
    },

    /** Start downloading every recording (once). Resolves when all have settled. */
    preload() {
        if (!Sound.ctx) return Promise.resolve();
        Sound.loading ??= Promise.all(Object.keys(RECIPES).map((name) => Sound._load(name)));
        return Sound.loading;
    },

    /** The ring to layer over a recording, or null (see renderRing in sfx.js). */
    _ring(name) {
        if (!(name in Sound.rings)) {
            const sr = Sound.ctx.sampleRate;
            const data = renderRing(name, sr);
            let buffer = null;
            if (data) {
                buffer = Sound.ctx.createBuffer(1, data.length, sr);
                buffer.getChannelData(0).set(data);
            }
            Sound.rings[name] = buffer;
        }
        return Sound.rings[name];
    },

    /** Download a file, trying again a couple of times on a flaky connection. */
    async _fetch(url, tries = 3) {
        for (let i = 1; ; i++) {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.arrayBuffer();
            } catch (err) {
                if (i >= tries) throw err;
                await new Promise((r) => setTimeout(r, 300 * i));
            }
        }
    },

    async _load(name) {
        try {
            const buffer = await Sound.ctx.decodeAudioData(await Sound._fetch(`${SFX_DIR}${name}.mp3`));
            // Same level as the synthesized version, so the mix stays balanced
            const data = buffer.getChannelData(0);
            let max = 0;
            for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
            const scale = max > 0 ? RECIPES[name].peak / max : 1;
            for (let c = 0; c < buffer.numberOfChannels; c++) {
                const ch = buffer.getChannelData(c);
                for (let i = 0; i < ch.length; i++) ch[i] *= scale;
            }
            Sound.recorded[name] = buffer;
        } catch (err) {
            console.warn(`Sound "${name}" didn't load; using the synthesized one`, err);
        }
    },

    /**
     * Play a sound.
     * @param {string} name - a key of RECIPES
     * @param {object} [o]
     * @param {number} [o.volume=1]
     * @param {number} [o.pan=0] - -1 (left) .. 1 (right)
     * @param {number} [o.pitch=0] - semitones; a little random spread is always added
     * @param {number} [o.delay=0] - seconds from now
     */
    play(name, { volume = 1, pan = 0, pitch = 0, delay = 0 } = {}) {
        const ctx = Sound.ctx;
        if (!ctx || ctx.state !== "running" || !Assets.soundEnabled || !RECIPES[name]) return;
        const when = ctx.currentTime + delay;
        if (when - (Sound.lastPlayed[name] ?? -1) < MIN_GAP) return;
        Sound.lastPlayed[name] = when;

        // Volume and pan, shared by the sound and (for Dom) its ring
        let input = Sound.out;
        if (pan && ctx.createStereoPanner) {
            const panner = ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, pan));
            panner.connect(input);
            input = panner;
        }
        if (volume !== 1) {
            const gain = ctx.createGain();
            gain.gain.value = volume;
            gain.connect(input);
            input = gain;
        }

        // ±0.6 semitone of variety so repeated hits don't sound machine-gunned
        const rate = Math.pow(2, (pitch + (Math.random() - 0.5) * 1.2) / 12);
        const start = (buffer) => {
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.playbackRate.value = rate;
            src.connect(input);
            src.start(when);
        };
        start(Sound._buffer(name));
        // Recorded Dom hits keep his synthesized iron ring on top (the synthesized versions already have it)
        if (Sound.recorded[name]) {
            const ring = Sound._ring(name);
            if (ring) start(ring);
        }
    },
};
