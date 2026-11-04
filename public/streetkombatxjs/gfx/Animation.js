// src/gfx/Animation.js
//
// Frame timing is counted in game ticks (60 per second), not wall-clock time,
// so move timing and frame advantage are identical on every machine and
// frame rate. `speed` is still given in milliseconds per frame and rounded to
// the nearest whole tick.

export const TICK_MS = 1000 / 60;

export class Animation {
    /**
     * @param {number} speed - Time in ms per frame.
     * @param {Array<HTMLImageElement|HTMLCanvasElement>} frames
     */
    constructor(speed, frames) {
        this.speed = speed;
        this.frames = frames;
        this.ticksPerFrame = Math.max(1, Math.round(speed / TICK_MS));

        this.index = 0;
        this.counter = 0;
    }

    tick() {
        this.counter += 1;
        if (this.counter >= this.ticksPerFrame) {
            this.counter = 0;
            this.index = (this.index + 1) % this.frames.length;
        }
    }

    getCurrentFrame() {
        return this.frames[this.index];
    }

    setIndex(index) {
        this.index = index;
        this.counter = 0;
    }

    getCurrentIndex() {
        return this.index;
    }

    getFrame(index) {
        return this.frames[index];
    }
}
