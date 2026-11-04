// ./players/Player.js

import { Rectangle } from "../collision/Rectangle.js";
import { Assets } from "../gfx/Assets.js";

// Base Player class for Dom / Kasai
export class Player {
    /**
     * @param {Game} game
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} playerNum 1 or 2
     */
    constructor(game, x, y, width, height, playerNum) {
        this.playerNum = playerNum;
        this.x = x;
        this.y = y;
        this.yInitial = y;
        this.width = width;
        this.height = height;
        this.game = game;

        // Core stats
        this.health = 100;
        this.jumpAttackIndex = 0;
        this.comboIndex = 0;
        this.recovery = 0;
        this.stun = 0;
        this.knockBack = 0;

        // Recovery values (frames)
        this.standing2Recovery = 10;
        this.down1Recovery = 15;
        this.down2Recovery = 9;
        this.jump1Recovery = 5;
        this.standing1Recovery = 9;
        this.standing11Recovery = 12;
        this.standing111Recovery = 5;
        this.specialMoveRecovery = 28;

        // Input flags
        this.left = false;
        this.right = false;
        this.up = false;
        this.down = false;
        this.blocking = false;
        this.one = false;
        this.two = false;
        this.specialButton = false;
        this.previousOne = false;

        // State flags
        this.isWalkingLeft = false;
        this.isWalkingRight = false;
        this.isBlocking = false;
        this.isCrouching = false;
        this.isJumping = false;
        this.isAbleToPress = true;
        this.isJumpingOne = false;
        this.isJumpingTwo = false;
        this.isDownOne = false;
        this.isDownTwo = false;
        this.isStandingOne = false;
        this.isStandingTwo = false;
        this.isStandingOneOne = false;
        this.isStandingOneOneOne = false;
        this.isSpecial = false;
        this.isActive = false;
        this.isHit = false;
        this.isRecovering = false;

        this.hitbox = null; // Concrete classes create it
        this.charTitle = "";

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

    /**
     * Draw health bars and name tags for this player.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawHealth(ctx) {
        if (this.playerNum === 1) {
            ctx.fillStyle = "black";
            this._fillPolygon(
                ctx,
                this.xNameTag_Player1,
                this.yNameTag_Player1,
                this.xNameTag_Player1.length
            );
            ctx.fillStyle = "red";
            ctx.font = Assets.dragonForce || "50px sans-serif";
            ctx.fillText(this.charTitle, 120, 150);

            // Background bar
            this._fillRoundRect(ctx, 80, 60, 450, 50, 25, 25, "red");

            // Foreground (yellow) health amount
            const w = (450 * this.health) / 100;
            this._fillRoundRect(ctx, 80, 60, w, 50, 25, 25, "yellow");
        } else {
            ctx.fillStyle = "black";
            this._fillPolygon(
                ctx,
                this.xNameTag_Player2,
                this.yNameTag_Player2,
                this.xNameTag_Player2.length
            );
            ctx.fillStyle = "red";
            ctx.font = Assets.dragonForce || "50px sans-serif";
            ctx.fillText(this.charTitle, 1080, 150);

            // Background bar
            this._fillRoundRect(ctx, 750, 60, 450, 50, 25, 25, "red");

            // Foreground (yellow), right-to-left
            const w = (450 * this.health) / 100;
            const x = 750 + (450 - w);
            this._fillRoundRect(ctx, x, 60, w, 50, 25, 25, "yellow");
        }
    }

    /**
     * Is the player stunned (stun > 0)?
     */
    isStun() {
        return this.stun > 0;
    }

    // --- Accessors / Mutators ---

    getWidth() {
        return this.width;
    }

    getX() {
        return this.x;
    }

    setX(x) {
        this.x = x;
    }

    setKnockBack(knockBack) {
        this.knockBack = knockBack;
    }

    getHitbox() {
        return this.hitbox;
    }

    setStun(stun) {
        this.stun = stun;
    }

    setHealth(healthDecrease) {
        this.health -= healthDecrease;
    }

    getHealth() {
        return this.health;
    }

    getCharTitle() {
        return this.charTitle;
    }

    getStance() {
        return this.stance;
    }

    getComboFrame() {
        return this.standing111 ? this.standing111.getCurrentIndex() : 0;
    }

    getIsWalkingLeft() {
        return this.isWalkingLeft;
    }
    setIsWalkingLeft(v) {
        this.isWalkingLeft = v;
    }

    getIsWalkingRight() {
        return this.isWalkingRight;
    }
    setIsWalkingRight(v) {
        this.isWalkingRight = v;
    }

    getIsBlocking() {
        return this.isBlocking;
    }
    setIsBlocking(v) {
        this.isBlocking = v;
    }

    getIsCrouching() {
        return this.isCrouching;
    }
    setIsCrouching(v) {
        this.isCrouching = v;
    }

    getIsJumping() {
        return this.isJumping;
    }
    setIsJumping(v) {
        this.isJumping = v;
    }

    getIsAbleToPress() {
        return this.isAbleToPress;
    }
    setIsAbleToPress(v) {
        this.isAbleToPress = v;
    }

    getIsJumpingOne() {
        return this.isJumpingOne;
    }
    setIsJumpingOne(v) {
        this.isJumpingOne = v;
    }

    getIsJumpingTwo() {
        return this.isJumpingTwo;
    }
    setIsJumpingTwo(v) {
        this.isJumpingTwo = v;
    }

    getIsDownOne() {
        return this.isDownOne;
    }
    setIsDownOne(v) {
        this.isDownOne = v;
    }

    getIsDownTwo() {
        return this.isDownTwo;
    }
    setIsDownTwo(v) {
        this.isDownTwo = v;
    }

    getIsStandingOne() {
        return this.isStandingOne;
    }
    setIsStandingOne(v) {
        this.isStandingOne = v;
    }

    getIsStandingTwo() {
        return this.isStandingTwo;
    }
    setIsStandingTwo(v) {
        this.isStandingTwo = v;
    }

    getIsStandingOneOne() {
        return this.isStandingOneOne;
    }
    setIsStandingOneOne(v) {
        this.isStandingOneOne = v;
    }

    getIsStandingOneOneOne() {
        return this.isStandingOneOneOne;
    }
    setIsStandingOneOneOne(v) {
        this.isStandingOneOneOne = v;
    }

    getIsSpecial() {
        return this.isSpecial;
    }
    setIsSpecial(v) {
        this.isSpecial = v;
    }

    getIsActive() {
        return this.isActive;
    }
    setIsActive(v) {
        this.isActive = v;
    }

    getIsHit() {
        return this.isHit;
    }
    setIsHit(v) {
        this.isHit = v;
    }

    getIsRecovering() {
        return this.isRecovering;
    }
    setIsRecovering(v) {
        this.isRecovering = v;
    }

    // --- Abstract-ish methods, to be implemented in subclasses ---

    tick() {
        throw new Error("Player.tick() must be implemented by subclasses");
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        throw new Error("Player.render() must be implemented by subclasses");
    }

    // --- Helpers for Canvas equivalents of Java2D methods ---

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
        const rX = radiusX || 0;
        const rY = radiusY || rX;

        ctx.beginPath();
        ctx.moveTo(x + rX, y);
        ctx.lineTo(x + width - rX, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + rY);
        ctx.lineTo(x + width, y + height - rY);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - rX,
            y + height
        );
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
