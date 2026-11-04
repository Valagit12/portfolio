// ./players/Dom.js

import { Player } from "./Player.js";
import { Rectangle } from "../collision/Rectangle.js";
import { Animation } from "../gfx/Animation.js";
import { Assets } from "../gfx/Assets.js";

export class Dom extends Player {
    /**
     * @param {Game} game
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} playerNum
     */
    constructor(game, x, y, width, height, playerNum) {
        super(game, x, y, width, height, playerNum);

        if (playerNum === 1) {
            this.stance = new Animation(66.668, Assets.dom_stance_player1);
            this.walk_left = new Animation(50, Assets.dom_walk_left_player1);
            this.walk_right = new Animation(50, Assets.dom_walk_right_player1);
            this.block = new Animation(20, Assets.dom_block_player1);
            this.crouch = new Animation(20, Assets.dom_crouch_player1);
            this.jump = new Animation(50, Assets.dom_jump_player1);
            this.jump1 = new Animation(50, Assets.dom_jump1_player1);
            this.jump2 = new Animation(50, Assets.dom_jump2_player1);
            this.hit = new Animation(50, Assets.dom_hit_player1);
            this.down1 = new Animation(30, Assets.dom_down1_player1);
            this.down2 = new Animation(70, Assets.dom_down2_player1);
            this.standing2 = new Animation(90, Assets.dom_2_player1);
            this.standing1 = new Animation(50, Assets.dom_1_player1);
            this.standing11 = new Animation(50, Assets.dom_11_player1);
            this.standing111 = new Animation(50, Assets.dom_111_player1);
            this.special = new Animation(100, Assets.dom_special_player1);
        } else if (playerNum === 2) {
            this.stance = new Animation(66.668, Assets.dom_stance_player2);
            this.walk_left = new Animation(50, Assets.dom_walk_left_player2);
            this.walk_right = new Animation(50, Assets.dom_walk_right_player2);
            this.block = new Animation(20, Assets.dom_block_player2);
            this.crouch = new Animation(20, Assets.dom_crouch_player2);
            this.jump = new Animation(50, Assets.dom_jump_player2);
            this.jump1 = new Animation(50, Assets.dom_jump1_player2);
            this.jump2 = new Animation(50, Assets.dom_jump2_player2);
            this.hit = new Animation(50, Assets.dom_hit_player2);
            this.down1 = new Animation(30, Assets.dom_down1_player2);
            this.down2 = new Animation(70, Assets.dom_down2_player2);
            this.standing2 = new Animation(90, Assets.dom_2_player2);
            this.standing1 = new Animation(50, Assets.dom_1_player2);
            this.standing11 = new Animation(50, Assets.dom_11_player2);
            this.standing111 = new Animation(50, Assets.dom_111_player2);
            this.special = new Animation(100, Assets.dom_special_player2);
        }

        this.hitbox = new Rectangle(this.x | 0, this.y | 0, width, height);
        this.charTitle = "Dom";
    }

    tick() {
        this._setHitbox();
        this.stance.tick();
        this.walk_left.tick();
        this.walk_right.tick();

        const km = this.game.getKeyManager();

        if (this.playerNum === 1) {
            if (this.isAbleToPress) {
                this.up = km.isPlayer1_jump();
                this.down = km.isPlayer1_crouch();
            }
            this.right = km.isPlayer1_right();
            this.left = km.isPlayer1_left();
            this.blocking = km.isPlayer1_block();
            this.one = km.isPlayer1_1();
            this.two = km.isPlayer1_2();
            this.specialButton = km.isPlayer1_special();
        } else if (this.playerNum === 2) {
            if (this.isAbleToPress) {
                this.up = km.isPlayer2_jump();
                this.down = km.isPlayer2_crouch();
            }
            this.right = km.isPlayer2_right();
            this.left = km.isPlayer2_left();
            this.blocking = km.isPlayer2_block();
            this.one = km.isPlayer2_1();
            this.two = km.isPlayer2_2();
            this.specialButton = km.isPlayer2_special();
        }

        if (this.health <= 0) {
            this.setKnockBack(2000);
        }

        if (this.recovery > 0) {
            this.up = false;
            this.down = false;
            this.right = false;
            this.left = false;
            this.blocking = false;
            this.one = false;
            this.two = false;
            this.recovery--;
        }

        if (this.stun > 0) {
            this.up = false;
            this.down = false;
            this.right = false;
            this.left = false;
            this.blocking = false;
            this.one = false;
            this.two = false;
            this.stun--;
        }

        if (this.knockBack > 0) {
            if (this.playerNum === 1) {
                this.x -= 10;
                this.knockBack--;
            } else {
                this.x += 10;
                this.knockBack--;
            }
        }

        if (this.y < this.yInitial) {
            this.isAbleToPress = false;
            this.y += 7;
            if (this.y > this.yInitial) {
                this.y = this.yInitial;
            }
        } else if (this.y === this.yInitial) {
            this.isAbleToPress = true;
            this.isJumpingOne = false;
            this.isJumpingTwo = false;
            this.isActive = false;
            this.jump1.setIndex(0);
            this.jumpAttackIndex = 0;
        }

        if (this.isHit) {
            if (this.hit.getCurrentIndex() < 3) {
                this.hit.tick();
            }
        } else if (this.hit.getCurrentIndex() !== 0) {
            this.isRecovering = true;
            this.hit.tick();
        } else {
            this.hit.setIndex(0);
            this.isRecovering = false;
        }

        if (this.isJumping) {
            if (this.jump.getCurrentIndex() < 4) {
                this.y -= 20;
            } else if (this.jump.getCurrentIndex() === 6) {
                this.isJumping = false;
                this.jump.setIndex(0);
            }
            this.jump.tick();
        }

        if (!this.isAbleToPress) {
            if (this.isJumpingOne) {
                if (this.jump1.getCurrentIndex() === 5) {
                    this.isJumpingOne = false;
                    this.jump1.setIndex(0);
                    this.jumpAttackIndex++;
                    this.recovery = this.jump1Recovery;
                    this.isActive = false;
                } else if (
                    this.jump1.getCurrentIndex() === 2 ||
                    this.jump1.getCurrentIndex() === 3 ||
                    this.jump1.getCurrentIndex() === 4
                ) {
                    this.isActive = true;
                    this.jump1.tick();
                } else {
                    this.jump1.tick();
                    this.isActive = false;
                }
            }
        }

        if (this.isBlocking) {
            this.right = false;
            this.left = false;
            this.up = false;
            this.one = false;
            this.two = false;
            this.isCrouching = false;
            if (this.blocking) {
                if (this.block.getCurrentIndex() < 4) {
                    this.block.tick();
                }
            } else {
                if (this.block.getCurrentIndex() !== 6) {
                    this.block.tick();
                } else {
                    this.block.setIndex(0);
                }
            }
        }

        if (this.isCrouching) {
            this.right = false;
            this.left = false;
            this.up = false;
            this.isBlocking = false;
            if (this.down) {
                if (this.crouch.getCurrentIndex() < 5) {
                    this.crouch.tick();
                }
            } else {
                if (this.crouch.getCurrentIndex() !== 7) {
                    this.crouch.tick();
                } else {
                    this.crouch.setIndex(0);
                }
            }
        }

        if (this.isDownOne) {
            this.up = false;
            this.one = false;
            this.two = false;
            if (this.down1.getCurrentIndex() === 7) {
                this.down1.setIndex(0);
                this.isDownOne = false;
                this.recovery = this.down1Recovery;
                this.isActive = false;
            } else if (
                this.down1.getCurrentIndex() >= 3 &&
                this.down1.getCurrentIndex() <= 5
            ) {
                this.isActive = true;
                this.down1.tick();
            } else {
                this.down1.tick();
                this.isActive = false;
            }
        } else if (this.isDownTwo) {
            this.up = false;
            this.one = false;
            this.two = false;
            if (this.down2.getCurrentIndex() === 8) {
                this.down2.setIndex(0);
                this.isDownTwo = false;
                this.recovery = this.down2Recovery;
                this.isActive = false;
            } else if (
                this.down2.getCurrentIndex() === 4 ||
                this.down2.getCurrentIndex() === 5
            ) {
                this.isActive = true;
                this.down2.tick();
            } else {
                this.down2.tick();
                this.isActive = false;
            }
        }

        if (this.isStandingTwo) {
            this.up = false;
            this.left = false;
            this.right = false;
            this.one = false;
            this.two = false;
            if (this.standing2.getCurrentIndex() === 7) {
                this.standing2.setIndex(0);
                this.isStandingTwo = false;
                this.recovery = this.standing2Recovery;
                this.isActive = false;
            } else if (
                this.standing2.getCurrentIndex() >= 3 &&
                this.standing2.getCurrentIndex() <= 5
            ) {
                this.standing2.tick();
                this.isActive = true;
            } else {
                this.standing2.tick();
                this.isActive = false;
            }
        }

        if (this.isStandingOne) {
            this.up = false;
            this.left = false;
            this.right = false;
            this.two = false;
            this.specialButton = false;
            if (this.standing1.getCurrentIndex() === 9) {
                this.standing1.setIndex(0);
                this.isStandingOne = false;
                this.recovery = this.standing1Recovery;
                this.isActive = false;
                this.comboIndex = 0;
            } else if (
                this.standing1.getCurrentIndex() >= 2 &&
                this.standing1.getCurrentIndex() <= 4
            ) {
                this.standing1.tick();
                this.isActive = true;
            } else {
                this.standing1.tick();
                this.isActive = false;
            }
        }

        if (this.isStandingOneOne) {
            this.up = false;
            this.left = false;
            this.right = false;
            this.two = false;
            if (this.playerNum === 1) {
                this.x += 1;
            } else {
                this.x -= 1;
            }
            if (this.standing11.getCurrentIndex() === 15) {
                this.standing11.setIndex(0);
                this.standing1.setIndex(0);
                this.isStandingOneOne = false;
                this.recovery = this.standing11Recovery;
                this.isActive = false;
                this.comboIndex = 0;
            } else if (
                this.standing11.getCurrentIndex() >= 2 &&
                this.standing11.getCurrentIndex() <= 13
            ) {
                this.standing11.tick();
                this.isActive = true;
            } else {
                this.standing11.tick();
                this.isActive = false;
            }
        }

        if (this.isStandingOneOneOne) {
            this.up = false;
            this.left = false;
            this.right = false;
            this.two = false;
            this.specialButton = false;
            if (this.playerNum === 1) {
                this.x += 1;
            } else {
                this.x -= 1;
            }
            if (this.standing111.getCurrentIndex() === 20) {
                this.standing111.setIndex(0);
                this.standing11.setIndex(0);
                this.standing1.setIndex(0);
                this.isStandingOneOneOne = false;
                this.recovery = this.standing111Recovery;
                this.isActive = false;
                this.comboIndex = 0;
            } else if (
                this.standing111.getCurrentIndex() >= 2 &&
                // Note: mirrors original: checks standing11 here, not standing111
                this.standing11.getCurrentIndex() <= 18
            ) {
                this.standing111.tick();
                this.isActive = true;
            } else {
                this.standing111.tick();
                this.isActive = false;
            }
        }

        if (this.isSpecial) {
            this.up = false;
            this.left = false;
            this.right = false;
            this.one = false;
            this.two = false;
            this.specialButton = false;
            if (this.special.getCurrentIndex() === 10) {
                this.special.setIndex(0);
                this.isSpecial = false;
                this.recovery = this.specialMoveRecovery;
                this.isActive = false;
            } else if (
                this.special.getCurrentIndex() >= 4 &&
                this.special.getCurrentIndex() <= 6
            ) {
                this.special.tick();
                this.isActive = true;
            } else {
                this.special.tick();
                this.isActive = false;
            }
        }

        if (this.up) {
            this.isJumping = true;
            this.isAbleToPress = false;
            this.up = false;
        }

        if (this.blocking || this.block.getCurrentIndex() !== 0) {
            this.isBlocking = true;
        } else {
            this.isBlocking = false;
        }

        if ((this.down || this.crouch.getCurrentIndex() !== 0) && !this.isBlocking) {
            this.isCrouching = true;
        } else {
            this.isCrouching = false;
        }

        if (this.one) {
            if (!this.previousOne) {
                this.comboIndex++;
            }
            if (!this.isAbleToPress && this.jumpAttackIndex < 1) {
                this.isJumpingOne = true;
            } else if (this.isCrouching) {
                this.isDownOne = true;
            } else if (
                this.comboIndex === 2 &&
                this.isStandingOne &&
                this.standing1.getCurrentIndex() <= 6
            ) {
                this.isStandingOneOne = true;
                this.isStandingOne = false;
                this.standing11.setIndex(this.standing1.getCurrentIndex());
            } else if (
                this.comboIndex === 3 &&
                this.isStandingOneOne &&
                this.standing11.getCurrentIndex() <= 12
            ) {
                this.isStandingOneOneOne = true;
                this.isStandingOneOne = false;
                this.standing111.setIndex(this.standing11.getCurrentIndex());
            } else {
                this.isStandingOne = true;
            }
            this.previousOne = true;
        } else {
            this.previousOne = false;
        }

        if (this.two) {
            if (!this.isAbleToPress && this.jumpAttackIndex < 1) {
                this.isJumpingTwo = true;
                this.isActive = true;
            } else if (this.isCrouching) {
                this.isDownTwo = true;
            } else {
                this.isStandingTwo = true;
            }
        }

        if (this.specialButton) {
            this.isSpecial = true;
        }

        if (this.right) {
            this.x += 3;
            this.isWalkingRight = true;
            this.isWalkingLeft = false;
        } else if (this.left) {
            this.x -= 3;
            this.isWalkingLeft = true;
            this.isWalkingRight = false;
        } else {
            this.isWalkingLeft = false;
            this.isWalkingRight = false;
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const img = this._getCurrentAnimationState();
        if (!img) return;
        ctx.drawImage(
            img,
            Math.round(this.x),
            Math.round(this.y),
            this.width,
            this.height
        );
        this.drawHealth(ctx);
    }

    _getCurrentAnimationState() {
        if (this.isHit || this.isRecovering) {
            return this.hit.getCurrentFrame();
        }

        if (this.stun > 0) {
            return this.hit.getFrame(this.hit.getCurrentIndex());
        }

        if (this.isSpecial) {
            return this.special.getCurrentFrame();
        }

        if (this.isStandingOne) {
            return this.standing1.getCurrentFrame();
        }

        if (this.isStandingOneOne) {
            return this.standing11.getCurrentFrame();
        }

        if (this.isStandingOneOneOne) {
            return this.standing111.getCurrentFrame();
        }

        if (this.isStandingTwo) {
            return this.standing2.getCurrentFrame();
        }

        if (this.isDownOne) {
            return this.down1.getCurrentFrame();
        }

        if (this.isDownTwo) {
            return this.down2.getCurrentFrame();
        }

        if (this.isJumpingTwo) {
            return this.jump2.getCurrentFrame();
        }

        if (this.isJumpingOne) {
            return this.jump1.getCurrentFrame();
        }

        if (this.isJumping) {
            return this.jump.getCurrentFrame();
        }

        if (this.isBlocking) {
            return this.block.getCurrentFrame();
        }

        if (this.isCrouching) {
            return this.crouch.getCurrentFrame();
        }

        if (this.isWalkingLeft) {
            return this.walk_left.getCurrentFrame();
        } else if (this.isWalkingRight) {
            return this.walk_right.getCurrentFrame();
        } else {
            return this.stance.getCurrentFrame();
        }
    }

    _setHitbox() {
        this.hitbox.setLeft(this.x | 0);
        this.hitbox.setBottom(this.y | 0);
    }
}
