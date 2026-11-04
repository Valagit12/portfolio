// src/gfx/SpriteSheet.js

export class SpriteSheet {
    /**
     * @param {HTMLImageElement} image - Full sprite sheet.
     * @param {number} width - Width of one sprite in pixels.
     * @param {number} height - Height of one sprite in pixels.
     * @param {number} numRow - Number of sprites per row (your Java numRow).
     */
    constructor(image, width, height, numRow) {
        this.image = image;
        this.width = width;
        this.height = height;
        this.numRow = numRow;
        // Optional { tileNum: factor } to widen squashed cells (see spriteScale.js)
        this.scaleX = {};
    }

    /**
     * @param {number} tileNum - Index of the sprite on the sheet.
     * @returns {HTMLCanvasElement} - Cropped sprite.
     */
    crop(tileNum) {
        const xIndex = tileNum % this.numRow;
        const yIndex = Math.floor(tileNum / this.numRow);

        const sx = xIndex * this.width;
        const sy = yIndex * this.height;

        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        // Renderers widen the drawn sprite by this much, centered on the body
        // (stretched once at draw time, so the pixels are only resampled once)
        canvas.scaleX = this.scaleX[tileNum] || 1;
        canvas.cellW = this.width;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            this.image,
            sx,
            sy,
            this.width,
            this.height,
            0,
            0,
            this.width,
            this.height
        );

        return canvas;
    }
}

/**
 * Draw a cropped frame into a w×h box, applying the frame's own correction:
 * `scaleX` widens it around the box center (spriteScale.js) and `offsetX`
 * (in sheet pixels) shifts it (feet anchoring below). Everything that draws
 * fighter sprites should go through this.
 */
export function drawFrame(ctx, img, x, y, w, h) {
    const cellW = img.cellW || img.width;
    const dw = w * (img.scaleX || 1);
    const dx = x + (w - dw) / 2 + (img.offsetX || 0) * (w / cellW);
    ctx.drawImage(img, Math.round(dx), Math.round(y), Math.round(dw), h);
}

// Left/right extent (sheet px) of the opaque pixels in the bottom 6 rows: the feet
function feetExtent(img) {
    const g = img.getContext("2d");
    const { data, width, height } = g.getImageData(0, 0, img.width, img.height);
    const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 60;
    let bottom = -1;
    for (let y = height - 1; y >= 0 && bottom < 0; y--) {
        for (let x = 0; x < width; x++) if (opaque(x, y)) { bottom = y; break; }
    }
    if (bottom < 0) return null;
    let left = width;
    let right = -1;
    for (let y = Math.max(0, bottom - 5); y <= bottom; y++) {
        for (let x = 0; x < width; x++) {
            if (opaque(x, y)) {
                left = Math.min(left, x);
                right = Math.max(right, x);
            }
        }
    }
    return { left, right: right + 1 };
}

/**
 * Keep planted feet still across an animation. Each pose on the sheets was
 * stretched to fill its cell, so in the idle loop the feet slide and the
 * stance widens and narrows from frame to frame. This lines every frame's
 * feet up with the median stance (shift plus a small horizontal rescale).
 */
export function anchorFeet(frames) {
    let extents;
    try {
        extents = frames.map(feetExtent);
    } catch {
        return; // canvas unreadable (e.g. opened from file://): draw as-is
    }
    if (extents.some((e) => !e)) return;
    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const left = median(extents.map((e) => e.left));
    const right = median(extents.map((e) => e.right));
    frames.forEach((img, i) => {
        const e = extents[i];
        const half = img.width / 2;
        const scale = Math.min(1.15, Math.max(0.85, (right - left) / (e.right - e.left))) * (img.scaleX || 1);
        img.scaleX = scale;
        // Map the frame's left foot onto the median left foot
        img.offsetX = left - scale * e.left - half + half * scale;
    });
}
