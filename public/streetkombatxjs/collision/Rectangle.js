// ./collision/Rectangle.js

// Simple rectangle used for hitboxes and intersection tests.
export class Rectangle {
    constructor(lOrOther, b, w, h) {
        if (lOrOther instanceof Rectangle) {
            // Copy constructor
            this.left = lOrOther.left;
            this.bottom = lOrOther.bottom;
            this.width = lOrOther.width;
            this.height = lOrOther.height;
        } else if (typeof lOrOther === "number") {
            // Rectangle(int l, int b, int w, int h)
            const l = lOrOther;
            const bottom = b;
            const width = w;
            const height = h;

            this.left = l;
            this.bottom = bottom;

            if (width >= 0) {
                this.width = width;
            } else {
                this.width = 0;
            }

            // Note: mirrors the original Java (it mistakenly checks w instead of h)
            if (width >= 0) {
                this.height = height;
            } else {
                this.height = 0;
            }
        } else {
            // Default constructor: all zero
            this.left = 0;
            this.bottom = 0;
            this.width = 0;
            this.height = 0;
        }
    }

    setLeft(left) {
        this.left = left;
    }

    setBottom(bottom) {
        this.bottom = bottom;
    }

    // Static helpers, same logic as Java

    static intersection(r, e) {
        let l = 0;
        let b = 0;
        let w = 0;
        let h = 0;

        w =
            Rectangle._min(r.left + r.width, e.left + e.width) -
            Rectangle._max(r.left, e.left);
        h =
            Rectangle._min(r.bottom + r.height, e.bottom + e.height) -
            Rectangle._max(r.bottom, e.bottom);

        if ((w > 0 && h > 0) || w === 0 || h === 0) {
            l = Rectangle._max(r.left, e.left);
            b = Rectangle._max(r.bottom, e.bottom);
        } else {
            w = 0;
            h = 0;
            l = 0;
            b = 0;
        }

        return new Rectangle(l, b, w, h);
    }

    static isIntersecting(r, e) {
        let w =
            Rectangle._min(r.left + r.width, e.left + e.width) -
            Rectangle._max(r.left, e.left);
        let h =
            Rectangle._min(r.bottom + r.height, e.bottom + e.height) -
            Rectangle._max(r.bottom, e.bottom);

        if ((w > 0 && h > 0) || w === 0 || h === 0) {
            return true;
        } else {
            return false;
        }
    }

    static _max(x, y) {
        return x >= y ? x : y;
    }

    static _min(x, y) {
        return x <= y ? x : y;
    }
}
