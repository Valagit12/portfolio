// ./players/Cpu.js
//
// A simple, beatable computer opponent. It plays by pressing the same
// buttons a person would (virtual keys in KeyManager), so every input rule
// (buffering, chains, dashes) applies to it unchanged.
//
// On purpose it is slow and makes mistakes:
//   - it only rethinks every REPLAN ticks (about a third to half a second)
//   - it notices an attack REACTION ticks late, and only tries to block
//     BLOCK_CHANCE of the time, so fast moves usually land
//   - its attacks are picked at random from what's in range
//
// GameState creates one when the menu's CPU setting is on, and calls
// tick(active) every fighting tick, before the fighters update.

import { HEIGHT } from "./moves.js";

const REPLAN = [18, 36];
const REACTION = [14, 24];
const BLOCK_CHANCE = 0.45;
const BLOCK_TICKS = [20, 32];
const ATTACK_RANGE = 230; // center to center; fighters pressed together are 120 apart

const between = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
const chance = (p) => Math.random() < p;

export class Cpu {
    /**
     * @param {KeyManager} km
     * @param {Player} self - the fighter the CPU controls
     * @param {Player} foe
     */
    constructor(km, self, foe) {
        this.km = km;
        this.self = self;
        this.foe = foe;
        this.n = self.playerNum;
        this.t = 0;

        this.held = new Set(); // actions currently held down
        this.taps = new Map(); // action -> tick to let go of a button press
        this.queue = []; // [{ at, run }] steps of a planned move

        this.nextPlan = 40; // a moment after FIGHT before it starts
        this.walk = 0; // +1 forward, -1 back
        this.walkUntil = 0;
        this.crouchUntil = 0;
        this.blockUntil = 0;
        this.blockLow = false;
        this.reactAt = null;
        this.lastFoeMove = null;
    }

    /** @param {boolean} active - false before FIGHT and after the round ends: hands off the controls */
    tick(active) {
        this.t++;
        if (!active) {
            this.queue = [];
            this._sync(new Set());
            return;
        }
        const me = this.self;
        const reeling = me.hitstun > 0 || !!me.knockdown || me.ko;

        this._watchFoe();

        // Planned button presses
        for (const step of this.queue.filter((s) => s.at <= this.t)) step.run();
        this.queue = this.queue.filter((s) => s.at > this.t);

        if (!reeling && this.t >= this.nextPlan && this.t >= this.blockUntil) this._plan();

        // What to hold this tick
        const want = new Set();
        const fwd = me.forwardDir() > 0 ? "right" : "left";
        const back = fwd === "right" ? "left" : "right";
        if (this.t < this.blockUntil) {
            want.add(this.blockLow ? "down" : "block");
        } else {
            if (this.t < this.walkUntil) want.add(this.walk > 0 ? fwd : back);
            if (this.t < this.crouchUntil) want.add("down");
        }
        for (const [action, until] of this.taps) {
            if (this.t < until) want.add(action);
            else this.taps.delete(action);
        }
        this._sync(want);
    }

    // ---------- Seeing the opponent ----------

    /** Spot the foe starting an attack, and (sometimes, late) put up the right guard. */
    _watchFoe() {
        const foe = this.foe;
        if (foe.move && foe.move !== this.lastFoeMove && this._distance() < ATTACK_RANGE + 120 && chance(BLOCK_CHANCE)) {
            this.reactAt = this.t + between(REACTION);
        }
        this.lastFoeMove = foe.move;

        if (this.reactAt !== null && this.t >= this.reactAt) {
            this.reactAt = null;
            // Only if it's still coming: guard low against lows, standing otherwise
            if (foe.move) {
                const hits = foe.hitsFor(foe.move);
                this.blockLow = hits.some((h) => h.height === HEIGHT.LOW);
                this.blockUntil = this.t + between(BLOCK_TICKS);
                this.queue = []; // drop whatever it was about to do
                this.walkUntil = 0;
                this.crouchUntil = 0;
            }
        }
    }

    _distance() {
        return Math.abs(this.self.centerX() - this.foe.centerX());
    }

    // ---------- Deciding ----------

    _plan() {
        this.nextPlan = this.t + between(REPLAN);
        const d = this._distance();
        const r = Math.random();

        if (d > ATTACK_RANGE) {
            if (r < 0.75) this._walk(1, between([20, 40]));
            else if (r < 0.87) this._jumpIn();
            // otherwise wait
            return;
        }

        if (r < 0.55) this._attack();
        else if (r < 0.75) this._walk(-1, between([12, 24]));
        // otherwise wait a beat
    }

    _attack() {
        const r = Math.random();
        if (r < 0.35) {
            // 1, and sometimes the rest of the string
            this._press("one");
            if (chance(0.5)) {
                this._press("one", 7);
                if (this.self.canCancelComboIntoSpecial && chance(0.3)) this._press("special", 16);
                else if (chance(0.4)) this._press("one", 14);
            }
        } else if (r < 0.55) {
            this._press("two");
        } else if (r < 0.7) {
            this.crouchUntil = this.t + 14;
            this._press("one", 1);
        } else if (r < 0.85) {
            this.crouchUntil = this.t + 16;
            this._press("two", 1);
        } else {
            this._press("special");
        }
    }

    _walk(dir, ticks) {
        this.walk = dir;
        this.walkUntil = this.t + ticks;
    }

    /** Jump toward them and swing on the way down. */
    _jumpIn() {
        this._walk(1, 30);
        this._press("up");
        this._press(chance(0.5) ? "one" : "two", 16);
    }

    // ---------- Buttons ----------

    /** Tap a button `delay` ticks from now (held for 2 ticks, like a quick press). */
    _press(action, delay = 0) {
        this.queue.push({
            at: this.t + delay,
            run: () => {
                // A fresh press needs the key up first
                if (this.held.has(action)) {
                    this.km.cpuUp(this.n, action);
                    this.held.delete(action);
                }
                this.km.cpuDown(this.n, action);
                this.held.add(action);
                this.taps.set(action, this.t + 2);
            },
        });
    }

    /** Hold exactly the actions in `want`, pressing and letting go as needed. */
    _sync(want) {
        for (const action of this.held) {
            if (!want.has(action)) {
                this.km.cpuUp(this.n, action);
                this.held.delete(action);
            }
        }
        for (const action of want) {
            if (!this.held.has(action)) {
                this.km.cpuDown(this.n, action);
                this.held.add(action);
            }
        }
    }
}
