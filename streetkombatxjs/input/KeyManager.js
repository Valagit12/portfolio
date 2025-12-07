// ./input/KeyManager.js

export class KeyManager {
    constructor() {
        // Boolean array indexed by keyCode (like Java's VK_* codes)
        this.keys = new Array(256).fill(false);

        // Player 1
        this.player1_jump = false;
        this.player1_crouch = false;
        this.player1_left = false;
        this.player1_right = false;
        this.player1_block = false;
        this.player1_1 = false;
        this.player1_2 = false;
        this.player1_special = false;

        // Player 2
        this.player2_jump = false;
        this.player2_crouch = false;
        this.player2_left = false;
        this.player2_right = false;
        this.player2_block = false;
        this.player2_1 = false;
        this.player2_2 = false;
        this.player2_special = false;

        // Other keys
        this.enter = false;
        this.escape = false;
    }

    // Called once per tick (60 times per second) from Game.tick()
    tick() {
        const k = this.keys;

        // Enter / Escape
        this.enter = !!k[13]; // Enter
        this.escape = !!k[27]; // Escape

        // Player 1 input (WASD + YERT)
        this.player1_jump = !!k[87]; // W
        this.player1_crouch = !!k[83]; // S
        this.player1_right = !!k[68]; // D
        this.player1_left = !!k[65]; // A
        this.player1_block = !!k[89]; // Y
        this.player1_1 = !!k[69]; // E
        this.player1_2 = !!k[82]; // R
        this.player1_special = !!k[84]; // T

        // Player 2 input (arrows + M / , . /)
        this.player2_jump = !!k[38]; // Up
        this.player2_crouch = !!k[40]; // Down
        this.player2_right = !!k[39]; // Right
        this.player2_left = !!k[37]; // Left
        this.player2_block = !!k[77]; // M
        this.player2_1 = !!k[191]; // /
        this.player2_2 = !!k[190]; // .
        this.player2_special = !!k[188]; // ,
    }

    // To be wired by Game:
    // window.addEventListener("keydown", e => keyManager.onKeyDown(e));
    // window.addEventListener("keyup",   e => keyManager.onKeyUp(e));

    onKeyDown(e) {
        const code = e.keyCode || e.which;
        if (code >= 0 && code < this.keys.length) {
            this.keys[code] = true;
        }
    }

    onKeyUp(e) {
        const code = e.keyCode || e.which;
        if (code >= 0 && code < this.keys.length) {
            this.keys[code] = false;
        }
    }

    // Accessors (match Java method names)

    isPlayer1_jump() {
        return this.player1_jump;
    }

    isPlayer1_crouch() {
        return this.player1_crouch;
    }

    isPlayer1_left() {
        return this.player1_left;
    }

    isPlayer1_right() {
        return this.player1_right;
    }

    isPlayer1_block() {
        return this.player1_block;
    }

    isPlayer1_1() {
        return this.player1_1;
    }

    isPlayer1_2() {
        return this.player1_2;
    }

    isPlayer1_special() {
        return this.player1_special;
    }

    isPlayer2_jump() {
        return this.player2_jump;
    }

    isPlayer2_crouch() {
        return this.player2_crouch;
    }

    isPlayer2_left() {
        return this.player2_left;
    }

    isPlayer2_right() {
        return this.player2_right;
    }

    isPlayer2_block() {
        return this.player2_block;
    }

    isPlayer2_1() {
        return this.player2_1;
    }

    isPlayer2_2() {
        return this.player2_2;
    }

    isPlayer2_special() {
        return this.player2_special;
    }

    isEnter() {
        return this.enter;
    }

    isEscape() {
        return this.escape;
    }
}
