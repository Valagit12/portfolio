// ./audio/Sound.js
//
// Plays the synthesized sound effects (see sfx.js) through Web Audio, which
// starts instantly and lets many sounds overlap, unlike <audio> elements.
//
//   Sound.unlock()                      call from a click / key press
//   Sound.play("hit_heavy", { pan })    fire and forget
//
// Browsers only allow audio after a user gesture, so nothing plays until
// unlock() has run inside one. Muting uses the header's sound toggle
// (Assets.soundEnabled), the same switch as the menu music.

import { Assets } from "../gfx/Assets.js";
import { RECIPES, renderSfx } from "./sfx.js";

const VOLUME = 0.8;
// The same sound twice within this many seconds plays once (e.g. a trade
// where both fighters get hit on the same tick)
const MIN_GAP = 0.03;

export const Sound = {
    ctx: null,
    out: null,
    buffers: {},
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

    /** Build a sound's buffer the first time it's needed (a few ms each). */
    _buffer(name) {
        if (!Sound.buffers[name]) {
            const sr = Sound.ctx.sampleRate;
            const data = renderSfx(name, sr);
            const buffer = Sound.ctx.createBuffer(1, data.length, sr);
            buffer.getChannelData(0).set(data);
            Sound.buffers[name] = buffer;
        }
        return Sound.buffers[name];
    },

    /** Render every sound now, so the first hit of a match doesn't stall. */
    preload() {
        if (!Sound.ctx) return;
        for (const name of Object.keys(RECIPES)) Sound._buffer(name);
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

        const src = ctx.createBufferSource();
        src.buffer = Sound._buffer(name);
        // ±0.6 semitone of variety so repeated hits don't sound machine-gunned
        src.playbackRate.value = Math.pow(2, (pitch + (Math.random() - 0.5) * 1.2) / 12);

        let node = src;
        if (volume !== 1) {
            const gain = ctx.createGain();
            gain.gain.value = volume;
            node = node.connect(gain);
        }
        if (pan && ctx.createStereoPanner) {
            const panner = ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, pan));
            node = node.connect(panner);
        }
        node.connect(Sound.out);
        src.start(when);
    },
};
