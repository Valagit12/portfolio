// ./states/IntroState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { MenuState } from "./MenuState.js";

export class IntroState extends State {
    constructor(game) {
        super(game);
        this.tickCounter = 0;
        this.timer = 0;
        this.loading1 = Assets.loading1;
        this.loading2 = Assets.loading2;
    }

    tick() {
        if (this.tickCounter === 60) {
            this.timer += 1;
            this.tickCounter = 0;
        }
        this.tickCounter += 1;

        if (this.timer >= 10) {
            State.setState(new MenuState(this.game));
        }
    }

    render(ctx) {
        if (this.timer > 0 && this.timer < 4) {
            ctx.drawImage(this.loading1, 0, 0, 1280, 720);
        } else if (this.timer > 4 && this.timer < 8) {
            ctx.drawImage(this.loading2, 0, 0, 1280, 720);
        } else {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, 1280, 720);
        }
    }
}
