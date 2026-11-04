// src/gfx/ImageLoader.js

export class ImageLoader {
    /**
     * @param {string} path - Image URL/path relative to your web root.
     * @returns {Promise<HTMLImageElement>}
     */
    static loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => {
                console.error("Failed to load image:", path, err);
                reject(err);
            };
            img.src = path;
        });
    }
}
