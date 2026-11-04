// src/gfx/ImageLoader.js

export class ImageLoader {
    // Progress tracking for the loading screen
    static total = 0;
    static loaded = 0;
    static onProgress = null; // (fraction: number) => void

    /**
     * Start tracking a batch of image loads.
     * @param {number} total - Number of loadImage calls the batch will make.
     * @param {(fraction: number) => void} onProgress
     */
    static track(total, onProgress) {
        ImageLoader.total = total;
        ImageLoader.loaded = 0;
        ImageLoader.onProgress = onProgress;
        ImageLoader.#report(0);
    }

    static #report(currentFileFraction) {
        if (!ImageLoader.onProgress || ImageLoader.total === 0) return;
        const fraction = (ImageLoader.loaded + currentFileFraction) / ImageLoader.total;
        ImageLoader.onProgress(Math.min(1, fraction));
    }

    /**
     * @param {string} path - Image URL/path relative to your web root.
     * @returns {Promise<HTMLImageElement>}
     */
    static async loadImage(path) {
        let img;
        try {
            img = await ImageLoader.#loadWithProgress(path);
        } catch {
            // fetch can fail where <img> works (e.g. opened via file://)
            img = await ImageLoader.#loadPlain(path);
        }
        ImageLoader.loaded += 1;
        ImageLoader.#report(0);
        return img;
    }

    // Download with fetch so we can report bytes received within a large file
    static async #loadWithProgress(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);

        const size = Number(response.headers.get("Content-Length")) || 0;
        let blob;

        if (size && response.body) {
            const reader = response.body.getReader();
            const chunks = [];
            let received = 0;
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                ImageLoader.#report(Math.min(1, received / size));
            }
            blob = new Blob(chunks, { type: response.headers.get("Content-Type") || "image/png" });
        } else {
            blob = await response.blob();
        }

        const url = URL.createObjectURL(blob);
        try {
            return await ImageLoader.#loadPlain(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    static #loadPlain(path) {
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
