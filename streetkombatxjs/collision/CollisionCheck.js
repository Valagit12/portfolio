// ./collision/CollisionCheck.js

import { Rectangle } from "./Rectangle.js";

// Handles positioning / pushback and all hit detection + stun/health logic.
export class CollisionCheck {
    /**
     * @param {Player} player1
     * @param {Player} player2
     */
    constructor(player1, player2) {
        this.hitIndex_player1 = 0;
        this.comboIndex_player1 = 0;
        this.hitIndex_player2 = 0;
        this.comboIndex_player2 = 0;
        this.collisionOffset = 30;
        this.xPlayer1 = 0;
        this.xPlayer2 = 0;

        this.player1 = player1;
        this.player2 = player2;

        this.hitbox_player1 = null;
        this.hitbox_player2 = null;

        this.canSpecialCancel = false;
    }

    /**
     * @param {number} time - remaining match time
     */
    checkCollision(time) {
        this.hitbox_player1 = this.player1.getHitbox();
        this.hitbox_player2 = this.player2.getHitbox();

        const p1 = this.player1;
        const p2 = this.player2;

        // Position / pushback logic
        if (p1.getHealth() > 0 && p2.getHealth() > 0 && time > 0) {
            if (p1.getX() + p1.getWidth() > p2.getX() + this.collisionOffset) {
                // They are overlapping / crossing each other
                if (p2.getIsWalkingLeft() && !p1.getIsWalkingRight()) {
                    // Push player1 left if player2 walks into them
                    if (p1.getX() < 0) {
                        p1.setX(0);
                        p2.setX(p1.getX() + p1.getWidth() - this.collisionOffset);
                    } else {
                        p1.setX(p2.getX() + this.collisionOffset - p1.getWidth());
                    }
                } else if (!p2.getIsWalkingLeft() && p1.getIsWalkingRight()) {
                    // Push player2 right if player1 walks into them
                    if (p2.getX() > 1150) {
                        p2.setX(1150);
                        p1.setX(p2.getX() + this.collisionOffset - p1.getWidth());
                    } else {
                        p2.setX(p1.getX() + p1.getWidth() - this.collisionOffset);
                    }
                } else {
                    // Both touching but not actively moving into each other
                    this.xPlayer1 = p2.getX() + this.collisionOffset - p1.getWidth();
                    this.xPlayer2 = p1.getX() + p1.getWidth() - this.collisionOffset;
                    p1.setX(this.xPlayer1);
                    p2.setX(this.xPlayer2);
                }
            } else {
                // Not touching, clamp to stage limits
                if (p1.getX() < 0) {
                    p1.setX(0);
                }
                if (p2.getX() > 1150) {
                    p2.setX(1150);
                }
            }
        }

        // Time-out knockback
        if (time <= 0) {
            if (p1.getHealth() < p2.getHealth()) {
                p1.setKnockBack(2000);
            } else if (p2.getHealth() < p1.getHealth()) {
                p2.setKnockBack(2000);
            }
        }

        // In range?
        if (Rectangle.isIntersecting(this.hitbox_player1, this.hitbox_player2)) {
            // === PLAYER 1 HITTING PLAYER 2 ===

            if (p1.getIsJumpingOne() && p1.getIsActive() && !p2.getIsBlocking()) {
                p2.setIsHit(true);
                if (this.hitIndex_player1 < 1) {
                    p2.setHealth(5);
                }
                this.hitIndex_player1++;
            } else if (
                p1.getIsJumpingTwo() &&
                p1.getIsActive() &&
                !p2.getIsBlocking()
            ) {
                p2.setIsHit(true);
                if (this.hitIndex_player1 < 1) {
                    p2.setHealth(7);
                }
                this.hitIndex_player1++;
            } else if (
                p1.getIsDownOne() &&
                p1.getIsActive() &&
                !p2.getIsBlocking() &&
                !p2.getIsCrouching()
            ) {
                p2.setIsHit(true);
                if (this.hitIndex_player1 < 1) {
                    p2.setHealth(5);
                }
                this.hitIndex_player1++;
            } else if (
                p1.getIsDownTwo() &&
                p1.getIsActive() &&
                !p2.getIsCrouching()
            ) {
                p2.setIsHit(true);
                if (this.hitIndex_player1 < 1) {
                    p2.setHealth(7);
                }
                this.hitIndex_player1++;
            } else if (
                p1.getIsStandingTwo() &&
                p1.getIsActive() &&
                !p2.getIsBlocking()
            ) {
                p2.setIsHit(true);
                if (this.hitIndex_player1 < 1) {
                    p2.setHealth(8);
                }
                this.hitIndex_player1++;
            } else if (p1.getIsSpecial() && p1.getIsActive()) {
                if (p1.getCharTitle() === "Kasai") {
                    if (!p2.getIsBlocking() && !p2.isStun()) {
                        p2.setIsHit(true);
                        if (this.hitIndex_player1 < 1) {
                            p2.setHealth(7);
                            p2.setStun(120);
                        }
                        this.hitIndex_player1++;
                    }
                } else {
                    if (
                        (!p2.getIsCrouching() &&
                            !p2.getIsBlocking() &&
                            !p2.isStun()) ||
                        this.canSpecialCancel
                    ) {
                        p2.setIsHit(true);
                        p2.setStun(120);
                        if (this.hitIndex_player1 < 1) {
                            p2.setHealth(7);
                            p2.setStun(120);
                        }
                        this.hitIndex_player1++;
                        this.canSpecialCancel = false;
                    }
                }
            } else if (p1.getIsStandingOne() && p1.getIsActive()) {
                if (p1.getCharTitle() === "Kasai") {
                    if (p2.getIsCrouching()) {
                        p1.setStun(40);
                    }
                    if (!p2.getIsCrouching() && !p2.getIsBlocking()) {
                        p2.setIsHit(true);
                        if (this.hitIndex_player1 < 1) {
                            p2.setHealth(5);
                            this.comboIndex_player1++;
                        }
                        this.hitIndex_player1++;
                    }
                } else {
                    if (p2.getIsCrouching() || p2.getIsBlocking()) {
                        p1.setStun(40);
                    }
                    if (!p2.getIsCrouching() && !p2.getIsBlocking()) {
                        p2.setIsHit(true);
                        if (this.hitIndex_player1 < 1) {
                            p2.setHealth(5);
                            this.comboIndex_player1++;
                        }
                        this.hitIndex_player1++;
                    }
                }
            } else if (p1.getIsStandingOneOne() && p1.getIsActive()) {
                if (p1.getCharTitle() === "Kasai") {
                    if (!p2.getIsCrouching()) {
                        p2.setIsHit(true);
                        if (this.comboIndex_player1 < 2) {
                            p2.setHealth(5);
                            this.comboIndex_player1++;
                        }
                        this.hitIndex_player1++;
                    }
                } else {
                    if (!p2.getIsCrouching() && !p2.getIsBlocking()) {
                        p2.setIsHit(true);
                        if (this.comboIndex_player1 < 2) {
                            p2.setHealth(5);
                            this.comboIndex_player1++;
                            p2.setStun(40);
                        }
                        this.hitIndex_player1++;
                        this.canSpecialCancel = true;
                    }
                }
            } else if (p1.getIsStandingOneOneOne() && p1.getIsActive()) {
                if (p1.getCharTitle() === "Kasai") {
                    if (!p2.getIsCrouching()) {
                        p2.setIsHit(true);
                        if (this.comboIndex_player1 < 3) {
                            p2.setHealth(5);
                            this.comboIndex_player1++;
                        }
                        this.hitIndex_player1++;
                        if (p1.getComboFrame() === 15) {
                            p2.setKnockBack(20);
                        }
                    }
                } else {
                    if (!p2.getIsCrouching() && !p2.getIsBlocking()) {
                        p2.setIsHit(true);
                        if (this.comboIndex_player1 < 3) {
                            p2.setHealth(5);
                            this.comboIndex_player1++;
                        }
                        this.hitIndex_player1++;
                        if (p1.getComboFrame() === 15) {
                            p2.setKnockBack(20);
                        }
                    }
                }
            } else {
                p2.setIsHit(false);
                this.hitIndex_player1 = 0;
                this.comboIndex_player1 = 0;
            }

            // === PLAYER 2 HITTING PLAYER 1 ===

            if (p2.getIsJumpingOne() && p2.getIsActive() && !p1.getIsBlocking()) {
                p1.setIsHit(true);
                if (this.hitIndex_player2 < 1) {
                    p1.setHealth(5);
                }
                this.hitIndex_player2++;
            } else if (
                p2.getIsJumpingTwo() &&
                p2.getIsActive() &&
                !p1.getIsBlocking()
            ) {
                p1.setIsHit(true);
                if (this.hitIndex_player2 < 1) {
                    p1.setHealth(7);
                }
                this.hitIndex_player2++;
            } else if (
                p2.getIsDownOne() &&
                p2.getIsActive() &&
                !p1.getIsBlocking() &&
                !p1.getIsCrouching()
            ) {
                p1.setIsHit(true);
                if (this.hitIndex_player2 < 1) {
                    p1.setHealth(5);
                }
                this.hitIndex_player2++;
            } else if (
                p2.getIsDownTwo() &&
                p2.getIsActive() &&
                !p1.getIsCrouching()
            ) {
                p1.setIsHit(true);
                if (this.hitIndex_player2 < 1) {
                    p1.setHealth(7);
                }
                this.hitIndex_player2++;
            } else if (
                p2.getIsStandingTwo() &&
                p2.getIsActive() &&
                !p1.getIsBlocking()
            ) {
                p1.setIsHit(true);
                if (this.hitIndex_player2 < 1) {
                    p1.setHealth(8);
                }
                this.hitIndex_player2++;
            } else if (p2.getIsSpecial() && p2.getIsActive()) {
                if (p2.getCharTitle() === "Kasai") {
                    if (!p1.getIsBlocking() && !p1.isStun()) {
                        p1.setIsHit(true);
                        if (this.hitIndex_player2 < 1) {
                            p1.setHealth(7);
                            p1.setStun(120);
                        }
                        this.hitIndex_player2++;
                    }
                } else {
                    if (
                        (!p1.getIsCrouching() &&
                            !p1.getIsBlocking() &&
                            !p1.isStun()) ||
                        this.canSpecialCancel
                    ) {
                        p1.setIsHit(true);
                        if (this.hitIndex_player2 < 1) {
                            p1.setHealth(7);
                            p1.setStun(120);
                        }
                        this.hitIndex_player2++;
                        this.canSpecialCancel = false;
                    }
                }
            } else if (p2.getIsStandingOne() && p2.getIsActive()) {
                if (p2.getCharTitle() === "Kasai") {
                    if (p1.getIsCrouching()) {
                        p2.setStun(40);
                    }
                    if (!p1.getIsCrouching()) {
                        p1.setIsHit(true);
                        if (this.hitIndex_player2 < 1) {
                            p1.setHealth(5);
                            this.comboIndex_player2++;
                        }
                        this.hitIndex_player2++;
                    }
                } else {
                    if (p1.getIsCrouching() || p1.getIsBlocking()) {
                        p2.setStun(40);
                    }
                    if (!p1.getIsCrouching() && !p1.getIsBlocking()) {
                        p1.setIsHit(true);
                        if (this.hitIndex_player2 < 1) {
                            p1.setHealth(5);
                            this.comboIndex_player2++;
                        }
                        this.hitIndex_player2++;
                    }
                }
            } else if (p2.getIsStandingOneOne() && p2.getIsActive()) {
                if (p2.getCharTitle() === "Kasai") {
                    if (!p1.getIsCrouching()) {
                        p1.setIsHit(true);
                        if (this.comboIndex_player2 < 2) {
                            p1.setHealth(5);
                            this.comboIndex_player2++;
                        }
                        this.hitIndex_player2++;
                    }
                } else {
                    if (!p1.getIsCrouching() && !p1.getIsBlocking()) {
                        p1.setIsHit(true);
                        if (this.comboIndex_player2 < 2) {
                            p1.setHealth(5);
                            this.comboIndex_player2++;
                            p1.setStun(40);
                        }
                        this.hitIndex_player2++;
                        this.canSpecialCancel = true;
                    }
                }
            } else if (p2.getIsStandingOneOneOne() && p2.getIsActive()) {
                if (p2.getCharTitle() === "Kasai") {
                    if (!p1.getIsCrouching()) {
                        p1.setIsHit(true);
                        if (this.comboIndex_player2 < 3) {
                            p1.setHealth(5);
                            this.comboIndex_player2++;
                        }
                        this.hitIndex_player2++;
                        if (p2.getComboFrame() === 15) {
                            p1.setKnockBack(20);
                        }
                    }
                } else {
                    if (!p1.getIsCrouching() && !p1.getIsBlocking()) {
                        p1.setIsHit(true);
                        if (this.comboIndex_player2 < 3) {
                            p1.setHealth(5);
                            this.comboIndex_player2++;
                            p1.setKnockBack(20);
                        }
                        this.hitIndex_player2++;
                        if (p2.getComboFrame() === 15) {
                            p1.setKnockBack(20);
                        }
                    }
                }
            } else {
                // No hit
                p1.setIsHit(false);
                this.hitIndex_player2 = 0;
                this.comboIndex_player2 = 0;
            }
        } else {
            // Not in range
            this.player1.setIsHit(false);
            this.player2.setIsHit(false);
        }
    }
}
