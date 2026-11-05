// ./players/Player.js

import { Assets } from "../gfx/Assets.js";
import { drawFrame } from "../gfx/SpriteSheet.js";
import { drawFireBlade } from "../gfx/Effects.js";
import {
    CHAIN_WINDOW,
    COMMON_MOVES,
    DASH,
    DOUBLE_TAP_TICKS,
    HURTBOXES,
    JUGGLE,
    JUMP,
    KNOCKDOWN,
    LEVEL,
    LIMB_INSET,
    RUN,
    STRING_MOVES,
} from "./moves.js";

const WALK_SPEED = 5; // px per tick

// Hit flash length in ticks: normal, and the harsher red one on a KO'd fighter
const FLASH_TICKS = 3;
const KO_FLASH_TICKS = 12;
// Swing sound for each strength of hit
const WHOOSH = { light: "whoosh_light", medium: "whoosh_light", heavy: "whoosh_heavy", special: "whoosh_special" };

// Starting health for every fighter (the health bars scale to it)
export const MAX_HEALTH = 400;

// Shared fighter logic for Dom and Kasai.
//
// One move runs at a time (`this.move`), timed in ticks by `this.moveTick`.
// Hitstun and blockstun are explicit timers set by Combat when a hit
// connects. A fighter can act only when they have no move, recovery,
// hitstun or blockstun, which is what makes frame advantage exact.
export class Player {
    /**
     * @param {Game} game
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} playerNum 1 or 2 (player 1 starts on the left)
     */
    constructor(game, x, y, width, height, playerNum) {
        this.playerNum = playerNum;
        this.x = x;
        this.y = y;
        this.yInitial = y;
        this.width = width;
        this.height = height;
        this.game = game;

        this.health = MAX_HEALTH;
        this.charTitle = "";

        // Move state
        this.moves = { ...STRING_MOVES, ...COMMON_MOVES }; // subclasses add `special`
        this.stringHits = []; // subclasses set their 1 / 1,1 / 1,1,1 hits
        this.canCancelComboIntoSpecial = false;
        this.move = null;
        this.moveTick = 0;
        this.lastMove = null;
        this.recovery = 0;
        this.contacts = new Set(); // hit ids that connected (hit or block) this move / string
        this.landed = new Set(); // the ones of those that hit (not blocked)
        this.firedFx = new Set(); // move effects already spawned this move / string

        // Being hit / blocking
        this.hitstun = 0;
        this.blockstun = 0;
        this.guard = null; // "stand" | "crouch" while in blockstun
        this.reaction = null; // { level, tick } while reeling
        this.ko = false;

        // Facing: +1 right, -1 left. Each player's sprite sheet is drawn facing
        // `nativeFacing`; frames are mirrored when facing the other way.
        this.nativeFacing = playerNum === 1 ? 1 : -1;
        this.facing = this.nativeFacing;

        // Movement
        this.slide = 0; // pushback still to travel (px)
        this.slideDir = -this.facing; // screen direction of the pushback
        this.isJumping = false; // airborne from a jump
        this.jumpSquat = 0; // pre-jump ticks left (still on the ground)
        this.jumpDir = 0; // screen direction chosen at takeoff
        this.landLag = 0; // landing ticks left
        this.jumpTick = 0;
        this.vx = 0;
        this.vy = 0;
        this.airAttackUsed = false;
        this.isBlocking = false;
        this.isCrouching = false;
        this.guardHeld = false; // block button down (stops turning, so cross-ups work)
        this.isWalkingLeft = false;
        this.isWalkingRight = false;
        this.canActThisTick = false;
        this.dash = null; // { type: "forward" | "back", dir: screen direction, tick }
        this.running = false;
        this.runTick = 0;
        this.brake = 0; // skid ticks left after a run
        this.knockdown = null; // { phase: "air" | "down" | "getup", tick, vy, rot, dir, final }
        this.prevX = x;
        this.trail = []; // afterimages left by a dash
        this.dashTrail = null; // or an Effects trail kind ("powder", "fire") left instead of afterimages
        this.fireBlade = null; // Kasai: { anim: { reach, frames: { frame: [hiltX, hiltY, tipX, tipY] } } }
        this.fxEvents = []; // dust puffs etc. for GameState to draw

        // Hit feedback
        this.flash = 0;
        this.vibrate = 0;
        this.vibrateAmp = 0;
        this._flashCanvas = null;

        // Name tag polygon coordinates
        this.xNameTag_Player1 = [90, 260, 240, 110];
        this.yNameTag_Player1 = [110, 110, 160, 160];
        this.xNameTag_Player2 = [1020, 1190, 1170, 1040];
        this.yNameTag_Player2 = [110, 110, 160, 160];

        // Animations (assigned in subclasses)
        this.stance = null;
        this.walk_left = null;
        this.walk_right = null;
        this.block = null;
        this.crouch = null;
        this.jump = null;
        this.jump1 = null;
        this.jump2 = null;
        this.hit = null;
        this.down1 = null;
        this.down2 = null;
        this.standing2 = null;
        this.standing1 = null;
        this.standing11 = null;
        this.standing111 = null;
        this.special = null;
    }

    // ---------- Geometry ----------

    /** Screen direction this fighter faces: +1 right, -1 left. */
    forwardDir() {
        return this.facing;
    }

    centerX() {
        return this.x + this.width / 2;
    }

    /**
     * Turn to face the opponent, but only when free on the ground and not
     * holding block: you can't turn mid-move, mid-air or while guarding, which
     * is what lets cross-ups work.
     */
    faceToward(opponent) {
        const busy =
            this.isJumping || this.jumpSquat || this.move || this.dash || this.running || this.knockdown ||
            this.hitstun > 0 || this.blockstun > 0 || this.isBlocking || this.guardHeld || this.ko;
        if (busy) return;
        const dx = opponent.centerX() - this.centerX();
        if (Math.abs(dx) > 2) this.facing = Math.sign(dx);
    }

    isAirborne() {
        return this.isJumping;
    }

    /** Knocked down (unless juggled), or in a backdash's start-up: can't be hit. */
    isInvulnerable() {
        if (this.knockdown) return !this.isJuggled();
        return !!this.dash && this.dash.tick < DASH[this.dash.type].invulnerable;
    }

    /** Floating in a juggle: any hit pops them up again, until they land. */
    isJuggled() {
        const k = this.knockdown;
        return !!k && k.juggle && k.phase === "air";
    }

    // ---------- Boxes ----------

    /** Local [l, t, r, b] box (written facing right) → world rect for this fighter's side. */
    toWorld([l, t, r, b]) {
        const x0 = this.forwardDir() > 0 ? this.x + l : this.x + this.width - r;
        const x1 = this.forwardDir() > 0 ? this.x + r : this.x + this.width - l;
        return { x0, y0: this.y + t, x1, y1: this.y + b };
    }

    hurtboxes() {
        if (this.isInvulnerable()) return [];
        // Juggled: the body box turned with the sprite (flat once they've tipped
        // over), then padded on every side so juggles are easier to land
        if (this.knockdown) {
            const b = this._rotatedBox(HURTBOXES.air[0], this._pose());
            const { x, y } = JUGGLE.hurtboxPad;
            return [{ x0: b.x0 - x, y0: b.y0 - y, x1: b.x1 + x, y1: b.y1 + y }];
        }
        const pose = this.isJumping ? "air" : this.isCrouching ? "crouch" : "stand";
        const boxes = HURTBOXES[pose].map((b) => this.toWorld(b));
        // An attack's limb stays hittable from its first active frame until the move ends
        if (this.move) {
            const i = this.frameIndex();
            for (const h of this.hitsFor(this.move)) {
                if (i < h.frames[0]) continue;
                const [l, t, r, b] = h.box;
                boxes.push(this.toWorld([l, t + LIMB_INSET / 2, r - LIMB_INSET, b - LIMB_INSET / 2]));
            }
        }
        return boxes;
    }

    hitbox(hit) {
        return this.toWorld(hit.box);
    }

    /** Local box → world rect around it after the same turn _drawRotated gives the sprite. */
    _rotatedBox([l, t, r, b], { cx, cy, anchor, angle }) {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const xs = [];
        const ys = [];
        for (const [lx, ly] of [[l, t], [r, t], [l, b], [r, b]]) {
            const px = (lx - this.width / 2) * this.facing;
            const py = ly - anchor;
            xs.push(cx + px * cos - py * sin);
            ys.push(cy + px * sin + py * cos);
        }
        return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    }

    /** A point in the fighter's local box (facing right) → world coordinates. */
    toWorldPoint([lx, ly]) {
        return { x: this.forwardDir() > 0 ? this.x + lx : this.x + this.width - lx, y: this.y + ly };
    }

    /**
     * What getting hit right now would count as:
     *   "counter" - caught during an attack's start-up or active frames
     *   "punish"  - caught recovering (after the active frames, in recovery,
     *               landing, or the tail of a backdash)
     */
    hitState() {
        if (this.move) {
            const m = this.moveData();
            if (m.untilLanding) return "counter";
            const lastActive = Math.max(...this.hitsFor(this.move).map((h) => h.frames[1]));
            return this.frameIndex() <= lastActive ? "counter" : "punish";
        }
        if (this.recovery > 0 || this.landLag > 0) return "punish";
        if (this.dash && this.dash.type === "back") return "punish";
        return null;
    }

    // ---------- Move data helpers ----------

    moveData(key = this.move) {
        return key ? this.moves[key] : null;
    }

    hitsFor(key) {
        const m = this.moves[key];
        return m.hitCount ? this.stringHits.slice(0, m.hitCount) : m.hits;
    }

    frameIndex() {
        const m = this.moveData();
        const anim = this[m.anim];
        return Math.min(Math.floor(this.moveTick / anim.ticksPerFrame), anim.frames.length - 1);
    }

    /** The hit whose active frames are showing right now and hasn't connected yet. */
    activeHit() {
        if (!this.move || this.hitstun > 0 || this.ko) return null;
        const i = this.frameIndex();
        for (const h of this.hitsFor(this.move)) {
            if (!this.contacts.has(h.id) && i >= h.frames[0] && i <= h.frames[1]) return h;
        }
        return null;
    }

    /**
     * Ticks from now until this fighter's first tick of free action, assuming
     * no new input. Combat uses it to set exact hitstun / blockstun.
     * @param {string|null} landing - id of a hit about to land, counted as landed
     */
    ticksUntilActionable(landing = null) {
        let ticks = 0;
        const m = this.moveData();
        if (m && !m.untilLanding) {
            const duration = m.end * this[m.anim].ticksPerFrame;
            ticks = duration - this.moveTick + this._recovery(m, landing);
        } else if (!m) {
            ticks = this.recovery;
        }
        if (this.dash) ticks = Math.max(ticks, DASH[this.dash.type].speeds.length - this.dash.tick);
        if (this.isJumping || this.jumpSquat) {
            const landed = this.ticksUntilLanding() + JUMP.landing;
            if (m && m.air) {
                // Landing ends an air attack early: then only the landing counts
                const moveDone = m.untilLanding ? Infinity : m.end * this[m.anim].ticksPerFrame - this.moveTick;
                ticks = this.ticksUntilLanding() <= moveDone ? landed : Math.max(ticks, landed);
            } else {
                ticks = Math.max(ticks, landed);
            }
        }
        if (this.landLag) ticks = Math.max(ticks, this.landLag);
        return ticks;
    }

    /**
     * Recovery after `m`: `recoveryOnHit` when its last hit landed (or is
     * `landing` right now), so a move can be safer to follow up on hit
     * while staying just as punishable on block.
     */
    _recovery(m, landing = null) {
        if (m.recoveryOnHit === undefined) return m.recovery;
        const hits = m.hitCount ? this.stringHits.slice(0, m.hitCount) : m.hits;
        const last = hits[hits.length - 1].id;
        return this.landed.has(last) || landing === last ? m.recoveryOnHit : m.recovery;
    }

    /** Ticks until the feet touch down (includes any pre-jump squat left). */
    ticksUntilLanding() {
        if (!this.isJumping && !this.jumpSquat) return 0;
        let n = this.jumpSquat;
        let y = this.isJumping ? this.y : this.yInitial;
        let vy = this.isJumping ? this.vy : -JUMP.speed;
        for (let i = 0; i < 600; i++) {
            y += vy;
            vy += JUMP.gravity;
            n++;
            if (vy > 0 && y >= this.yInitial) return n;
        }
        return n;
    }

    // ---------- Per-tick update ----------

    tick() {
        const km = this.game.getKeyManager();
        const n = this.playerNum;
        const left = km.isHeld(n, "left");
        const right = km.isHeld(n, "right");
        const up = km.isHeld(n, "up");
        const down = km.isHeld(n, "down");
        const block = km.isHeld(n, "block");
        const forwardHeld = this.forwardDir() > 0 ? right : left;
        this.prevX = this.x;

        this.stance.tick();
        this.walk_left.tick();
        this.walk_right.tick();

        if (this.health <= 0) this.ko = true;

        // Pushback slide
        if (this.slide > 0) {
            const step = Math.min(this.slide, Math.max(1, Math.ceil(this.slide * 0.3)));
            this.x += this.slideDir * step;
            this.slide -= step;
        }

        // Stun timers
        if (this.hitstun > 0) {
            this.hitstun--;
            if (this.reaction) this.reaction.tick++;
        }
        if (this.blockstun > 0) this.blockstun--;
        if (this.hitstun === 0 && !this.ko) this.reaction = null;
        if (this.blockstun === 0) this.guard = null;

        this._advanceKnockdown();
        this._updateJump();
        this._advanceMove();
        this._advanceDash(forwardHeld);

        const reeling = this.ko || this.hitstun > 0 || !!this.knockdown;
        const free =
            !reeling && this.blockstun === 0 && !this.move && this.recovery === 0 && !this.dash &&
            !this.jumpSquat && !this.landLag;
        const grounded = !this.isJumping;
        this.canActThisTick = free && grounded;

        this._updateGuard(free && grounded, block, down);

        // Dash (double-tap), then jump
        if (free && grounded && !this.isBlocking && !this.isCrouching) this._startDash(km);
        if (free && grounded && !this.dash && !this.isBlocking && !this.isCrouching && up) {
            // Direction is locked in now; a running jump carries extra speed
            this.jumpSquat = JUMP.squat;
            this.jumpDir = right === left ? 0 : right ? 1 : -1;
            this.vx = this.jumpDir * (this.jumpDir === this.facing ? JUMP.forward : JUMP.back);
            if (this.running) this.vx += this.facing * RUN.jumpCarry;
            this.running = false;
        }

        // Attacks (presses made during the squat wait in the buffer for takeoff)
        if (!reeling && this.blockstun === 0 && !this.dash && !this.jumpSquat && !this.landLag) this._startAttacks(km);

        // Walk on the ground, drift in the air
        this._updateRun(forwardHeld, reeling, free && grounded);

        const canMove =
            free && grounded && !this.running && !this.brake && !this.isBlocking && !this.isCrouching;
        this.isWalkingLeft = false;
        this.isWalkingRight = false;
        if (canMove && right !== left) {
            this.x += right ? WALK_SPEED : -WALK_SPEED;
            this.isWalkingRight = right;
            this.isWalkingLeft = left;
        }

        this._updateGuardAnimations();
    }

    /** Called every tick, including during hitstop, for hit feedback timers. */
    fxTick() {
        if (this.flash > 0) this.flash--;
        if (this.vibrate > 0) this.vibrate--;
        for (const t of this.trail) t.age++;
        this.trail = this.trail.filter((t) => t.age <= 7);
    }

    _startDash(km) {
        const n = this.playerNum;
        const forward = this.forwardDir() > 0 ? "right" : "left";
        const back = forward === "right" ? "left" : "right";
        let type = null;
        if (km.hasDoubleTap(n, forward, DOUBLE_TAP_TICKS)) {
            km.consumePress(n, forward);
            type = "forward";
        } else if (km.hasDoubleTap(n, back, DOUBLE_TAP_TICKS)) {
            km.consumePress(n, back);
            type = "back";
        }
        if (!type) return;
        const dir = type === "forward" ? this.forwardDir() : -this.forwardDir();
        this.dash = { type, dir, tick: 0 };
        this._sound("dash");
        // Dust kicks up behind the push-off foot
        this.fxEvents.push({ type: "dust", x: this.x + this.width / 2 - dir * 45, y: this.y + this.height - 6, dir: -dir, size: 1 });
    }

    _advanceDash(forwardHeld) {
        const d = this.dash;
        if (!d) return;
        const speeds = DASH[d.type].speeds;
        this.x += d.dir * speeds[d.tick];
        d.tick++;
        // Still holding forward well into a forward dash: break into a run
        if (d.type === "forward" && forwardHeld && d.tick >= RUN.fromDashTick) {
            this.dash = null;
            this.running = true;
            this.runTick = 0;
            return;
        }
        if (speeds[d.tick - 1] > 4) {
            if (this.dashTrail) {
                // Character trail (protein powder, fire) left on the floor just behind them
                this.fxEvents.push({ type: "trail", kind: this.dashTrail, x: this.x + this.width / 2 - d.dir * 20, y: this.yInitial + this.height - 6, dir: -d.dir });
            } else {
                this.trail.push({ x: this.x, y: this.y, img: this._currentFrame(), facing: this.facing, age: 0 });
            }
        }
        if (d.tick >= speeds.length) {
            this.dash = null;
            if (d.type === "forward") {
                // Skid to a stop
                this.fxEvents.push({ type: "dust", x: this.x + this.width / 2 + d.dir * 40, y: this.y + this.height - 6, dir: d.dir, size: 0.7 });
            }
        }
    }

    _updateRun(forwardHeld, reeling, canAct) {
        if (this.running) {
            const keepGoing =
                forwardHeld && canAct && !reeling && !this.move && !this.isBlocking && !this.isCrouching && !this.isJumping;
            if (keepGoing) {
                this.x += this.forwardDir() * RUN.speed;
                this.runTick++;
                if (this.runTick % 12 === 6) this._dust(-this.forwardDir(), 40, 0.6);
                return;
            }
            this.running = false;
            // Let go of forward: skid. Attacking, jumping or blocking stops dead instead.
            if (!forwardHeld && canAct && !this.move && !this.isJumping) {
                this.brake = RUN.brake.length;
                this._dust(this.forwardDir(), -40, 0.8);
            }
        }
        if (this.brake > 0) {
            if (this.move || reeling || this.isJumping) {
                this.brake = 0;
            } else {
                this.x += this.forwardDir() * RUN.brake[RUN.brake.length - this.brake];
                this.brake--;
            }
        }
    }

    /** Ask GameState to play a sound from where this fighter stands. */
    _sound(name, opts = {}) {
        this.fxEvents.push({ type: "sound", name, x: this.centerX(), ...opts });
    }

    _dust(dir, behind, size) {
        this.fxEvents.push({ type: "dust", x: this.x + this.width / 2 - this.forwardDir() * behind, y: this.yInitial + this.height - 6, dir, size });
    }

    _knockDown(final, dir) {
        // Already tipping over (hit out of a juggle): carry on from that angle
        const rot = this.knockdown?.rot ?? 0;
        this.cancelMove();
        this.running = false;
        this.brake = 0;
        this.isJumping = false;
        this.jumpSquat = 0;
        this.landLag = 0;
        this.hitstun = 0;
        this.blockstun = 0;
        this.reaction = null;
        this.isBlocking = false;
        this.isCrouching = false;
        this.slide = 0;
        this.knockdown = { phase: "air", tick: 0, vy: -KNOCKDOWN.launchSpeed, rot, dir, final };
    }

    // Launched, or popped up again mid-juggle. A launch hit (jump 1) pops
    // them high every time; other hits pop them less each time.
    _juggle(dir, launcher) {
        const hits = this.isJuggled() ? this.knockdown.hits : 0;
        const r = JUGGLE.relaunch;
        const pop = launcher || hits === 0 ? JUGGLE.launch : r[Math.min(hits, r.length) - 1];
        // Only as hard as the room under the ceiling allows (v² = 2gh)
        const room = Math.max(0, JUGGLE.ceiling - (this.yInitial - this.y));
        const speed = Math.min(pop, Math.sqrt(2 * JUGGLE.gravity * room));
        // KO'd mid-juggle: they stay down once they land
        this._knockDown(this.ko, dir);
        Object.assign(this.knockdown, { juggle: true, hits: hits + 1, vy: -speed });
    }

    _advanceKnockdown() {
        const k = this.knockdown;
        if (!k) return;
        k.tick++;
        if (k.phase === "air") {
            const arc = k.juggle ? JUGGLE : KNOCKDOWN;
            this.x += k.dir * arc.travel;
            k.vy += arc.gravity;
            this.y += k.vy;
            // A juggle lays them flat fast; a knockdown tips them back as they fly
            k.rot = k.juggle ? Math.min(90, k.rot + JUGGLE.spin) : Math.max(k.rot, Math.min(85, k.rot + 7));
            if (k.vy > 0 && this.y >= this.yInitial) {
                this.y = this.yInitial;
                k.phase = "down";
                k.tick = 0;
                k.rot = 90;
                this._sound("knockdown");
                this.fxEvents.push({ type: "dust", x: this.centerX() + k.dir * 60, y: this.yInitial + this.height - 6, dir: k.dir, size: 1.4 });
                this.fxEvents.push({ type: "dust", x: this.centerX() - k.dir * 20, y: this.yInitial + this.height - 6, dir: -k.dir, size: 1 });
            }
        } else if (k.phase === "down") {
            if (!k.final && k.tick >= KNOCKDOWN.downTicks) {
                k.phase = "getup";
                k.tick = 0;
            }
        } else if (k.tick >= KNOCKDOWN.getupTicks) {
            this.knockdown = null;
        }
    }

    // Squat → arc (gravity) → landing
    _updateJump() {
        if (this.landLag > 0) this.landLag--;
        if (this.jumpSquat > 0) {
            if (--this.jumpSquat === 0) {
                this.isJumping = true;
                this.jumpTick = 0;
                this.vy = -JUMP.speed;
                this._dust(-this.jumpDir || 0, 0, 0.7);
                this._sound("jump");
            }
            return;
        }
        if (!this.isJumping) return;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += JUMP.gravity;
        this.jumpTick++;
        if (this.vy > 0 && this.y >= this.yInitial) {
            this.y = this.yInitial;
            this.isJumping = false;
            this.vx = 0;
            this.vy = 0;
            this.airAttackUsed = false;
            this.landLag = JUMP.landing;
            if (this.move && this.moveData().air) this.move = null;
            this._dust(1, 25, 0.6);
            this._dust(-1, -25, 0.6);
            this._sound("land");
        }
    }

    _advanceMove() {
        if (!this.move) {
            if (this.recovery > 0) this.recovery--;
            return;
        }
        const m = this.moveData();
        this.moveTick++;
        if (m.lunge) this.x += this.forwardDir();
        const i = this.frameIndex();
        const tpf = this[m.anim].ticksPerFrame;
        // Step forward over the listed frames
        for (const a of m.advance || []) {
            if (i >= a.frames[0] && i <= a.frames[1]) this.x += (this.forwardDir() * a.px) / ((a.frames[1] - a.frames[0] + 1) * tpf);
        }
        // A swing whoosh on the frame before each hit comes out
        // (or the move's own `swingSound`)
        for (const h of this.hitsFor(this.move)) {
            const key = `whoosh@${h.id}`;
            if (i >= h.frames[0] - 1 && !this.firedFx.has(key)) {
                this.firedFx.add(key);
                this._sound(m.swingSound ?? WHOOSH[h.level], { pitch: h.level === "medium" ? -3 : 0 });
            }
        }
        // Effects tied to a frame of the move (once per move / string)
        for (const fx of m.fx || []) {
            const key = `${fx.type}@${fx.frame}`;
            if (i >= fx.frame && !this.firedFx.has(key)) {
                this.firedFx.add(key);
                this._spawnMoveFx(fx);
            }
        }
        if (!m.untilLanding && i >= m.end) {
            this.lastMove = this.move;
            this.move = null;
            this.recovery = this._recovery(m);
        }
    }

    _startMove(key, startFrame = 0) {
        this.move = key;
        this.moveTick = startFrame * this[this.moves[key].anim].ticksPerFrame;
        this.recovery = 0;
        this.contacts.clear();
        this.landed.clear();
        this.firedFx.clear();
    }

    _spawnMoveFx(fx) {
        const f = this.forwardDir();
        if (fx.type === "swing") {
            // Angles are written facing right (0 = forward, + = down); mirror for facing left.
            // The streak rides along with the fighter (step-ins, jumps).
            const mirror = (a) => (f > 0 ? a : 180 - a);
            this.fxEvents.push({
                type: "swing", owner: this, local: fx.center, facing: f,
                radius: fx.radius, from: mirror(fx.from), to: mirror(fx.to), width: fx.width, life: fx.life, style: fx.style,
            });
        } else if (fx.type === "clash") {
            const p = this.toWorldPoint(fx.at);
            // Converges over the frame before the hit, so the clang lands on the active frame
            const lead = this[this.moveData().anim].ticksPerFrame;
            this.fxEvents.push({ type: "clash", x: p.x, y: p.y, dir: f, lead });
        }
    }

    _startAttacks(km) {
        const n = this.playerNum;
        const press = (action) => km.hasPress(n, action);
        const take = (action) => km.consumePress(n, action);

        // Light string: 1 → 1,1 → 1,1,1 (same timeline, so moveTick carries on)
        if (this.move === "standing1" && press("one") && this.frameIndex() <= CHAIN_WINDOW.standing1) {
            take("one");
            this.move = "standing11";
            return;
        }
        if (this.move === "standing11" && press("one") && this.frameIndex() <= CHAIN_WINDOW.standing11) {
            take("one");
            this.move = "standing111";
            return;
        }

        // Dom: once the second hit of 1,1 connects (hit or block), cancel into the special
        if (
            this.canCancelComboIntoSpecial &&
            this.move === "standing11" &&
            this.contacts.has("s2") &&
            press("special")
        ) {
            take("special");
            this._startMove("special", this.moves.special.cancelStartFrame || 0);
            return;
        }

        // In the air: one attack per jump
        if (this.isJumping) {
            if (this.move || this.recovery > 0 || this.airAttackUsed) return;
            if (press("two") && take("two")) {
                this._startMove("jump2");
                this.airAttackUsed = true;
            } else if (press("one") && take("one")) {
                this._startMove("jump1");
                this.airAttackUsed = true;
            }
            return;
        }

        // Fresh move from neutral (standing or crouching, not while blocking)
        if (this.move || this.recovery > 0 || this.isBlocking) return;
        const crouching = this.isCrouching;
        if (press("special") && take("special")) {
            this._startMove("special");
        } else if (press("two") && take("two")) {
            this._startMove(crouching ? "down2" : "standing2");
        } else if (press("one") && take("one")) {
            this._startMove(crouching ? "down1" : "standing1");
        }
    }

    // Guard state is immediate (it decides blocks); the animations only follow it
    _updateGuard(canGuard, block, down) {
        if (this.ko || this.hitstun > 0 || this.knockdown) {
            this.isBlocking = false;
            this.isCrouching = false;
            return;
        }
        if (this.blockstun > 0) {
            this.isBlocking = this.guard === "stand";
            this.isCrouching = this.guard === "crouch";
            return;
        }
        const m = this.moveData();
        const last = this.moveData(this.lastMove);
        const crouchRecovery = !m && this.recovery > 0 && last?.crouching && !last.recoveryStanding;
        const crouchMove = (m && m.crouching) || crouchRecovery;

        // Block + down ducks into a crouching guard instead of a standing one
        this.guardHeld = block;
        this.isBlocking = canGuard && block && !down;
        this.isCrouching = !this.isBlocking && (crouchMove || (canGuard && down));
    }

    _updateGuardAnimations() {
        const busy = this.move || this.isJumping || this.isWalkingLeft || this.isWalkingRight || this.hitstun > 0;

        // Block: raise to frame 4 and hold; lower through 5-6 back to 0
        const b = this.block.getCurrentIndex();
        if (this.isBlocking) {
            if (b > 4) this.block.setIndex(4);
            else if (b < 4) this.block.tick();
        } else if (b !== 0) {
            if (busy || b === 6) this.block.setIndex(0);
            else this.block.tick();
        }

        // Crouch: drop to frame 5 and hold; rise through 6-7 back to 0
        const c = this.crouch.getCurrentIndex();
        if (this.isCrouching) {
            if (c > 5) this.crouch.setIndex(5);
            else if (c < 5) this.crouch.tick();
        } else if (c !== 0) {
            if (busy || c === 7) this.crouch.setIndex(0);
            else this.crouch.tick();
        }
    }

    // ---------- Called by Combat ----------

    /** Stop whatever this fighter was doing (they just got hit). */
    cancelMove() {
        this.dash = null;
        this.running = false;
        this.jumpSquat = 0;
        this.move = null;
        this.lastMove = null;
        this.recovery = 0;
    }

    /** @param {number} away - screen direction the hit drives this fighter */
    takeHit(hit, attackerTicks, away) {
        const juggled = this.isJuggled();
        this.cancelMove();
        this.health -= hit.damage;
        if (this.health <= 0) this.ko = true;
        this.flash = this.ko ? KO_FLASH_TICKS : FLASH_TICKS;
        this.vibrate = LEVEL[hit.level].hitstop;
        this.vibrateAmp = LEVEL[hit.level].vibrate;
        // Juggled (or launched) by a hit that isn't a knockdown: keep floating,
        // even when it's the KO, so the winner can finish the combo
        if (!hit.knockdown && (hit.launch || juggled)) {
            this._juggle(away, hit.launch);
            return;
        }
        if (hit.knockdown || this.ko) {
            this._knockDown(this.ko, away);
            return;
        }
        this.hitstun = Math.max(1, attackerTicks + hit.onHit);
        this.blockstun = 0;
        this.guard = null;
        this.reaction = { level: hit.level, tick: 0 };
        this.isBlocking = false;
        this.isCrouching = false;
        this.flash = 3;
        this.vibrate = LEVEL[hit.level].hitstop;
        this.vibrateAmp = LEVEL[hit.level].vibrate;
    }

    /** Time-out loss: fall down and stay down. */
    loseByTimeout() {
        if (!this.knockdown) this._knockDown(true, -this.facing);
    }

    takeBlock(hit, attackerTicks, guard) {
        this.blockstun = Math.max(1, attackerTicks + hit.onBlock);
        this.guard = guard;
        this.vibrate = LEVEL[hit.level].blockHitstop;
        this.vibrateAmp = Math.ceil(LEVEL[hit.level].vibrate / 2);
    }

    // ---------- Rendering ----------

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        // Dash afterimages: flat red silhouettes, oldest and faintest first
        for (const t of this.trail) {
            if (t.age % 2 === 1 || t.age === 0) continue;
            ctx.save();
            ctx.globalAlpha = 0.5 * (1 - t.age / 8);
            this._drawSprite(ctx, this._silhouette(t.img, "#c00000"), t.x, t.y, t.facing);
            ctx.restore();
        }

        const img = this._currentFrame();
        if (!img) return;
        const dx = this.vibrate > 0 ? (this.vibrate % 2 ? 1 : -1) * this.vibrateAmp : 0;
        const x = Math.round(this.x + dx);
        const y = Math.round(this.y);
        const pose = this._pose();
        const draw = (frame) =>
            pose ? this._drawRotated(ctx, frame, pose) : this._drawSprite(ctx, frame, x, y);
        draw(img);
        if (!pose) this._drawFireBlade(ctx, x, y);
        // Hit flash: white, or a solid harsh red once they're KO'd
        if (this.flash > 0) draw(this._silhouette(img, this.ko ? "rgba(255, 0, 0, 0.92)" : "rgba(255, 255, 255, 0.72)"));
    }

    // Flames carrying on past the sword's tip, on the frames listed in fireBlade
    _drawFireBlade(ctx, x, y) {
        if (!this.fireBlade || !this.move) return;
        const m = this.moveData();
        const i = this.frameIndex();
        const [anim, frame] = m.display?.[i] ?? [m.anim, i];
        const blade = this.fireBlade[anim];
        const pts = blade?.frames[frame];
        if (!pts) return;
        const [hx, hy, tx, ty] = pts;
        const len = Math.hypot(tx - hx, ty - hy);
        const ux = (tx - hx) / len;
        const uy = (ty - hy) / len;
        const f = this.forwardDir();
        const wx = (lx) => (f > 0 ? x + lx : x + this.width - lx);
        // Start a little back along the blade so the flame grows out of it
        drawFireBlade(ctx, wx(tx - ux * 10), y + ty - uy * 10, wx(tx + ux * blade.reach), y + ty + uy * blade.reach, this.moveTick);
    }

    // Rotation for knockdowns and the running lean (no fall/run art exists)
    _pose() {
        const k = this.knockdown;
        const away = k ? k.dir : 0; // they topple over backward, in the direction they were sent
        const cx = this.x + this.width / 2;
        const floor = this.yInitial + this.height;
        if (k) {
            if (k.phase === "air") {
                // Pivot drops from mid-body toward the floor as they tip over
                return { cx, cy: this.y + 150 + 105 * (k.rot / 90), anchor: 150, angle: away * k.rot };
            }
            if (k.phase === "down") return { cx, cy: floor - 45, anchor: 150, angle: away * 90 };
            if (k.tick < 8) return { cx, cy: floor, anchor: 300, angle: away * 70 * (1 - k.tick / 8) };
            return null;
        }
        if (this.running && !this.move) return { cx, cy: floor, anchor: 300, angle: this.forwardDir() * 6 };
        return null;
    }

    _drawRotated(ctx, img, { cx, cy, anchor, angle }) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((angle * Math.PI) / 180);
        if (this.facing !== this.nativeFacing) ctx.scale(-1, 1);
        drawFrame(ctx, img, -this.width / 2, -anchor, this.width, this.height);
        ctx.restore();
    }

    // Draw a frame in the body box, mirrored when facing away from the sheet's
    // direction; frames un-squashed by spriteScale.js widen around the center
    _drawSprite(ctx, img, x, y, facing = this.facing) {
        if (facing === this.nativeFacing) {
            drawFrame(ctx, img, x, y, this.width, this.height);
            return;
        }
        ctx.save();
        ctx.translate(Math.round(x + this.width / 2), 0);
        ctx.scale(-1, 1);
        drawFrame(ctx, img, -this.width / 2, y, this.width, this.height);
        ctx.restore();
    }

    // The sheet's walk cycles are drawn facing nativeFacing: one walks
    // forward, the other backward. Mirroring keeps that true after a side switch.
    _walkAnim(screenDir) {
        const forward = this.nativeFacing > 0 ? this.walk_right : this.walk_left;
        const back = this.nativeFacing > 0 ? this.walk_left : this.walk_right;
        return screenDir === this.facing ? forward : back;
    }

    _currentFrame() {
        const k = this.knockdown;
        if (k) {
            if (k.phase !== "getup") return this.hit.getFrame(5);
            // Kneel up off the floor, then rise through the crouch frames
            return this.crouch.getFrame(k.tick < 8 ? 5 : k.tick < 11 ? 6 : 7);
        }
        if (this.ko || this.hitstun > 0) return this.hit.getFrame(this._reactionFrame());
        if (this.move) {
            const m = this.moveData();
            const shown = m.display?.[this.frameIndex()];
            return shown ? this[shown[0]].getFrame(shown[1]) : this[m.anim].getFrame(this.frameIndex());
        }
        if (this.dash) {
            // Walk cycle at double speed in the direction of travel
            const walk = this._walkAnim(this.dash.dir);
            return walk.getFrame(Math.floor(this.dash.tick / 2) % walk.frames.length);
        }
        if (this.running) {
            const walk = this._walkAnim(this.facing);
            return walk.getFrame(Math.floor(this.runTick / 2) % walk.frames.length);
        }
        if (this.jumpSquat) return this.crouch.getFrame(2);
        if (this.isJumping) return this.jump.getFrame(this._jumpFrame());
        if (this.landLag) return this.jump.getFrame(6);
        if (this.recovery > 0 && this.lastMove) {
            const m = this.moveData(this.lastMove);
            // Down 1 stands up through its recovery (that's why it's punishable)
            if (m.recoveryStanding) return this.crouch.getFrame(this.recovery > m.recovery / 2 ? 6 : 7);
            return this[m.anim].getFrame(m.recoveryFrame ?? m.end);
        }
        if (this.isBlocking || this.block.getCurrentIndex() !== 0) return this.block.getCurrentFrame();
        if (this.isCrouching || this.crouch.getCurrentIndex() !== 0) return this.crouch.getCurrentFrame();
        if (this.isWalkingLeft) return this._walkAnim(-1).getCurrentFrame();
        if (this.isWalkingRight) return this._walkAnim(1).getCurrentFrame();
        return this.stance.getCurrentFrame();
    }

    // Snap back on impact, go deeper for heavier hits, straighten up as stun runs out
    _reactionFrame() {
        const r = this.reaction;
        if (!r) return 5;
        const peak = LEVEL[r.level].reactionPeak;
        const reached = Math.min(peak, 1 + Math.floor(r.tick / 2));
        if (this.ko) return reached;
        if (this.hitstun <= 4) return 6;
        if (r.level === "special" && reached === peak) {
            return Math.floor(r.tick / 6) % 2 ? peak : peak - 1; // dazed sway
        }
        return reached;
    }

    // Jump frames follow the arc: push off, tuck through the top, open up to land
    _jumpFrame() {
        const vy = this.vy;
        if (this.jumpTick < 2) return 0;
        if (vy < -16) return 1;
        if (vy < -7) return 2;
        if (vy < 7) return 3;
        if (this.ticksUntilLanding() <= 3) return 5;
        return 4;
    }

    // Flat-color copy of a frame (hit flash, dash afterimages). Reuses one canvas:
    // callers draw it immediately.
    _silhouette(img, color) {
        if (!this._flashCanvas) this._flashCanvas = document.createElement("canvas");
        const c = this._flashCanvas;
        c.width = img.width;
        c.height = img.height;
        c.scaleX = img.scaleX;
        c.offsetX = img.offsetX;
        c.cellW = img.cellW;
        const g = c.getContext("2d");
        g.globalCompositeOperation = "source-over";
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = color;
        g.fillRect(0, 0, c.width, c.height);
        return c;
    }

    /**
     * Draw health bars and name tags for this player.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawHealth(ctx) {
        const health = Math.max(0, this.health);
        if (this.playerNum === 1) {
            ctx.fillStyle = "black";
            this._fillPolygon(ctx, this.xNameTag_Player1, this.yNameTag_Player1, this.xNameTag_Player1.length);
            ctx.fillStyle = "red";
            ctx.font = Assets.dragonForce || "50px sans-serif";
            ctx.fillText(this.charTitle, 120, 150);

            this._fillRoundRect(ctx, 80, 60, 450, 50, 25, 25, "red");
            const w = (450 * health) / MAX_HEALTH;
            if (w > 0) this._fillRoundRect(ctx, 80, 60, w, 50, 25, 25, "yellow");
        } else {
            ctx.fillStyle = "black";
            this._fillPolygon(ctx, this.xNameTag_Player2, this.yNameTag_Player2, this.xNameTag_Player2.length);
            ctx.fillStyle = "red";
            ctx.font = Assets.dragonForce || "50px sans-serif";
            ctx.fillText(this.charTitle, 1080, 150);

            this._fillRoundRect(ctx, 750, 60, 450, 50, 25, 25, "red");
            const w = (450 * health) / MAX_HEALTH;
            if (w > 0) this._fillRoundRect(ctx, 750 + (450 - w), 60, w, 50, 25, 25, "yellow");
        }
    }

    // ---------- Accessors used by the states ----------

    getHealth() {
        return this.health;
    }

    getCharTitle() {
        return this.charTitle;
    }

    getStance() {
        return this.stance;
    }

    getX() {
        return this.x;
    }

    setX(x) {
        this.x = x;
    }

    getWidth() {
        return this.width;
    }

    // ---------- Canvas helpers ----------

    _fillPolygon(ctx, xPoints, yPoints, nPoints) {
        if (nPoints <= 0) return;
        ctx.beginPath();
        ctx.moveTo(xPoints[0], yPoints[0]);
        for (let i = 1; i < nPoints; i++) {
            ctx.lineTo(xPoints[i], yPoints[i]);
        }
        ctx.closePath();
        ctx.fill();
    }

    _fillRoundRect(ctx, x, y, width, height, radiusX, radiusY, fillStyle) {
        const rX = Math.min(radiusX || 0, width / 2);
        const rY = radiusY || rX;

        ctx.beginPath();
        ctx.moveTo(x + rX, y);
        ctx.lineTo(x + width - rX, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + rY);
        ctx.lineTo(x + width, y + height - rY);
        ctx.quadraticCurveTo(x + width, y + height, x + width - rX, y + height);
        ctx.lineTo(x + rX, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - rY);
        ctx.lineTo(x, y + rY);
        ctx.quadraticCurveTo(x, y, x + rX, y);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
        }
        ctx.fill();
    }
}
