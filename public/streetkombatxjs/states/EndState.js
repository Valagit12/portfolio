// ./states/EndState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { GameState } from "./GameState.js";
import { CharSelectState } from "./CharSelectState.js";
import { MenuState } from "./MenuState.js";
import { Dom } from "../players/Dom.js";
import { Kasai } from "../players/Kasai.js";

export class EndState extends State {
    constructor(game, player1, player2, stage) {
        super(game);

        if (player1.getCharTitle() === "Kasai") {
            this.player1 = new Kasai(this.game, 200, 410, 150, 300, 1);
        } else if (player1.getCharTitle() === "Dom") {
            this.player1 = new Dom(this.game, 200, 410, 150, 300, 1);
        }

        if (player2.getCharTitle() === "Kasai") {
            this.player2 = new Kasai(this.game, 1000, 410, 150, 300, 2);
        } else if (player2.getCharTitle() === "Dom") {
            this.player2 = new Dom(this.game, 1000, 410, 150, 300, 2);
        }

        this.stage = stage;
        this.endScreen = Assets.endScreen;

        this.selection = 0;
        this.up = false;
        this.down = false;
        this.enter = false;
        this.previousDown = false;
        this.previousUp = false;
    }

    tick() {
        const km = this.game.getKeyManager();

        this.up = km.isPlayer2_jump();
        this.down = km.isPlayer2_crouch();
        this.enter = km.isEnter();

        if (this.selection < 2 && this.down && !this.previousDown) {
            this.selection += 1;
        } else if (this.selection > 0 && this.up && !this.previousUp) {
            this.selection -= 1;
        }

        if (this.enter) {
            if (this.selection === 0) {
                State.setState(
                    new GameState(this.game, this.player1, this.player2, this.stage)
                );
            } else if (this.selection === 1) {
                State.setState(new CharSelectState(this.game));
            } else {
                State.setState(new MenuState(this.game));
            }
        }

        this.previousDown = this.down;
        this.previousUp = this.up;
    }

    render(ctx) {
        if (this.selection === 0) {
            ctx.drawImage(this.endScreen[0], 0, 0, 1280, 720);
        } else if (this.selection === 1) {
            ctx.drawImage(this.endScreen[1], 0, 0, 1280, 720);
        } else {
            ctx.drawImage(this.endScreen[2], 0, 0, 1280, 720);
        }
    }
}
