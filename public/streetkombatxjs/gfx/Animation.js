// src/gfx/Animation.js

export class Animation {
    /**
     * @param {number} speed - Time in ms per frame.
     * @param {Array<HTMLImageElement|HTMLCanvasElement>} frames
     */
    constructor(speed, frames) {
        this.speed = speed;
        this.frames = frames;

        this.index = 0;
        this.timer = 0;
        this.lastTime = performance.now();
    }

    tick() {
        const now = performance.now();
        this.timer += now - this.lastTime;
        this.lastTime = now;

        if (this.timer > this.speed) {
            this.index += 1;
            this.timer = 0;

            if (this.index >= this.frames.length) {
                this.index = 0;
            }
        }
    }

    getCurrentFrame() {
        return this.frames[this.index];
    }

    setIndex(index) {
        this.index = index;
    }

    getCurrentIndex() {
        return this.index;
    }

    getFrame(index) {
        return this.frames[index];
    }
}
