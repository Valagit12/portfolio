// ./states/GameState.js
import { State } from "./State.js";
import { Assets } from "../gfx/Assets.js";
import { Animation } from "../gfx/Animation.js";
import { CollisionCheck } from "../collision/CollisionCheck.js";
import { HelpState } from "./HelpState.js";
import { MenuState } from "./MenuState.js";
import { EndState } from "./EndState.js";

export class GameState extends State {
    constructor(game, player1, player2, stage) {
        super(game);

        this.player1 = player1;
        this.player2 = player2;

        this.stage = stage;
        this.background = new Animation(60, this.stage);

        this.collisionCheck = new CollisionCheck(this.player1, this.player2);

        this.time = 93;
        this.ticks = 0;
        this.endTimer = 0;
        this.selection = 0;
        this.winner = "";

        this.escape = false;
        this.up = false;
        this.down = false;
        this.enter = false;
        this.previousUp = false;
        this.previousDown = false;
        this.pause = false;

        this.pauseScreen = Assets.pause;
    }

    tick() {
        const km = this.game.getKeyManager();

        this.escape = km.isEscape();

        if (
            this.escape &&
            !(
                this.player1.getHealth() <= 0 ||
                this.player2.getHealth() <= 0 ||
                this.time <= 0
            )
        ) {
            this.pause = true;
        }

        if (this.pause) {
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
                    this.pause = false;
                } else if (this.selection === 1) {
                    State.setState(new HelpState(this.game, this));
                } else {
                    State.setState(new MenuState(this.game));
                }
            }

            this.previousDown = this.down;
            this.previousUp = this.up;
        } else {
            if (this.time > 0 && this.ticks === 60) {
                this.time -= 1;
                this.ticks = 0;
            }

            this.ticks += 1;

            if (this.time <= 90) {
                this.background.tick();
                this.player1.tick();
                this.player2.tick();
                this.collisionCheck.checkCollision(this.time);

                if (
                    this.time <= 0 ||
                    this.player1.getHealth() <= 0 ||
                    this.player2.getHealth() <= 0
                ) {
                    if (this.player1.getHealth() < this.player2.getHealth()) {
                        this.winner = `${this.player2.getCharTitle()} wins`;
                    } else if (
                        this.player2.getHealth() < this.player1.getHealth()
                    ) {
                        this.winner = `${this.player1.getCharTitle()} wins`;
                    } else {
                        this.winner = "Tie Game";
                    }

                    if (this.endTimer >= 5) {
                        State.setState(
                            new EndState(this.game, this.player1, this.player2, this.stage)
                        );
                    }

                    if (this.ticks >= 60) {
                        this.endTimer += 1;
                    }
                }
            }
        }
    }

    render(ctx) {
        ctx.drawImage(this.background.getCurrentFrame(), 0, 0);
        this.player1.render(ctx);
        this.player2.render(ctx);

        ctx.font = Assets.dragonForceNum;
        ctx.fillStyle = "red";

        if (this.time > 90) {
            ctx.fillText("90", 615, 113);
            if (this.time > 91) {
                ctx.fillText("READY", 550, 350);
            } else {
                ctx.fillText("FIGHT", 550, 350);
            }
        } else {
            ctx.fillText(String(this.time), 615, 113);
        }

        if (
            this.player1.getHealth() <= 0 ||
            this.player2.getHealth() <= 0 ||
            this.time <= 0
        ) {
            this.endScreen(ctx, this.winner);
        }

        if (this.pause) {
            if (this.selection === 0) {
                ctx.drawImage(this.pauseScreen[0], 0, 0, 1280, 720);
            } else if (this.selection === 1) {
                ctx.drawImage(this.pauseScreen[1], 0, 0, 1280, 720);
            } else {
                ctx.drawImage(this.pauseScreen[2], 0, 0, 1280, 720);
            }
        }
    }

    endScreen(ctx, charTitle) {
        ctx.font = Assets.dragonForceEndScreen;
        ctx.fillStyle = "red";
        ctx.fillText(this.winner, 490, 350);
    }
}
