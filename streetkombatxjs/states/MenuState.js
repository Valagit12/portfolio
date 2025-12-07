// ./states/MenuState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { CharSelectState } from "./CharSelectState.js";
import { HelpState } from "./HelpState.js";

export class MenuState extends State {
    constructor(game) {
        super(game);
        this.timer = 0;
        this.selection = 0;

        this.up = false;
        this.down = false;
        this.enter = false;
        this.previousUp = false;
        this.previousDown = false;
        this.previousEnter = true;

        this.menu1 = Assets.menu[0];
        this.menu2 = Assets.menu[1];
        this.menu3 = Assets.menu[2];
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

        if (this.enter && !this.previousEnter) {
            if (this.selection === 0) {
                State.setState(new CharSelectState(this.game));
            } else if (this.selection === 1) {
                State.setState(new HelpState(this.game, this));
            } else {
                // NameEnterState was unused in this port
            }
        }

        this.previousUp = this.up;
        this.previousDown = this.down;
        this.previousEnter = this.enter;
    }

    render(ctx) {
        if (this.selection === 0) {
            ctx.drawImage(this.menu1, 0, 0, 1280, 720);
        } else if (this.selection === 1) {
            ctx.drawImage(this.menu2, 0, 0, 1280, 720);
        } else {
            ctx.drawImage(this.menu3, 0, 0, 1280, 720);
        }
    }
}
