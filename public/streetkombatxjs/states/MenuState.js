// ./states/MenuState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { CharSelectState } from "./CharSelectState.js";
import { HelpState } from "./HelpState.js";
import { Settings, ROUND_TIMES } from "../settings.js";
import { Sound } from "../audio/Sound.js";

// The third row is the round timer, drawn over the menu art (which has an
// empty slot there). Positions are in canvas pixels; the art is 1920x1080
// drawn at 1280x720.
const TIMER_ROW = { x: 640, baseline: 603, font: '40px "DragonForcE"', color: "#600000" };
// The selection arrow is copied from the art's "Fight" row (source pixels in the 1920x1080 image)
const ARROW_SRC = { x: 1085, y: 690, w: 85, h: 60 };
const ARROW_GAP = 13; // between the text and the arrow, as on the other rows
// Fourth row, under the timer: Player 2 is a person or the CPU
const CPU_ROW = { ...TIMER_ROW, baseline: 658 };
const LAST_ROW = 3;

export class MenuState extends State {
    constructor(game) {
        super(game);
        this.timer = 0;
        this.selection = 0;

        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        this.enter = false;
        this.previousUp = false;
        this.previousDown = false;
        this.previousLeft = false;
        this.previousRight = false;
        this.previousEnter = true;

        this.menu1 = Assets.menu[0];
        this.menu2 = Assets.menu[1];
        this.menu3 = Assets.menu[2];
    }

    tick() {
        const km = this.game.getKeyManager();

        this.up = km.isPlayer2_jump();
        this.down = km.isPlayer2_crouch();
        this.left = km.isPlayer2_left();
        this.right = km.isPlayer2_right();
        this.enter = km.isEnter();

        const before = `${this.selection}/${Settings.roundTime}/${Settings.cpu}`;
        if (this.selection < LAST_ROW && this.down && !this.previousDown) {
            this.selection += 1;
        } else if (this.selection > 0 && this.up && !this.previousUp) {
            this.selection -= 1;
        }

        // Timer row: left / right change the round time
        if (this.selection === 2) {
            if (this.right && !this.previousRight) Settings.stepRoundTime(1);
            else if (this.left && !this.previousLeft) Settings.stepRoundTime(-1);
        }
        // CPU row: left / right switch it
        if (this.selection === 3 && ((this.right && !this.previousRight) || (this.left && !this.previousLeft))) {
            Settings.toggleCpu();
        }

        if (this.enter && !this.previousEnter) {
            Sound.play(this.selection >= 2 ? "menu_move" : "menu_select");
            if (this.selection === 0) {
                State.setState(new CharSelectState(this.game));
            } else if (this.selection === 1) {
                State.setState(new HelpState(this.game, this));
            } else if (this.selection === 2) {
                Settings.stepRoundTime(1, true); // Enter cycles through the times too
            } else {
                Settings.toggleCpu();
            }
        }

        if (!(this.enter && !this.previousEnter) && `${this.selection}/${Settings.roundTime}/${Settings.cpu}` !== before) Sound.play("menu_move");

        this.previousUp = this.up;
        this.previousDown = this.down;
        this.previousLeft = this.left;
        this.previousRight = this.right;
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
        this.renderTimerRow(ctx);
        this.renderCpuRow(ctx);
    }

    renderCpuRow(ctx) {
        const selected = this.selection === 3;
        const text = selected ? `CPU: < ${Settings.cpu ? "On" : "Off"} >` : `CPU: ${Settings.cpu ? "On" : "Off"}`;
        ctx.save();
        ctx.font = CPU_ROW.font;
        ctx.fillStyle = CPU_ROW.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(text, CPU_ROW.x, CPU_ROW.baseline);
        if (selected) this.drawArrow(ctx, CPU_ROW.x + ctx.measureText(text).width / 2 + ARROW_GAP, CPU_ROW.baseline - 37);
        ctx.restore();
    }

    /** The selection arrow, copied from the art's "Fight" row. */
    drawArrow(ctx, x, y) {
        const scale = 1280 / this.menu1.naturalWidth;
        ctx.drawImage(this.menu1, ARROW_SRC.x, ARROW_SRC.y, ARROW_SRC.w, ARROW_SRC.h, x, y, ARROW_SRC.w * scale, ARROW_SRC.h * scale);
    }

    renderTimerRow(ctx) {
        const selected = this.selection === 2;
        const time = Settings.roundTime;
        // While selected, < and > show which ways it can still go
        const less = selected && time > ROUND_TIMES[0] ? "< " : "";
        const more = selected && time < ROUND_TIMES[ROUND_TIMES.length - 1] ? " >" : "";
        const text = `Timer: ${less}${time}${more}`;

        ctx.save();
        ctx.font = TIMER_ROW.font;
        ctx.fillStyle = TIMER_ROW.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(text, TIMER_ROW.x, TIMER_ROW.baseline);

        if (selected) {
            const scale = 1280 / this.menu1.naturalWidth;
            const w = ARROW_SRC.w * scale;
            const h = ARROW_SRC.h * scale;
            const x = TIMER_ROW.x + ctx.measureText(text).width / 2 + ARROW_GAP;
            // Same vertical offset from the baseline as the Fight row's arrow
            const y = TIMER_ROW.baseline - 37;
            ctx.drawImage(this.menu1, ARROW_SRC.x, ARROW_SRC.y, ARROW_SRC.w, ARROW_SRC.h, x, y, w, h);
        }
        ctx.restore();
    }
}
