// ./collision/Combat.js
//
// Spacing, hit detection and hit resolution between the two fighters.
//
// Either fighter can be on either side: "left" and "right" below mean
// whoever is currently there, not player 1 / player 2.
//
// Each tick, after both fighters have updated:
//  1. Bodies are kept from overlapping (only while both are on the ground,
//     so a jump can carry you over the opponent), on the stage, and within one
//     screen-width of each other (the camera can't show more). Fighters who
//     are free turn to face each other.
//  2. Each fighter's active hitbox is tested against the other's hurtboxes
//     (see players/moves.js), then against their guard. Both fighters are
//     worked out before either is applied, so trades are fair.
//  3. A connecting hit sets the defender's hitstun or blockstun from the
//     attacker's remaining recovery, so frame advantage always matches the
//     move's onHit / onBlock value. Knockdown hits floor them instead.
//     The first special in a combo stuns as usual; a second special in the
//     same combo knocks down, so special -> 1,1 -> special can't loop forever.
//
// tick() returns contact events; GameState turns them into hitstop,
// sparks and screen shake.

import { HEIGHT, LEVEL } from "../players/moves.js";

// Bodies may overlap by this much (the original game's spacing)
const BODY_OVERLAP = 30;
const PINNED_GAP = 150 - BODY_OVERLAP; // x distance between pressed-together fighters

// Fighters stay this far inside the camera's edges
const VIEW_MARGIN = 20;

// Most a fighter can shove the opponent per tick (walking speed)
const PUSH_CAP = 5;

// Attackers pushed off a cornered opponent travel at most this far
const MAX_CORNER_PUSH = 40;

const newCombo = () => ({ count: 0, damage: 0, specials: 0, pop: 0, ended: false, hold: 0 });

const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// Who is on the left right now (ties: whoever was on the left last tick)
const sides = (a, b) => {
    const d = a.centerX() - b.centerX() || a.prevX - b.prevX || a.playerNum - b.playerNum;
    return d <= 0 ? [a, b] : [b, a];
};

export class Combat {
    /**
     * @param {Player} player1
     * @param {Player} player2
     * @param {{ stageWidth: number, viewWidth: number }} stage
     */
    constructor(player1, player2, { stageWidth = 1280, viewWidth = 1280 } = {}) {
        this.player1 = player1;
        this.player2 = player2;
        this.stageLeft = 0;
        this.stageRight = stageWidth - 150;
        this.maxSpread = viewWidth - 150 - 2 * VIEW_MARGIN;

        // Combo counters, keyed by the attacking player's number
        this.combos = { 1: newCombo(), 2: newCombo() };

        // Frame-advantage measurement of the latest exchange
        this.pending = null;
        this.lastResult = null;
        this.tickCount = 0;
    }

    tick(time) {
        this.tickCount++;
        const p1 = this.player1;
        const p2 = this.player2;
        const fighting = p1.health > 0 && p2.health > 0 && time > 0;

        // Measure first, so an exchange that started last tick counts from here
        this._measureAdvantage();

        if (fighting) this._keepApart();
        this._keepInView();
        this._clampToStage();
        p1.faceToward(p2);
        p2.faceToward(p1);

        // Time-out: whoever has less health falls
        if (time <= 0) {
            if (p1.health < p2.health) p1.loseByTimeout();
            else if (p2.health < p1.health) p2.loseByTimeout();
        }

        const events = [];
        if (fighting) {
            const a = this._probe(p1, p2);
            const b = this._probe(p2, p1);
            if (a) events.push(this._apply(p1, p2, a));
            if (b) events.push(this._apply(p2, p1, b));
        }

        this._updateCombos();
        return events;
    }

    /** Called every tick (also during hitstop) for counter animations. */
    fxTick() {
        for (const c of Object.values(this.combos)) {
            if (c.pop > 0) c.pop--;
            if (c.ended && --c.hold <= 0) Object.assign(c, newCombo());
        }
    }

    // ---------- Spacing ----------

    _keepApart() {
        const p1 = this.player1;
        const p2 = this.player2;
        if (p1.knockdown || p2.knockdown) return; // let a falling fighter pass over
        // Jumpers pass over; any overlap is sorted out when they land, by which side they ended up on
        if (p1.isJumping || p2.isJumping) return;
        const [L, R] = sides(p1, p2);
        if (R.x - L.x >= PINNED_GAP) return;

        // Each fighter pushes with how far they moved toward the other this
        // tick, capped at walking strength, and the contact point shifts by
        // the difference. Pushing into each other stalls no matter who moved
        // last; walking into someone standing still shoves them at half speed;
        // a run or dash pushes no harder than a walk.
        const pushL = Math.min(PUSH_CAP, Math.max(0, L.x - L.prevX));
        const pushR = Math.min(PUSH_CAP, Math.max(0, R.prevX - R.x));
        const wereTouching = R.prevX - L.prevX <= PINNED_GAP + PUSH_CAP * 2;
        const contact = wereTouching
            ? (L.prevX + R.prevX) / 2 + (pushL - pushR) / 2
            : (L.x + R.x) / 2; // met this tick: just split the overlap

        L.x = contact - PINNED_GAP / 2;
        R.x = contact + PINNED_GAP / 2;
        if (L.x < this.stageLeft) {
            R.x += this.stageLeft - L.x;
            L.x = this.stageLeft;
        } else if (R.x > this.stageRight) {
            L.x -= R.x - this.stageRight;
            R.x = this.stageRight;
        }
    }

    // Both fighters must fit on screen: whoever moved away gets held back
    _keepInView() {
        const [L, R] = sides(this.player1, this.player2);
        const excess = R.x - L.x - this.maxSpread;
        if (excess <= 0) return;
        const lAway = L.x < L.prevX;
        const rAway = R.x > R.prevX;
        if (lAway && !rAway) L.x += excess;
        else if (rAway && !lAway) R.x -= excess;
        else {
            L.x += excess / 2;
            R.x -= excess / 2;
        }
    }

    _clampToStage() {
        for (const p of [this.player1, this.player2]) {
            p.x = Math.min(this.stageRight, Math.max(this.stageLeft, p.x));
        }
    }

    // Can't be pushed any further in direction `away` (wall, or the screen edge)
    _cornered(def, away) {
        const atWall = away > 0 ? def.x >= this.stageRight - 1 : def.x <= this.stageLeft + 1;
        const atViewEdge = Math.abs(this.player2.x - this.player1.x) >= this.maxSpread - 1;
        return atWall || atViewEdge;
    }

    // ---------- Hits ----------

    _probe(att, def) {
        const hit = att.activeHit();
        if (!hit) return null;

        const hitbox = att.hitbox(hit);
        const hurt = def.hurtboxes().find((h) => overlap(hitbox, h));
        if (!hurt) return null; // may still connect on a later active frame

        return {
            hit,
            outcome: this._guard(att, def, hit),
            // Read before either hit is applied (a hit cancels the defender's move)
            caught: def.hitState(),
            attackerTicks: att.ticksUntilActionable(),
            label: att.moveData().label,
            // Spark at the middle of where the boxes overlap
            x: (Math.max(hitbox.x0, hurt.x0) + Math.min(hitbox.x1, hurt.x1)) / 2,
            y: (Math.max(hitbox.y0, hurt.y0) + Math.min(hitbox.y1, hurt.y1)) / 2,
        };
    }

    _guard(att, def, hit) {
        if (def.ko || def.hitstun > 0 || def.isJumping) return "hit";
        // Guarding only covers the side you face: a cross-up from behind gets through
        const dx = att.centerX() - def.centerX();
        if (Math.abs(dx) > 4 && Math.sign(dx) !== def.facing) return "hit";
        const stand = def.isBlocking;
        const crouch = def.isCrouching && !stand;
        switch (hit.height) {
            case HEIGHT.MID:
                return stand || crouch ? "block" : "hit";
            case HEIGHT.LOW:
                return crouch ? "block" : "hit";
            case HEIGHT.HIGH:
            case HEIGHT.OVERHEAD:
            default:
                return stand ? "block" : "hit";
        }
    }

    _apply(att, def, { hit, outcome, attackerTicks, label, x, y, caught }) {
        att.contacts.add(hit.id);
        // Hits drive the defender away from the attacker (the attacker's facing if level)
        const away = Math.sign(def.centerX() - att.centerX()) || att.facing;
        const level = LEVEL[hit.level];
        const spark = { x, y, dir: att.forwardDir() };

        if (outcome === "block") {
            def.takeBlock(hit, attackerTicks, def.isCrouching ? "crouch" : "stand");
            this._push(att, def, hit.blockPush, away);
            this._startMeasure(att, def, label, "block");
            return {
                type: "block", attacker: att, defender: def, hit, ...spark,
                hitstop: level.blockHitstop, shake: 0, lethal: false,
            };
        }

        const comboing = def.hitstun > 0;
        const combo = this.combos[att.playerNum];
        if (!comboing || combo.count === 0 || combo.ended) Object.assign(combo, newCombo());

        // A repeat special in one combo knocks down instead of stunning again
        const special = hit.level === "special";
        if (special && combo.specials > 0) hit = { ...hit, knockdown: true };

        def.takeHit(hit, attackerTicks, away);
        if (!def.knockdown) this._push(att, def, hit.push, away);

        combo.count += 1;
        combo.damage += hit.damage;
        if (special) combo.specials += 1;
        combo.pop = 8;

        this._startMeasure(att, def, label, def.knockdown ? "hit (knockdown)" : "hit");

        const lethal = def.health <= 0;
        const knockdown = !!def.knockdown;
        return {
            type: "hit", attacker: att, defender: def, hit, ...spark, caught,
            hitstop: lethal ? 26 : level.hitstop + (knockdown ? 3 : 0),
            shake: lethal ? 16 : Math.max(level.shake, knockdown ? 8 : 0),
            lethal,
        };
    }

    // Push the defender away; against a wall or the screen edge the attacker is pushed back instead
    _push(att, def, px, away) {
        if (this._cornered(def, away)) {
            att.slide += Math.min(px, MAX_CORNER_PUSH);
            att.slideDir = -away;
        } else {
            def.slide += px;
            def.slideDir = away;
        }
    }

    // ---------- Combo counter ----------

    _updateCombos() {
        for (const [num, combo] of Object.entries(this.combos)) {
            const def = Number(num) === 1 ? this.player2 : this.player1;
            const reeling = def.hitstun > 0 || (def.knockdown && def.knockdown.phase === "air");
            if (combo.count > 0 && !combo.ended && !reeling && !def.ko) {
                combo.ended = true;
                combo.hold = 70;
            }
        }
    }

    // ---------- Frame advantage (shown with the ` key) ----------

    _startMeasure(att, def, label, kind) {
        this.pending = { att, def, label: `${att.charTitle} ${label}`, kind, attReady: null, defReady: null };
    }

    _measureAdvantage() {
        const m = this.pending;
        if (!m) return;
        if (m.attReady === null && m.att.canActThisTick) m.attReady = this.tickCount;
        if (m.defReady === null && m.def.canActThisTick) m.defReady = this.tickCount;
        if (m.attReady !== null && m.defReady !== null) {
            this.lastResult = { label: m.label, kind: m.kind, advantage: m.defReady - m.attReady };
            this.pending = null;
        }
    }
}
