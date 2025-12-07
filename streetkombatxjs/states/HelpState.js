// ./states/HelpState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";

export class HelpState extends State {
    constructor(game, previousState) {
        super(game);

        this.previousState = previousState;
        this.pagelvl = 0;

        this.right = false;
        this.left = false;
        this.escape = false;
        this.previousLeft = false;
        this.previousRight = false;

        this.hlpScr1 = Assets.help[0];
        this.hlpScr2 = Assets.help[1];
        this.hlpScr3 = Assets.help[2];
        this.hlpScr4 = Assets.help[3];
        this.hlpScrCtrl = Assets.help[4];
    }

    tick() {
        const km = this.game.getKeyManager();

        this.right = km.isPlayer2_right();
        this.left = km.isPlayer2_left();
        this.escape = km.isEscape();

        if (this.pagelvl < 4 && this.right && !this.previousRight) {
            this.pagelvl += 1;
        } else if (this.pagelvl > 0 && this.left && !this.previousLeft) {
            this.pagelvl -= 1;
        }

        if (this.escape) {
            State.setState(this.previousState);
        }

        this.previousRight = this.right;
        this.previousLeft = this.left;
    }

    render(ctx) {
        if (this.pagelvl === 0) {
            ctx.drawImage(this.hlpScr1, 0, 0, 1280, 720);
        } else if (this.pagelvl === 1) {
            ctx.drawImage(this.hlpScr2, 0, 0, 1280, 720);
        } else if (this.pagelvl === 2) {
            ctx.drawImage(this.hlpScr3, 0, 0, 1280, 720);
        } else if (this.pagelvl === 3) {
            ctx.drawImage(this.hlpScr4, 0, 0, 1280, 720);
        } else if (this.pagelvl === 4) {
            ctx.drawImage(this.hlpScrCtrl, 0, 0, 1280, 720);
        }
    }
}
