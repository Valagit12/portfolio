// ./states/IntroState.js
//
// The two intro logos, shown while the rest of the game loads (game.js
// starts Assets.init() in the background and reports into `progress` /
// `loaded` / `failed`). Each logo fades in, holds and fades out. While
// loading, they play at full length; once loading is done, whatever is left
// plays fast, and Enter skips straight to the menu. If loading is slow, the
// last logo stays up with a progress bar until it finishes.

import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { MenuState } from "./MenuState.js";

// Ticks (60 per second) for each logo's fade in / hold / fade out
const PACE = {
    loading: { in: 30, hold: 150, out: 30 },
    loaded: { in: 10, hold: 20, out: 10 },
};

// The progress bar only appears if loading takes a moment
const BAR_DELAY = 45;

export class IntroState extends State {
    constructor(game) {
        super(game);
        this.logos = [Assets.loading1, Assets.loading2];
        this.index = 0;
        this.phase = "in";
        this.t = 0;
        this.age = 0;

        // Set by game.js as the background load runs
        this.progress = 0;
        this.loaded = false;
        this.failed = false;

        this.previousEnter = true; // the Enter that pressed "Start game" doesn't skip
    }

    tick() {
        this.age++;
        this.t++;

        const enter = this.game.getKeyManager().isEnter();
        const skip = this.loaded && enter && !this.previousEnter;
        this.previousEnter = enter;
        if (skip) return this._toMenu();

        const pace = this.loaded ? PACE.loaded : PACE.loading;
        const last = this.index === this.logos.length - 1;

        if (this.phase === "in" && this.t >= pace.in) {
            this._enter("hold");
        } else if (this.phase === "hold" && this.t >= pace.hold && (this.loaded || !last)) {
            // The last logo waits here until loading is done
            this._enter("out");
        } else if (this.phase === "out" && this.t >= pace.out) {
            if (last) return this._toMenu();
            this.index++;
            this._enter("in");
        }
    }

    _enter(phase) {
        this.phase = phase;
        this.t = 0;
    }

    _toMenu() {
        State.setState(new MenuState(this.game));
    }

    _alpha() {
        const pace = this.loaded ? PACE.loaded : PACE.loading;
        if (this.phase === "in") return Math.min(1, this.t / pace.in);
        if (this.phase === "out") return Math.max(0, 1 - this.t / pace.out);
        return 1;
    }

    render(ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 1280, 720);

        ctx.globalAlpha = this._alpha();
        ctx.drawImage(this.logos[this.index], 0, 0, 1280, 720);
        ctx.globalAlpha = 1;

        if (this.failed) {
            this._message(ctx, "Couldn't load the game. Refresh the page to try again.");
        } else if (!this.loaded && this.age > BAR_DELAY) {
            // Thin bar along the bottom edge
            const w = 1280 - 128;
            ctx.fillStyle = "#300000";
            ctx.fillRect(64, 690, w, 6);
            ctx.fillStyle = "#c00000";
            ctx.fillRect(64, 690, w * this.progress, 6);
        }
    }

    _message(ctx, text) {
        ctx.font = '600 22px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(text, 1280 - 64, 720 - 24);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
    }
}
