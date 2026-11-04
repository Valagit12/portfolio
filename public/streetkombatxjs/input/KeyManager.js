// ./input/KeyManager.js
//
// Keys are tracked by physical position (KeyboardEvent.code), so bindings work
// regardless of keyboard layout or modifier state.
//
// Two kinds of input:
//  - held: is the key down right now (movement, block, crouch, menus)
//  - presses: each fresh key-down is time-stamped in ticks and kept in a short
//    buffer, so attacks pressed slightly early (during another move or its
//    recovery) still come out, and taps shorter than one tick are never lost.

// How long (in 60 Hz ticks) a press waits to be used before it is dropped
export const PRESS_BUFFER_TICKS = 10;

const BINDINGS = {
    1: {
        up: "KeyW",
        down: "KeyS",
        left: "KeyA",
        right: "KeyD",
        block: "KeyY",
        one: "KeyE",
        two: "KeyR",
        special: "KeyT",
    },
    2: {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        block: "KeyM",
        one: "Slash",
        two: "Period",
        special: "Comma",
    },
};

const MENU_KEYS = { enter: ["Enter", "NumpadEnter"], escape: ["Escape"] };

const GAME_KEYS = new Set([
    ...Object.values(BINDINGS[1]),
    ...Object.values(BINDINGS[2]),
    ...MENU_KEYS.enter,
    ...MENU_KEYS.escape,
    "Space",
    "Backquote", // frame-data readout
]);

export class KeyManager {
    constructor() {
        this.held = new Set(); // codes currently down
        this.tapped = new Set(); // codes pressed since the last tick (catches sub-tick taps)
        this.pressedAt = new Map(); // code -> tick of its latest unused press
        this.lastPressAt = new Map(); // code -> tick of its latest press (used or not)
        this.prevPressAt = new Map(); // code -> tick of the press before that (double taps)
        this.tickCount = 0;

        // Per-tick snapshot used by the menus
        this.player1_jump = false;
        this.player1_crouch = false;
        this.player1_left = false;
        this.player1_right = false;
        this.player1_block = false;
        this.player1_1 = false;
        this.player1_2 = false;
        this.player1_special = false;

        this.player2_jump = false;
        this.player2_crouch = false;
        this.player2_left = false;
        this.player2_right = false;
        this.player2_block = false;
        this.player2_1 = false;
        this.player2_2 = false;
        this.player2_special = false;

        this.enter = false;
        this.escape = false;
    }

    // Called once per tick (60 times per second) from Game.tick()
    tick() {
        this.tickCount += 1;

        // Forget presses nobody used in time
        for (const [code, at] of this.pressedAt) {
            if (this.tickCount - at > PRESS_BUFFER_TICKS) this.pressedAt.delete(code);
        }

        const down = (code) => this.held.has(code) || this.tapped.has(code);
        const anyDown = (codes) => codes.some(down);

        this.enter = anyDown(MENU_KEYS.enter);
        this.escape = anyDown(MENU_KEYS.escape);

        for (const n of [1, 2]) {
            const b = BINDINGS[n];
            this[`player${n}_jump`] = down(b.up);
            this[`player${n}_crouch`] = down(b.down);
            this[`player${n}_left`] = down(b.left);
            this[`player${n}_right`] = down(b.right);
            this[`player${n}_block`] = down(b.block);
            this[`player${n}_1`] = down(b.one);
            this[`player${n}_2`] = down(b.two);
            this[`player${n}_special`] = down(b.special);
        }

        this.tapped.clear();
    }

    // ---- Fighter input ----

    /** Is this player's action key down (or tapped since the last tick)? */
    isHeld(playerNum, action) {
        const code = BINDINGS[playerNum][action];
        return this.held.has(code) || this.tapped.has(code);
    }

    /** Was this action freshly pressed within the buffer window and not used yet? */
    hasPress(playerNum, action) {
        return this.pressedAt.has(BINDINGS[playerNum][action]);
    }

    /** Use up a buffered press so it can only trigger one move. */
    consumePress(playerNum, action) {
        return this.pressedAt.delete(BINDINGS[playerNum][action]);
    }

    /**
     * Was this action double-tapped: a fresh, unused press that came within
     * `window` ticks of the previous press of the same key?
     */
    hasDoubleTap(playerNum, action, window) {
        const code = BINDINGS[playerNum][action];
        if (!this.pressedAt.has(code) || !this.prevPressAt.has(code)) return false;
        return this.lastPressAt.get(code) - this.prevPressAt.get(code) <= window;
    }

    /** Keep buffered presses alive for n more ticks (used while the game is frozen in hitstop). */
    extendPresses(n) {
        for (const map of [this.pressedAt, this.lastPressAt, this.prevPressAt]) {
            for (const [code, at] of map) map.set(code, at + n);
        }
    }

    /** Use up a buffered press of any key by its KeyboardEvent.code. */
    consumeRawPress(code) {
        return this.pressedAt.delete(code);
    }

    /** Drop all buffered presses for a player (e.g. when a round starts). */
    clearPresses(playerNum) {
        for (const code of Object.values(BINDINGS[playerNum])) this.pressedAt.delete(code);
    }

    // ---- DOM wiring ----

    isGameKey(e) {
        return GAME_KEYS.has(e.code);
    }

    onKeyDown(e) {
        const code = e.code;
        if (!code) return;
        // Auto-repeat is not a new press
        if (e.repeat || this.held.has(code)) return;
        this.held.add(code);
        this.tapped.add(code);
        this.pressedAt.set(code, this.tickCount);
        if (this.lastPressAt.has(code)) this.prevPressAt.set(code, this.lastPressAt.get(code));
        this.lastPressAt.set(code, this.tickCount);
    }

    onKeyUp(e) {
        if (e.code) this.held.delete(e.code);
    }

    /** Release everything, e.g. when the window loses focus and key-ups would be missed. */
    releaseAll() {
        this.held.clear();
        this.tapped.clear();
        this.pressedAt.clear();
        this.lastPressAt.clear();
        this.prevPressAt.clear();
    }

    // ---- Accessors used by the menus ----

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
