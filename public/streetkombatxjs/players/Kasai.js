// ./players/Kasai.js

import { Player } from "./Player.js";
import { Animation } from "../gfx/Animation.js";
import { Assets } from "../gfx/Assets.js";
import { KASAI_STRING, KASAI_SPECIAL, KASAI_MOVES, KASAI_FIRE_BLADE } from "./moves.js";

export class Kasai extends Player {
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
            this.stance = new Animation(66.668, Assets.kasai_stance_player1);
            this.walk_left = new Animation(33, Assets.kasai_walk_left_player1);
            this.walk_right = new Animation(33, Assets.kasai_walk_right_player1);
            this.block = new Animation(20, Assets.kasai_block_player1);
            this.crouch = new Animation(20, Assets.kasai_crouch_player1);
            this.jump = new Animation(50, Assets.kasai_jump_player1);
            this.jump1 = new Animation(50, Assets.kasai_jump1_player1);
            this.jump2 = new Animation(50, Assets.kasai_jump2_player1);
            this.hit = new Animation(50, Assets.kasai_hit_player1);
            this.down1 = new Animation(30, Assets.kasai_down1_player1);
            this.down2 = new Animation(70, Assets.kasai_down2_player1);
            this.standing2 = new Animation(90, Assets.kasai_2_player1);
            this.standing1 = new Animation(50, Assets.kasai_1_player1);
            this.standing11 = new Animation(50, Assets.kasai_11_player1);
            this.standing111 = new Animation(50, Assets.kasai_111_player1);
            this.special = new Animation(100, Assets.kasai_special_player1);
        } else if (playerNum === 2) {
            this.stance = new Animation(66.668, Assets.kasai_stance_player2);
            this.walk_left = new Animation(33, Assets.kasai_walk_left_player2);
            this.walk_right = new Animation(33, Assets.kasai_walk_right_player2);
            this.block = new Animation(20, Assets.kasai_block_player2);
            this.crouch = new Animation(20, Assets.kasai_crouch_player2);
            this.jump = new Animation(50, Assets.kasai_jump_player2);
            this.jump1 = new Animation(50, Assets.kasai_jump1_player2);
            this.jump2 = new Animation(50, Assets.kasai_jump2_player2);
            this.hit = new Animation(50, Assets.kasai_hit_player2);
            this.down1 = new Animation(30, Assets.kasai_down1_player2);
            this.down2 = new Animation(70, Assets.kasai_down2_player2);
            this.standing2 = new Animation(90, Assets.kasai_2_player2);
            this.standing1 = new Animation(50, Assets.kasai_1_player2);
            this.standing11 = new Animation(50, Assets.kasai_11_player2);
            this.standing111 = new Animation(50, Assets.kasai_111_player2);
            this.special = new Animation(100, Assets.kasai_special_player2);
        }

        this.charTitle = "Kasai";
        this.dashTrail = "fire"; // dashes leave fire behind
        this.stringHits = KASAI_STRING;
        this.moves.special = KASAI_SPECIAL;
        Object.assign(this.moves, KASAI_MOVES); // fire streaks on every attack, the reworked jump 1
        this.fireBlade = KASAI_FIRE_BLADE; // flames reaching past his sword
    }
}
