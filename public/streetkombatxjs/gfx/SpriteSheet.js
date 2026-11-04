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
