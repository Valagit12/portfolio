// ./input/TouchControls.js
//
// The on-screen pad for phones and tablets (markup and styles in index.html).
// Every control goes through KeyManager.touchDown/touchUp, which press the
// same keys as player 1's keyboard, so the game can't tell them apart:
//
//  - d-pad: read from where the thumb sits, like a stick, so diagonals
//    (crouch-block, jump-in) work and the thumb can slide between directions
//  - Attack 1, Attack 2, Special, Block
//  - Start (Enter) and Back / Pause (Escape)

// A thumb this close to the middle (fraction of the radius) is neutral
const DEAD_ZONE = 0.22;

// Eight 45° slices, counter-clockwise from the right
const SECTORS = [
    ["right"],
    ["up", "right"],
    ["up"],
    ["up", "left"],
    ["left"],
    ["down", "left"],
    ["down"],
    ["down", "right"],
];

const BUZZ_MS = 8; // a tick of vibration on each button press (Android)

export class TouchControls {
    constructor(root, keyManager) {
        this.root = root;
        this.km = keyManager;

        this.dpad = root.querySelector("[data-dpad]");
        this.arms = new Map([...root.querySelectorAll("[data-dir]")].map((el) => [el.dataset.dir, el]));
        this.dpadPointer = null;
        this.dirs = new Set(); // directions the d-pad holds now

        this.pressed = new Map(); // pointerId -> button element
        this.backLabel = root.querySelector("[data-back-label]");

        this.dpad.addEventListener("pointerdown", (e) => this.onDpadDown(e));
        this.dpad.addEventListener("pointermove", (e) => this.onDpadMove(e));
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
            this.dpad.addEventListener(type, (e) => this.onDpadUp(e));
        }

        for (const button of root.querySelectorAll("[data-action]")) {
            button.addEventListener("pointerdown", (e) => this.onButtonDown(e, button));
            for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
                button.addEventListener(type, (e) => this.onButtonUp(e));
            }
        }

        // No long-press menu or text selection on the pad
        root.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    /** "Pause" during a fight, "Back" in the menus. */
    setBackLabel(text) {
        this.backLabel.textContent = text;
    }

    /** Let go of everything, e.g. when the page is hidden mid-press. */
    reset() {
        this.setDirs([]);
        this.dpadPointer = null;
        for (const button of this.pressed.values()) this.release(button);
        this.pressed.clear();
    }

    // ---- Buttons ----

    onButtonDown(e, button) {
        e.preventDefault();
        button.setPointerCapture?.(e.pointerId);
        this.pressed.set(e.pointerId, button);
        button.classList.add("on");
        this.km.touchDown(button.dataset.action);
        navigator.vibrate?.(BUZZ_MS);
    }

    onButtonUp(e) {
        const button = this.pressed.get(e.pointerId);
        if (!button) return;
        this.pressed.delete(e.pointerId);
        // Another finger may still be on the same button
        if ([...this.pressed.values()].includes(button)) return;
        this.release(button);
    }

    release(button) {
        button.classList.remove("on");
        this.km.touchUp(button.dataset.action);
    }

    // ---- D-pad ----

    onDpadDown(e) {
        e.preventDefault();
        if (this.dpadPointer !== null) return; // one thumb steers
        this.dpadPointer = e.pointerId;
        this.dpad.setPointerCapture?.(e.pointerId);
        this.steer(e);
    }

    onDpadMove(e) {
        if (e.pointerId === this.dpadPointer) this.steer(e);
    }

    onDpadUp(e) {
        if (e.pointerId !== this.dpadPointer) return;
        this.dpadPointer = null;
        this.setDirs([]);
    }

    steer(e) {
        const rect = this.dpad.getBoundingClientRect();
        const radius = rect.width / 2;
        const dx = e.clientX - (rect.left + radius);
        const dy = e.clientY - (rect.top + rect.height / 2);
        if (Math.hypot(dx, dy) < radius * DEAD_ZONE) {
            this.setDirs([]);
            return;
        }
        const slice = Math.round(Math.atan2(-dy, dx) / (Math.PI / 4));
        this.setDirs(SECTORS[(slice + 8) % 8]);
    }

    /** Hold exactly these directions: release the ones left, press the new ones. */
    setDirs(next) {
        for (const dir of this.dirs) {
            if (next.includes(dir)) continue;
            this.dirs.delete(dir);
            this.arms.get(dir).classList.remove("on");
            this.km.touchUp(dir);
        }
        for (const dir of next) {
            if (this.dirs.has(dir)) continue;
            this.dirs.add(dir);
            this.arms.get(dir).classList.add("on");
            this.km.touchDown(dir);
        }
    }
}
