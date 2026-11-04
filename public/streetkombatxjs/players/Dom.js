// ./players/Dom.js

import { Player } from "./Player.js";
import { Animation } from "../gfx/Animation.js";
import { Assets } from "../gfx/Assets.js";
import { DOM_STRING, DOM_SPECIAL, DOM_MOVES } from "./moves.js";

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
            this.walk_left = new Animation(33, Assets.dom_walk_left_player1);
            this.walk_right = new Animation(33, Assets.dom_walk_right_player1);
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
            this.walk_left = new Animation(33, Assets.dom_walk_left_player2);
            this.walk_right = new Animation(33, Assets.dom_walk_right_player2);
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

        this.charTitle = "Dom";
        this.dashTrail = "powder"; // dashes leave protein powder behind
        this.stringHits = DOM_STRING;
        this.moves.special = DOM_SPECIAL;
        Object.assign(this.moves, DOM_MOVES); // hand-picked frames, steps and a streak on every attack

        // Dom can cancel 1,1 into the special once its second hit connects
        this.canCancelComboIntoSpecial = true;
    }
}
