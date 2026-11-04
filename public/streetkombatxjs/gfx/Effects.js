// ./gfx/Effects.js
//
// Hit sparks and screen shake. Everything is drawn with flat shapes
// (no blur, glow or gradients): sharp rays for hits, sized by strength,
// and cool-blue guard arcs for blocks so a block never reads as a hit.

const SPARKS = {
    light: { life: 9, rays: 7, len: 82, width: 15, layers: [["#ffffff", 1, 1], ["#ffd84a", 0.55, 0.7]], ring: 0 },
    medium: { life: 12, rays: 9, len: 115, width: 19, layers: [["#ff8a00", 1, 1], ["#ffe14d", 0.7, 0.75], ["#ffffff", 0.4, 0.5]], ring: 0 },
    heavy: { life: 16, rays: 12, len: 165, width: 24, layers: [["#c00000", 1, 1], ["#ff9a00", 0.75, 0.8], ["#ffffff", 0.45, 0.55]], ring: 1 },
    special: { life: 21, rays: 15, len: 215, width: 28, layers: [["#600000", 1.08, 1.1], ["#e00000", 0.9, 0.9], ["#ffb000", 0.65, 0.7], ["#ffffff", 0.38, 0.5]], ring: 2 },
};

export class Effects {
    constructor() {
        this.sparks = [];
        this.shakeTicks = 0;
        this.shakeLength = 0;
        this.shakeAmp = 0;
        this.seed = 7;
    }

    // Small deterministic PRNG so every spark looks a little different
    _rand() {
        this.seed = (this.seed * 16807) % 2147483647;
        return this.seed / 2147483647;
    }

    shake(amp, ticks) {
        if (amp <= 0) return;
        if (amp >= this._currentShake()) {
            this.shakeAmp = amp;
            this.shakeTicks = ticks;
            this.shakeLength = ticks;
        }
    }

    _currentShake() {
        return this.shakeTicks > 0 ? (this.shakeAmp * this.shakeTicks) / this.shakeLength : 0;
    }

    /** Current camera offset, or null when still. */
    shakeOffset() {
        if (this.shakeTicks <= 0) return null;
        const a = this._currentShake();
        const t = this.shakeTicks;
        return { x: Math.sin(t * 2.7) * a, y: Math.cos(t * 3.9) * a * 0.6 };
    }

    /**
     * @param {"light"|"medium"|"heavy"|"special"|"block"} kind
     * @param {number} x
     * @param {number} y
     * @param {number} dir - +1 if the attacker faces right, -1 if left
     */
    spark(kind, x, y, dir) {
        if (kind === "block") {
            this.sparks.push({ kind, x, y, dir, age: 0, life: 10 });
            return;
        }
        const spec = SPARKS[kind];
        const base = dir > 0 ? 0 : Math.PI;
        const rays = [];
        for (let i = 0; i < spec.rays; i++) {
            // Half the rays fly on through, away from the attacker; the rest burst all round
            const angle =
                i % 2 === 0
                    ? base + (this._rand() - 0.5) * Math.PI * 0.8
                    : (i / spec.rays) * Math.PI * 2 + this._rand() * 0.6;
            rays.push({
                angle,
                len: spec.len * (0.55 + 0.45 * this._rand()) * (i % 2 === 0 ? 1.15 : 0.85),
                width: spec.width * (0.7 + 0.6 * this._rand()),
            });
        }
        this.sparks.push({ kind, x, y, dir, age: 0, life: spec.life, spec, rays });
    }

    /**
     * Dust kicked up by a dash: flat puffs that swell, drift and shrink away.
     * @param {number} dir - direction the dust drifts (+1 right, -1 left)
     */
    dust(x, y, dir, size = 1) {
        const puffs = [];
        for (let i = 0; i < 5; i++) {
            puffs.push({
                dx: (this._rand() - 0.3) * 30 * dir,
                dy: -this._rand() * 10,
                r: (15 + this._rand() * 13) * size,
                vx: (1.2 + this._rand() * 2.2) * dir * size,
                vy: -(0.3 + this._rand() * 0.9),
            });
        }
        this.sparks.push({ kind: "dust", x, y, dir, age: 0, life: 18, puffs });
    }

    /**
     * Swing streak: a flat crescent that sweeps along an arc (angles in
     * degrees, 0 = right, + = down) to sell a limb or weapon's path. It is
     * centered on `local` in the owner's sprite box, so it moves with them.
     */
    swing({ owner, local, facing, radius, from, to, width, life }) {
        this.sparks.push({ kind: "swing", owner, local, facing, x: 0, y: 0, radius, from, to, width, age: 0, life });
    }

    /**
     * Two dumbbells swing in from either side and clang together at (x, y)
     * after `lead` ticks.
     */
    clash(x, y, dir, lead) {
        this.sparks.push({ kind: "clash", x, y, dir, lead, age: 0, life: lead + 14 });
    }

    /** @param {boolean} frozen - hitstop: motion trails and the clash hold still with the fighters */
    tick(frozen = false) {
        for (const s of this.sparks) {
            if (frozen && (s.kind === "swing" || s.kind === "clash")) continue;
            s.age++;
        }
        this.sparks = this.sparks.filter((s) => s.age < s.life);
        if (this.shakeTicks > 0) this.shakeTicks--;
    }

    render(ctx) {
        for (const s of this.sparks) {
            if (s.owner) {
                const [lx, ly] = s.local;
                s.x = s.facing > 0 ? s.owner.x + lx : s.owner.x + s.owner.width - lx;
                s.y = s.owner.y + ly;
            }
            ctx.save();
            ctx.translate(s.x, s.y);
            if (s.kind === "block") this._renderBlock(ctx, s);
            else if (s.kind === "dust") this._renderDust(ctx, s);
            else if (s.kind === "swing") this._renderSwing(ctx, s);
            else if (s.kind === "clash") this._renderClash(ctx, s);
            else this._renderHit(ctx, s);
            ctx.restore();
        }
    }

    _renderHit(ctx, s) {
        const t = s.age / s.life;
        // Snap out to full size almost instantly, then thin away
        const grow = t < 0.2 ? 0.8 + (t / 0.2) * 0.2 : 1 + (t - 0.2) * 0.25;
        const thin = t < 0.2 ? 1 : Math.max(0, 1 - (t - 0.2) / 0.8);

        s.spec.layers.forEach(([color, lenMul, widthMul], layer) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const r of s.rays) {
                const len = r.len * lenMul * grow;
                const w = (r.width * widthMul * thin) / 2;
                const cos = Math.cos(r.angle);
                const sin = Math.sin(r.angle);
                // Kite: narrow at the core, wide a third of the way out, sharp tip
                const mx = cos * len * 0.3;
                const my = sin * len * 0.3;
                ctx.moveTo(cos * 6, sin * 6);
                ctx.lineTo(mx - sin * w, my + cos * w);
                ctx.lineTo(cos * len, sin * len);
                ctx.lineTo(mx + sin * w, my - cos * w);
                ctx.closePath();
            }
            // Black keyline on the outer layer keeps sparks readable on busy stages
            if (layer === 0) {
                ctx.lineWidth = 4;
                ctx.lineJoin = "miter";
                ctx.strokeStyle = "#000";
                ctx.stroke();
            }
            ctx.fill();
        });

        // Hot core
        const core = s.spec.width * 1.1 * (t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.4));
        if (core > 0) {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, core, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shock rings on heavy hits
        for (let i = 0; i < s.spec.ring; i++) {
            const rt = Math.max(0, t - i * 0.15);
            const radius = s.spec.len * (0.3 + rt * 0.9);
            const lw = Math.max(0, 9 * (1 - rt * 1.4));
            if (lw <= 0) continue;
            ctx.strokeStyle = i === 0 ? "#ffffff" : "#ff9a00";
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _renderSwing(ctx, s) {
        const rad = (d) => (d * Math.PI) / 180;
        const t = s.age / s.life;
        // The head races to the end of the arc; the tail follows and catches up
        const headP = Math.min(1, t / 0.45);
        const tailP = Math.max(0, (t - 0.2) / 0.8);
        if (headP <= tailP) return;
        const a0 = rad(s.from + (s.to - s.from) * tailP);
        const a1 = rad(s.from + (s.to - s.from) * headP);
        const ccw = s.to < s.from;
        const thick = s.width * (1 - tailP * 0.6);

        ctx.globalAlpha = 0.92 * (1 - tailP * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, a0, a1, ccw);
        ctx.arc(0, 0, s.radius - thick, a1, a0, !ccw);
        ctx.closePath();
        // Black keyline, cream body: reads on busy stages and over a hit flash
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000";
        ctx.stroke();
        ctx.fillStyle = "#fff3c4";
        ctx.fill();
        // Gold leading edge
        ctx.strokeStyle = "#ffb000";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius - 2, a0, a1, ccw);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    _renderClash(ctx, s) {
        const t = Math.min(1, s.age / s.lead); // 0 → 1 as they swing in
        const ease = t * t; // accelerate into the hit
        const after = s.age - s.lead; // ticks since the clang
        const drawBell = (side) => {
            // Start out to the side and above, swing in to meet at the point
            const startAngle = side * 0.9;
            const angle = startAngle * (1 - ease);
            const dist = 70 * (1 - ease) + 16;
            const recoil = after > 0 ? Math.max(0, 8 - after) * 1.2 : 0;
            ctx.save();
            ctx.translate(side * (dist + recoil), -40 * (1 - ease));
            ctx.rotate(Math.PI / 2 + angle);
            // Handle, then a plate on each end
            ctx.fillStyle = "#3a3a3a";
            ctx.fillRect(-15, -4, 30, 8);
            for (const end of [-1, 1]) {
                ctx.fillStyle = "#151515";
                ctx.fillRect(end * 15 - (end > 0 ? 0 : 12), -14, 12, 28);
                ctx.fillStyle = "#6a6a6a";
                ctx.fillRect(end * 15 - (end > 0 ? 0 : 12), -14, 12, 4);
            }
            ctx.restore();
        };
        if (after < 10) {
            ctx.globalAlpha = after > 4 ? 1 - (after - 4) / 6 : 1;
            drawBell(-1);
            drawBell(1);
            ctx.globalAlpha = 1;
        }
        if (after >= 0) {
            // The clang: flat white streaks and a ring
            const k = Math.min(1, after / 12);
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 6 * (1 - k) + 1;
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + 0.2;
                const r0 = 20 + after * 4;
                const r1 = r0 + 26;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
                ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
                ctx.stroke();
            }
            ctx.strokeStyle = "#ffd84a";
            ctx.lineWidth = 5 * (1 - k);
            ctx.beginPath();
            ctx.arc(0, 0, 18 + after * 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    _renderDust(ctx, s) {
        const t = s.age / s.life;
        for (const p of s.puffs) {
            const x = p.dx + p.vx * s.age;
            const y = p.dy + p.vy * s.age;
            const r = p.r * (t < 0.25 ? 0.6 + t * 1.6 : 1 - (t - 0.25) * 1.1);
            if (r <= 0) continue;
            ctx.fillStyle = "#8a7558";
            ctx.beginPath();
            ctx.ellipse(x, y + r * 0.15, r, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#cbb796";
            ctx.beginPath();
            ctx.ellipse(x - r * 0.15, y - r * 0.1, r * 0.75, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderBlock(ctx, s) {
        const t = s.age / s.life;
        const fade = Math.max(0, 1 - t);
        // Concave arcs facing the attacker, like a shield taking the blow
        const face = s.dir > 0 ? Math.PI : 0;
        ctx.lineCap = "butt";
        const arcs = [
            ["#ffffff", 34, 9],
            ["#9fd3ff", 52, 8],
            ["#3d8bff", 70, 7],
        ];
        for (const [color, r, w] of arcs) {
            ctx.strokeStyle = color;
            ctx.lineWidth = w * fade;
            ctx.beginPath();
            ctx.arc(s.dir * t * 10, 0, r + t * 14, face - 0.9, face + 0.9);
            ctx.stroke();
        }
        // Chips flying back off the guard
        ctx.fillStyle = "#cfe8ff";
        for (let i = 0; i < 4; i++) {
            const a = face + (i - 1.5) * 0.45;
            const d = 40 + t * 60;
            const size = 9 * fade;
            ctx.fillRect(Math.cos(a) * d - size / 2, Math.sin(a) * d - size / 2, size, size);
        }
    }
}
