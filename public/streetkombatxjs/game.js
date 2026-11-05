// game.js – main entry and game loop

import { State } from "./states/State.js";
import { IntroState } from "./states/IntroState.js";
import { KeyManager } from "./input/KeyManager.js";
import { Assets } from "./gfx/Assets.js";
import { ImageLoader } from "./gfx/ImageLoader.js";
import { Sound } from "./audio/Sound.js";

const WIDTH = 1280;
const HEIGHT = 720;
const TICKS_PER_SECOND = 60;
const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

class Game {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;

        this.keyManager = new KeyManager();

        this.running = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.tickRate = MS_PER_TICK;
    }

    getKeyManager() {
        return this.keyManager;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    // Drawn directly on the canvas while assets download (before any State exists)
    renderLoading(fraction) {
        const { ctx, width, height } = this;
        // Same black backdrop, logo reds, and left-aligned poster layout as the HTML start screen
        const pad = 64;
        const barHeight = 16;
        const barWidth = width - pad * 2;
        const barY = height - pad - barHeight;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#c00000"; // lifted logo red (readable on black)
        ctx.font = '800 44px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(`Loading ${Math.floor(fraction * 100)}%`, pad, barY - 14);

        ctx.fillStyle = "#c00000";
        ctx.fillRect(pad, barY, barWidth * fraction, barHeight);

        ctx.strokeStyle = "#600000"; // logo red
        ctx.lineWidth = 2;
        ctx.strokeRect(pad - 1, barY - 1, barWidth + 2, barHeight + 2);

        // Restore defaults the game states expect
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
    }

    /**
     * Load the intro logos (quick), start the intro, and load everything else
     * in the background while the logos play. The intro speeds up once
     * loading finishes, and waits on its last logo if loading is slow.
     */
    async init() {
        ImageLoader.track(Assets.INTRO_IMAGE_COUNT, (fraction) => this.renderLoading(fraction));
        await Assets.loadIntro();

        const intro = new IntroState(this);
        State.setState(intro);
        ImageLoader.track(Assets.IMAGE_COUNT, (fraction) => (intro.progress = fraction));
        Assets.init().then(
            () => {
                intro.loaded = true;
                this.startMusicOnGesture();
            },
            (err) => {
                console.error("Loading failed:", err);
                intro.failed = true;
            }
        );
    }

    startMusicOnGesture() {

        // Browsers block audio until a user gesture. Try now (works if the user
        // already interacted, e.g. clicked during loading); otherwise retry on
        // every gesture until play() actually succeeds. Some events (e.g.
        // Escape, or keys Safari doesn't count) aren't valid gestures, so the
        // listeners must stay until playback really starts.
        const gestureEvents = ["pointerdown", "keydown", "touchend", "click"];
        const stopListening = () =>
            gestureEvents.forEach((type) => window.removeEventListener(type, resumeMusic));
        const resumeMusic = async () => {
            // If the player chose "muted", the sound toggle starts music later
            if (!Assets.soundEnabled) return stopListening();
            if (await Assets.playMenuMusic()) stopListening();
        };
        gestureEvents.forEach((type) => window.addEventListener(type, resumeMusic));
        resumeMusic();
    }



    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();

        const loop = (now) => {
            if (!this.running) return;

            // Cap the catch-up after a stall or background tab so the game
            // doesn't fast-forward dozens of ticks of input in one frame
            const delta = Math.min(now - this.lastTime, 250);
            this.lastTime = now;
            this.accumulator += delta;

            while (this.accumulator >= this.tickRate) {
                this.tick();
                this.accumulator -= this.tickRate;
            }

            this.render();
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    tick() {
        this.keyManager.tick();
        const state = State.getState();
        if (state) {
            state.tick();
        }
    }

    render() {
        const state = State.getState();
        if (!state) return;

        this.ctx.clearRect(0, 0, this.width, this.height);
        state.render(this.ctx);
    }
}

const game = new Game(ctx, WIDTH, HEIGHT);

// Browsers keep audio suspended until a gesture; any key or click wakes it
window.addEventListener("pointerdown", () => Sound.unlock());

window.addEventListener("keydown", (e) => {
    Sound.unlock();
    const km = game.getKeyManager();
    // While playing, game keys must not scroll the page or trigger browser
    // shortcuts (e.g. "/" opens Quick Find in Firefox). Leave Cmd/Ctrl combos alone.
    if (game.running && km.isGameKey(e) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
    }
    km.onKeyDown(e);
});

window.addEventListener("keyup", (e) => {
    game.getKeyManager().onKeyUp(e);
});

// Key-ups are never delivered while the tab is unfocused, which left fighters
// walking or blocking forever after an alt-tab. Release everything instead.
window.addEventListener("blur", () => game.getKeyManager().releaseAll());
document.addEventListener("visibilitychange", () => {
    if (document.hidden) game.getKeyManager().releaseAll();
});

// ---------- Page chrome: start screen, sound toggle, fullscreen ----------

const startScreen = document.getElementById("startScreen");
const soundToggle = document.getElementById("soundToggle");
const fullscreenToggle = document.getElementById("fullscreenToggle");
const stage = document.getElementById("stage");

function updateSoundToggle() {
    const on = Assets.soundEnabled;
    soundToggle.setAttribute("aria-pressed", String(on));
    document.getElementById("soundLabel").textContent = on ? "Sound on" : "Muted";
    // <svg> has no .hidden property, so set the attribute directly
    document.getElementById("soundOnIcon").toggleAttribute("hidden", !on);
    document.getElementById("soundOffIcon").toggleAttribute("hidden", on);
}

// Page buttons must not keep focus, or Enter/Space in the game would click them
function releaseFocus(button) {
    button.blur();
    canvas.focus?.();
}

// Sound is on by default; the header toggle works before and during the game
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", async () => {
    const button = startButton;
    // Inside the click itself, so the browser allows sound
    Sound.unlock();
    startScreen.hidden = true;
    releaseFocus(button);

    // Make sure the game font is ready before anything is drawn with it
    await Promise.all([
        document.fonts.load('50px "DragonForcE"'),
        document.fonts.load('800 44px "Sofia Sans Condensed"'),
    ]).catch(() => {});

    await game.init();
    Sound.preload();
    game.start();
});

soundToggle.addEventListener("click", () => {
    Assets.setSoundEnabled(!Assets.soundEnabled);
    updateSoundToggle();
    releaseFocus(soundToggle);
});

fullscreenToggle.addEventListener("click", () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        stage.requestFullscreen?.();
    }
    releaseFocus(fullscreenToggle);
});

if (!document.fullscreenEnabled) fullscreenToggle.hidden = true;

