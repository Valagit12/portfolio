// ./states/CharSelectState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { Animation } from "../gfx/Animation.js";
import { StageSelectState } from "./StageSelectState.js";
import { MenuState } from "./MenuState.js";
import { Dom } from "../players/Dom.js";
import { Kasai } from "../players/Kasai.js";

export class CharSelectState extends State {
    constructor(game) {
        super(game);

        // Cursors
        this.player1SelectionHorizontal = 0;
        this.player1SelectionVertical = 0;
        this.player2SelectionHorizontal = 0;
        this.player2SelectionVertical = 0;
        this.xPlayer1 = 0;
        this.xPlayer2 = 0;
        this.yPlayer1 = 0;
        this.yPlayer2 = 0;

        // Inputs
        this.player1Right = false;
        this.player1Left = false;
        this.player1Up = false;
        this.player1Down = false;

        this.player2Right = false;
        this.player2Left = false;
        this.player2Up = false;
        this.player2Down = false;

        this.enter = false;
        this.escape = false;
        this.previousEnter = true;
        this.previousEscape = true;

        this.player1 = null;
        this.player2 = null;

        this.charSelectScreen = Assets.charSelectScreen;

        this.dom_stance_player1 = new Animation(66.668, Assets.dom_stance_player1);
        this.dom_stance_player2 = new Animation(66.668, Assets.dom_stance_player2);
        this.kasai_stance_player1 = new Animation(
            66.668,
            Assets.kasai_stance_player1
        );
        this.kasai_stance_player2 = new Animation(
            66.668,
            Assets.kasai_stance_player2
        );
    }

    tick() {
        this.dom_stance_player1.tick();
        this.dom_stance_player2.tick();
        this.kasai_stance_player1.tick();
        this.kasai_stance_player2.tick();

        const km = this.game.getKeyManager();

        this.player1Right = km.isPlayer1_right();
        this.player1Left = km.isPlayer1_left();
        this.player1Up = km.isPlayer1_jump();
        this.player1Down = km.isPlayer1_crouch();

        this.player2Right = km.isPlayer2_right();
        this.player2Left = km.isPlayer2_left();
        this.player2Up = km.isPlayer2_jump();
        this.player2Down = km.isPlayer2_crouch();

        this.enter = km.isEnter();
        this.escape = km.isEscape();

        // Player 1 cursor
        if (this.player1Right && this.player1SelectionHorizontal === 0) {
            this.player1SelectionHorizontal += 1;
        } else if (
            this.player1Left &&
            this.player1SelectionHorizontal === 1
        ) {
            this.player1SelectionHorizontal -= 1;
        }

        if (this.player1Up && this.player1SelectionVertical === 1) {
            this.player1SelectionVertical -= 1;
        } else if (
            this.player1Down &&
            this.player1SelectionVertical === 0
        ) {
            this.player1SelectionVertical += 1;
        }

        // Player 2 cursor
        if (this.player2Right && this.player2SelectionHorizontal === 0) {
            this.player2SelectionHorizontal += 1;
        } else if (
            this.player2Left &&
            this.player2SelectionHorizontal === 1
        ) {
            this.player2SelectionHorizontal -= 1;
        }

        if (this.player2Up && this.player2SelectionVertical === 1) {
            this.player2SelectionVertical -= 1;
        } else if (
            this.player2Down &&
            this.player2SelectionVertical === 0
        ) {
            this.player2SelectionVertical += 1;
        }

        // Cursor positions
        this.xPlayer1 = this.player1SelectionHorizontal === 0 ? 487 : 642;
        this.yPlayer1 = this.player1SelectionVertical === 0 ? 163 : 315;

        this.xPlayer2 = this.player2SelectionHorizontal === 0 ? 618 : 773;
        this.yPlayer2 = this.player2SelectionVertical === 0 ? 164 : 316;

        this.confirmSelection();

        this.previousEnter = this.enter;
        this.previousEscape = this.escape;
    }

    render(ctx) {
        ctx.drawImage(this.charSelectScreen, 0, 0);

        ctx.fillStyle = "red";
        ctx.fillRect(this.xPlayer1, this.yPlayer1, 20, 20);

        ctx.fillStyle = "blue";
        ctx.fillRect(this.xPlayer2, this.yPlayer2, 20, 20);

        const frame1 = this.getCurrentAnimationState_Player1();
        const frame2 = this.getCurrentAnimationState_Player2();

        if (frame1) {
            ctx.drawImage(frame1, 29, 161, 411, 822);
        }
        if (frame2) {
            ctx.drawImage(frame2, 861, 161, 411, 822);
        }

        ctx.font = Assets.dragonForceNum;
        ctx.fillStyle = "red";
        ctx.fillText(this.getCharTitle_Player1(), 77, 81);
        ctx.fillText(this.getCharTitle_Player2(), 1020, 81);
    }

    confirmSelection() {
        if (
            this.player1SelectionVertical !== 1 &&
            this.player2SelectionVertical !== 1 &&
            this.enter &&
            !this.previousEnter
        ) {
            // P1
            if (
                this.player1SelectionHorizontal === 0 &&
                this.player1SelectionVertical === 0
            ) {
                this.player1 = new Dom(this.game, 200, 410, 150, 300, 1);
            } else if (
                this.player1SelectionHorizontal === 1 &&
                this.player1SelectionVertical === 0
            ) {
                this.player1 = new Kasai(this.game, 200, 410, 150, 300, 1);
            }

            // P2
            if (
                this.player2SelectionHorizontal === 0 &&
                this.player2SelectionVertical === 0
            ) {
                this.player2 = new Dom(this.game, 1000, 410, 150, 300, 2);
            } else if (
                this.player2SelectionHorizontal === 1 &&
                this.player2SelectionVertical === 0
            ) {
                this.player2 = new Kasai(this.game, 1000, 410, 150, 300, 2);
            }

            State.setState(
                new StageSelectState(this.game, this.player1, this.player2)
            );
        }

        if (this.escape && !this.previousEscape) {
            State.setState(new MenuState(this.game));
        }
    }

    getCurrentAnimationState_Player1() {
        if (
            this.player1SelectionHorizontal === 0 &&
            this.player1SelectionVertical === 0
        ) {
            return this.dom_stance_player1.getCurrentFrame();
        }
        if (
            this.player1SelectionHorizontal === 1 &&
            this.player1SelectionVertical === 0
        ) {
            return this.kasai_stance_player1.getCurrentFrame();
        }
        return null;
    }

    getCurrentAnimationState_Player2() {
        if (
            this.player2SelectionHorizontal === 0 &&
            this.player2SelectionVertical === 0
        ) {
            return this.dom_stance_player2.getCurrentFrame();
        }
        if (
            this.player2SelectionHorizontal === 1 &&
            this.player2SelectionVertical === 0
        ) {
            return this.kasai_stance_player2.getCurrentFrame();
        }
        return null;
    }

    getCharTitle_Player1() {
        if (
            this.player1SelectionHorizontal === 0 &&
            this.player1SelectionVertical === 0
        ) {
            return "Dom";
        }
        if (
            this.player1SelectionHorizontal === 1 &&
            this.player1SelectionVertical === 0
        ) {
            return "Kasai";
        }
        return "";
    }

    getCharTitle_Player2() {
        if (
            this.player2SelectionHorizontal === 0 &&
            this.player2SelectionVertical === 0
        ) {
            return "Dom";
        }
        if (
            this.player2SelectionHorizontal === 1 &&
            this.player2SelectionVertical === 0
        ) {
            return "Kasai";
        }
        return "";
    }
}
