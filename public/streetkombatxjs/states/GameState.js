// ./states/GameState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { Animation } from "../gfx/Animation.js";
import { Effects } from "../gfx/Effects.js";
import { Combat } from "../collision/Combat.js";
import { HelpState } from "./HelpState.js";
import { MenuState } from "./MenuState.js";
import { EndState } from "./EndState.js";
import { Settings } from "../settings.js";
import { Sound } from "../audio/Sound.js";

// Seconds of READY / FIGHT before the round clock starts counting
const INTRO_SECONDS = 3;

// How long the result stays up after a KO or time-out before the end screen
const END_DELAY_TICKS = 300;

// The stage art is zoomed in and the camera scrolls across it, so the arena
// is wider than the screen. Zoom is anchored to the bottom so the floor
// stays under the fighters' feet.
const VIEW_W = 1280;
const VIEW_H = 720;
const STAGE_ZOOM = 1.5;
const STAGE_W = VIEW_W * STAGE_ZOOM;
const CAMERA_FOLLOW = 0.18;

// READY lands this many ticks into the intro, then pulses every READY_BEAT ticks
const READY_LANDS = 9;
const READY_BEAT = 30;

// How long a COUNTER / PUNISH callout stays up
const BANNER_TICKS = 60;

// Attacker-side HUD column, under the name tag
const HUD_Y = { banner: 210, comboCount: 290, comboHits: 362, comboDamage: 406 };

export class GameState extends State {
    // Frame-advantage readout and hitbox view, toggled with ` and remembered between matches
    static showFrameData = false;

    constructor(game, player1, player2, stage) {
        super(game);

        this.player1 = player1;
        this.player2 = player2;

        this.stage = stage;
        this.background = new Animation(60, this.stage);

        // Start the fighters in the middle of the wider stage
        const offset = (STAGE_W - VIEW_W) / 2;
        for (const p of [this.player1, this.player2]) {
            p.x += offset;
            p.prevX = p.x;
        }

        this.combat = new Combat(this.player1, this.player2, { stageWidth: STAGE_W, viewWidth: VIEW_W });
        this.cameraX = this.cameraTarget();
        this.effects = new Effects();
        this.hitstop = 0;

        // "COUNTER" / "PUNISH" callouts, keyed by the attacking player
        this.banners = { 1: null, 2: null };

        // Round length is chosen on the main menu
        this.roundTime = Settings.roundTime;
        this.time = this.roundTime + INTRO_SECONDS;
        this.ticks = 0;
        this.endTimer = 0;
        this.selection = 0;
        this.winner = "";

        this.escape = false;
        this.up = false;
        this.down = false;
        this.enter = false;
        this.previousUp = false;
        this.previousDown = false;
        this.pause = false;

        this.pauseScreen = Assets.pause;

        // Ticks since the round intro began (drives the READY / FIGHT animation)
        this.introTicks = 0;
    }

    /** Someone's health ran out (the round may still be finishing a juggle). */
    hasKO() {
        return this.player1.getHealth() <= 0 || this.player2.getHealth() <= 0;
    }

    /**
     * The round is over: a KO or the clock ran out. A fighter KO'd mid-juggle
     * can still be hit until they land, so the round ends when they do.
     */
    isOver() {
        if (this.player1.isJuggled() || this.player2.isJuggled()) {
            if (this.hasKO()) return false;
        }
        return this.hasKO() || this.time <= 0;
    }

    tick() {
        const km = this.game.getKeyManager();

        this.escape = km.isEscape();
        if (this.escape && !this.isOver()) {
            if (!this.pause) Sound.play("menu_back");
            this.pause = true;
        }

        if (this.pause) {
            this.tickPauseMenu(km);
            return;
        }

        if (km.consumeRawPress("Backquote")) {
            GameState.showFrameData = !GameState.showFrameData;
        }

        // The clock keeps running through hitstop, as in most fighters, and
        // stops at a KO (so it can't time out a juggle that's finishing)
        if (this.time > 0 && this.ticks === 60 && !this.hasKO()) {
            this.time -= 1;
            this.ticks = 0;
            if (this.time === 0) Sound.play("gong");
            else if (this.time <= 10) Sound.play("clock");
        }
        this.ticks += 1;
        this.introTicks += 1;
        this.introSounds();

        this.background.tick();
        this.effects.tick(this.hitstop > 0);
        for (const n of [1, 2]) {
            const b = this.banners[n];
            if (b && ++b.tick > BANNER_TICKS) this.banners[n] = null;
        }
        this.combat.fxTick();
        this.player1.fxTick();
        this.player2.fxTick();

        if (this.time > this.roundTime) {
            // READY / FIGHT countdown: no input yet, but keep both fighters breathing
            this.player1.stance.tick();
            this.player2.stance.tick();
            return;
        }

        if (this.hitstop > 0) {
            // Both fighters freeze on impact; held-early presses keep waiting
            this.hitstop--;
            km.extendPresses(1);
        } else {
            this.player1.tick();
            this.player2.tick();
            for (const event of this.combat.tick(this.time)) this.onContact(event);
            this.cameraX += (this.cameraTarget() - this.cameraX) * CAMERA_FOLLOW;
            for (const p of [this.player1, this.player2]) {
                for (const fx of p.fxEvents) {
                    if (fx.type === "dust") this.effects.dust(fx.x, fx.y, fx.dir, fx.size);
                    else if (fx.type === "swing") this.effects.swing(fx);
                    else if (fx.type === "trail") this.effects.trail(fx);
                    else if (fx.type === "clash") this.effects.clash(fx.x, fx.y, fx.dir, fx.lead);
                    else if (fx.type === "sound") Sound.play(fx.name, { pan: this.panAt(fx.x), pitch: fx.pitch });
                    // Dom's dumbbells meet `lead` ticks after the clash effect starts
                    if (fx.type === "clash") Sound.play("clang", { pan: this.panAt(fx.x), delay: fx.lead / 60 });
                }
                p.fxEvents.length = 0;
            }
        }

        if (this.isOver()) {
            const h1 = this.player1.getHealth();
            const h2 = this.player2.getHealth();
            if (h1 < h2) this.winner = `${this.player2.getCharTitle()} wins`;
            else if (h2 < h1) this.winner = `${this.player1.getCharTitle()} wins`;
            else this.winner = "Tie Game";

            this.endTimer += 1;
            if (this.endTimer >= END_DELAY_TICKS) {
                State.setState(new EndState(this.game, this.player1, this.player2, this.stage));
            }
        }
    }

    tickPauseMenu(km) {
        this.up = km.isPlayer2_jump();
        this.down = km.isPlayer2_crouch();
        this.enter = km.isEnter();

        if (this.selection < 2 && this.down && !this.previousDown) {
            this.selection += 1;
            Sound.play("menu_move");
        } else if (this.selection > 0 && this.up && !this.previousUp) {
            this.selection -= 1;
            Sound.play("menu_move");
        }

        if (this.enter) {
            Sound.play("menu_select");
            if (this.selection === 0) {
                this.pause = false;
            } else if (this.selection === 1) {
                State.setState(new HelpState(this.game, this));
            } else {
                State.setState(new MenuState(this.game));
            }
        }

        this.previousDown = this.down;
        this.previousUp = this.up;
    }

    onContact(e) {
        this.hitstop = Math.max(this.hitstop, e.hitstop);
        const pan = this.panAt(e.x);
        if (e.type === "block") {
            this.effects.spark("block", e.x, e.y, e.dir);
            Sound.play("block", { pan });
            return;
        }
        this.effects.spark(e.hit.level, e.x, e.y, e.dir, e.ko);
        Sound.play(`hit_${e.hit.level}`, { pan });
        if (e.ko && !this.koSounded) {
            // The finishing blow (later hits on a juggled loser just hit)
            this.koSounded = true;
            Sound.play("ko", { pan: pan * 0.5 });
        }
        if (e.caught) {
            this.banners[e.attacker.playerNum] = { text: e.caught === "punish" ? "PUNISH" : "COUNTER", tick: 0 };
            Sound.play("counter");
        }
        if (e.shake) this.effects.shake(e.shake, 6 + e.shake);
    }

    // ---------- Sound ----------

    /** Stereo position for a point in the stage: left of the screen to right. */
    panAt(x) {
        const onScreen = (x - this.cameraX) / VIEW_W;
        return Math.max(-1, Math.min(1, (onScreen * 2 - 1) * 0.6));
    }

    /** War drum on each READY beat, then the big hit on FIGHT. Matches renderIntro's timing. */
    introSounds() {
        const t = this.introTicks;
        const { FIGHT_START } = GameState;
        if (t < FIGHT_START && t >= READY_LANDS && (t - READY_LANDS) % READY_BEAT === 0) {
            Sound.play("drum", { pitch: t === READY_LANDS ? -2 : 0 });
        } else if (t === FIGHT_START) {
            Sound.play("fight");
        }
    }

    // ---------- Camera ----------

    cameraTarget() {
        const mid = (this.player1.x + this.player2.x + 150) / 2;
        return Math.min(STAGE_W - VIEW_W, Math.max(0, mid - VIEW_W / 2));
    }

    // ---------- Rendering ----------

    render(ctx) {
        const shake = this.combineShake(this.introShake(), this.effects.shakeOffset());

        ctx.save();
        if (shake) {
            // Zoom in a hair so the shake never reveals the canvas edge
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, 1280, 720);
            ctx.translate(640 + shake.x, 360 + shake.y);
            ctx.scale(1.03, 1.03);
            ctx.translate(-640, -360);
        }

        // World: zoomed stage, fighters and effects scroll with the camera
        const camX = Math.round(this.cameraX);
        ctx.drawImage(this.background.getCurrentFrame(), -camX, VIEW_H - VIEW_H * STAGE_ZOOM, STAGE_W, VIEW_H * STAGE_ZOOM);
        ctx.save();
        ctx.translate(-camX, 0);
        // The fighter who is attacking is drawn in front
        const [back, front] = this.player1.move && !this.player2.move ? [this.player2, this.player1] : [this.player1, this.player2];
        back.render(ctx);
        front.render(ctx);
        this.effects.render(ctx);
        if (GameState.showFrameData) this.renderBoxes(ctx);
        ctx.restore();

        // HUD stays put
        this.player1.drawHealth(ctx);
        this.player2.drawHealth(ctx);
        ctx.font = Assets.dragonForceNum;
        ctx.fillStyle = "red";
        ctx.textAlign = "center"; // centered between the health bars, so 3 digits fit too
        ctx.fillText(String(Math.min(this.time, this.roundTime)), 641, 113);
        ctx.textAlign = "start";
        ctx.restore();

        for (const n of [1, 2]) {
            this.renderBanner(ctx, n);
            this.renderCombo(ctx, n);
        }
        if (GameState.showFrameData) this.renderFrameData(ctx);

        this.renderIntro(ctx);

        if (this.isOver()) {
            this.endScreen(ctx, this.winner);
        }

        if (this.pause) {
            ctx.drawImage(this.pauseScreen[this.selection], 0, 0, 1280, 720);
        }
    }

    combineShake(a, b) {
        if (!a && !b) return null;
        return { x: (a?.x ?? 0) + (b?.x ?? 0), y: (a?.y ?? 0) + (b?.y ?? 0) };
    }

    // "3 HITS" under the attacker's health bar; holds and fades once the combo ends
    renderCombo(ctx, playerNum) {
        const c = this.combat.combos[playerNum];
        if (c.count < 2) return;

        const alpha = c.ended ? Math.min(1, c.hold / 15) : 1;
        const pop = 1 + 0.45 * (c.pop / 8);
        const left = playerNum === 1;
        const x = left ? 90 : 1190;
        const align = left ? "left" : "right";

        this.drawSlamText(ctx, String(c.count), 120, pop, alpha, x, HUD_Y.comboCount, align);
        this.drawSlamText(ctx, "HITS", 54, 1, alpha, x, HUD_Y.comboHits, align);

        if (c.ended) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = '800 26px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
            ctx.textAlign = align;
            ctx.textBaseline = "middle";
            ctx.lineWidth = 5;
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#000";
            ctx.strokeText(`${c.damage} damage`, x, HUD_Y.comboDamage);
            ctx.fillStyle = "#efe6dc";
            ctx.fillText(`${c.damage} damage`, x, HUD_Y.comboDamage);
            ctx.restore();
        }
    }

    // COUNTER (yellow) or PUNISH (red) slams in on the attacker's side
    renderBanner(ctx, playerNum) {
        const b = this.banners[playerNum];
        if (!b) return;
        const left = playerNum === 1;
        const enter = Math.min(1, b.tick / 5);
        const scale = 1 + 1.2 * Math.pow(1 - enter, 3);
        const alpha = Math.min(enter, (BANNER_TICKS - b.tick) / 12);
        const color = b.text === "PUNISH" ? "#e00000" : "#ffd84a";
        this.drawSlamText(ctx, b.text, 64, scale, alpha, left ? 90 : 1190, HUD_Y.banner, left ? "left" : "right", color);
    }

    // Hurtboxes in blue, live hitboxes in red (shown with the frame data)
    renderBoxes(ctx) {
        const draw = (r, stroke, fill) => {
            ctx.fillStyle = fill;
            ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(r.x0 + 1, r.y0 + 1, r.x1 - r.x0 - 2, r.y1 - r.y0 - 2);
        };
        ctx.save();
        for (const p of [this.player1, this.player2]) {
            for (const r of p.hurtboxes()) draw(r, "#3d8bff", "rgba(61, 139, 255, 0.18)");
            const h = p.activeHit();
            if (h) draw(p.hitbox(h), "#ff2a2a", "rgba(255, 42, 42, 0.3)");
        }
        ctx.restore();
    }

    // Plain readout: who did what, and how far ahead the attacker was afterwards
    renderFrameData(ctx) {
        const r = this.combat.lastResult;
        const text = r
            ? `${r.label} on ${r.kind}: ${r.advantage > 0 ? "+" : r.advantage < 0 ? "−" : "±"}${Math.abs(r.advantage)}`
            : "Frame data and hitboxes on: land or block a hit";

        ctx.save();
        ctx.font = '800 26px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const w = ctx.measureText(text).width + 36;
        ctx.fillStyle = "#000";
        ctx.fillRect(640 - w / 2, 660, w, 40);
        ctx.strokeStyle = "#600000";
        ctx.lineWidth = 2;
        ctx.strokeRect(640 - w / 2, 660, w, 40);
        ctx.fillStyle = r ? (r.advantage >= 0 ? "#efe6dc" : "#ff5a5a") : "#9b7f7b";
        ctx.fillText(text, 640, 681);
        ctx.restore();
    }

    // ---------- Round intro: READY slams in and pulses, FIGHT crashes in with a flash + shake ----------

    static FIGHT_START = 120; // 2 s in, one second before the clock starts
    static ROUND_START = 180; // fighters get control
    static FIGHT_EXIT = 22; // ticks FIGHT lingers into the round

    introShake() {
        const t = this.introTicks - GameState.FIGHT_START;
        const length = 18;
        if (t < 0 || t >= length) return null;
        const amp = 16 * (1 - t / length);
        return { x: Math.sin(t * 2.7) * amp, y: Math.cos(t * 3.9) * amp * 0.6 };
    }

    renderIntro(ctx) {
        const t = this.introTicks;
        const { FIGHT_START, ROUND_START, FIGHT_EXIT } = GameState;
        if (t >= ROUND_START + FIGHT_EXIT) return;

        ctx.save();

        if (t < FIGHT_START) {
            // Darken the stage while everyone waits
            ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
            ctx.fillRect(0, 0, 1280, 720);

            // Slam in over 9 ticks, then a heavy heartbeat every half second
            const enter = Math.min(1, t / READY_LANDS);
            let scale = 1 + 2.2 * Math.pow(1 - enter, 3);
            if (enter === 1) {
                const beat = (t - READY_LANDS) % READY_BEAT;
                scale += beat < 6 ? 0.06 * (1 - beat / 6) : 0;
            }
            this.drawSlamText(ctx, "READY", 150, scale, enter);
        } else {
            const local = t - FIGHT_START;

            // Red impact flash
            if (local < 12) {
                ctx.fillStyle = `rgba(192, 0, 0, ${0.6 * (1 - local / 12)})`;
                ctx.fillRect(0, 0, 1280, 720);
            }

            const enter = Math.min(1, local / 5);
            let scale = 1 + 3 * Math.pow(1 - enter, 3);
            let alpha = enter;

            // Once the round starts, FIGHT blows outward and fades
            const exit = t - ROUND_START;
            if (exit >= 0) {
                const e = exit / FIGHT_EXIT;
                scale = 1 + 0.9 * e;
                alpha = 1 - e;
            }

            const shake = this.introShake();
            if (shake) ctx.translate(shake.x * 0.5, shake.y * 0.5);
            this.drawSlamText(ctx, "FIGHT!", 240, scale, alpha);
        }

        ctx.restore();
    }

    // Big display type: solid dark-red drop, black outline, red face (no blur)
    drawSlamText(ctx, text, size, scale, alpha, x = 640, y = 380, align = "center", face = "#e00000") {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.font = `${size}px "DragonForcE"`;
        ctx.textAlign = align;
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";

        const depth = Math.round(size / 22);
        ctx.fillStyle = "#300000";
        ctx.fillText(text, depth, depth);

        ctx.lineWidth = Math.round(size / 14);
        ctx.strokeStyle = "#000";
        ctx.strokeText(text, 0, 0);

        ctx.fillStyle = face;
        ctx.fillText(text, 0, 0);

        ctx.lineWidth = Math.max(2, Math.round(size / 60));
        ctx.strokeStyle = "#600000";
        ctx.strokeText(text, 0, 0);
        ctx.restore();
    }

    endScreen(ctx, charTitle) {
        ctx.font = Assets.dragonForceEndScreen;
        ctx.fillStyle = "red";
        ctx.fillText(this.winner, 490, 350);
    }
}
