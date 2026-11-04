// ./states/StageSelectState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { GameState } from "./GameState.js";
import { CharSelectState } from "./CharSelectState.js";

export class StageSelectState extends State {
    constructor(game, player1, player2) {
        super(game);

        this.stageSelectionHorizontal = 0;
        this.stageSelectionVertical = 0;
        this.xPlayer = 466;
        this.yPlayer = 234;

        this.right = false;
        this.left = false;
        this.up = false;
        this.down = false;
        this.enter = false;
        this.escape = false;
        this.previousEnter = true;
        this.previousEscape = true;

        this.player1 = player1;
        this.player2 = player2;

        this.stageSelectScreen = Assets.stageSelectScreen;
        this.stage = null;
    }

    tick() {
        this.player1.getStance().tick();
        this.player2.getStance().tick();

        const km = this.game.getKeyManager();

        this.right = km.isPlayer2_right();
        this.left = km.isPlayer2_left();
        this.up = km.isPlayer2_jump();
        this.down = km.isPlayer2_crouch();

        this.enter = km.isEnter();
        this.escape = km.isEscape();

        if (this.right && this.stageSelectionHorizontal === 0) {
            this.stageSelectionHorizontal += 1;
        } else if (
            this.left &&
            this.stageSelectionHorizontal === 1
        ) {
            this.stageSelectionHorizontal -= 1;
        }

        if (this.up && this.stageSelectionVertical === 1) {
            this.stageSelectionVertical -= 1;
        } else if (
            this.down &&
            this.stageSelectionVertical === 0
        ) {
            this.stageSelectionVertical += 1;
        }

        this.xPlayer = this.stageSelectionHorizontal === 0 ? 466 : 647;
        this.yPlayer = this.stageSelectionVertical === 0 ? 234 : 344;

        this.confirmSelection();

        this.previousEnter = this.enter;
        this.previousEscape = this.escape;
    }

    render(ctx) {
        ctx.drawImage(this.stageSelectScreen, 0, 0, 1280, 720);
        ctx.drawImage(
            this.player1.getStance().getCurrentFrame(),
            29,
            161,
            411,
            822
        );
        ctx.drawImage(
            this.player2.getStance().getCurrentFrame(),
            861,
            161,
            411,
            822
        );

        ctx.font = Assets.dragonForceNum;
        ctx.fillStyle = "red";
        ctx.fillText(this.player1.getCharTitle(), 77, 81);
        ctx.fillText(this.player1.getCharTitle(), 1020, 81);
        ctx.fillText(this.getStageTitle(), 425, 180);

        ctx.strokeStyle = "red";
        for (let i = 0; i < 4; i++) {
            ctx.strokeRect(
                this.xPlayer + i,
                this.yPlayer + i,
                166 - 2 * i,
                98 - 2 * i
            );
        }
    }

    getStageTitle() {
        if (
            this.stageSelectionHorizontal === 0 &&
            this.stageSelectionVertical === 0
        ) {
            return "Kasai's Fire Temple";
        }
        if (
            this.stageSelectionHorizontal === 1 &&
            this.stageSelectionVertical === 0
        ) {
            return "King Dom's Kingdom";
        }
        return "";
    }

    confirmSelection() {
        if (
            this.stageSelectionVertical !== 1 &&
            this.stageSelectionVertical !== 1 && // same condition as Java
            this.enter &&
            !this.previousEnter
        ) {
            if (
                this.stageSelectionHorizontal === 0 &&
                this.stageSelectionVertical === 0
            ) {
                this.stage = Assets.fireTemple;
            } else if (
                this.stageSelectionHorizontal === 1 &&
                this.stageSelectionVertical === 0
            ) {
                this.stage = Assets.kingdom;
            }

            State.setState(
                new GameState(this.game, this.player1, this.player2, this.stage)
            );
        }

        if (this.escape && !this.previousEscape) {
            State.setState(new CharSelectState(this.game));
        }
    }
}
