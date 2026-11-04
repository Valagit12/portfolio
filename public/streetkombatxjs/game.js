// game.js – main entry and game loop

import { State } from "./states/State.js";
import { IntroState } from "./states/IntroState.js";
import { KeyManager } from "./input/KeyManager.js";
import { Assets } from "./gfx/Assets.js";

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

    async init() {
        if (typeof Assets.loadAll === "function") {
            await Assets.loadAll();
        } else if (typeof Assets.init === "function") {
            await Assets.init();
        }


        Assets.playMenuMusic();

        // Fallback: if the browser blocks autoplay, start on first click or key
        const resumeMusic = () => {
            if (typeof Assets.playMenuMusic === "function") {
                Assets.playMenuMusic();
            }
            window.removeEventListener("click", resumeMusic);
            window.removeEventListener("keydown", resumeMusic);
        };

        window.addEventListener("click", resumeMusic, { once: true });
        window.addEventListener("keydown", resumeMusic, { once: true });

        State.setState(new IntroState(this));
    }



    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();

        const loop = (now) => {
            if (!this.running) return;

            const delta = now - this.lastTime;
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

window.addEventListener("keydown", (e) => {
    game.getKeyManager().onKeyDown(e);
});

window.addEventListener("keyup", (e) => {
    game.getKeyManager().onKeyUp(e);
});

(async () => {
    await game.init();
    game.start();
})();

