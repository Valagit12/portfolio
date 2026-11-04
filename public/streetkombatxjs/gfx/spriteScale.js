// ./gfx/spriteScale.js
//
// Undo horizontal squash baked into the sprite sheets.
//
// When the sheets were made, each pose was cropped to its own bounding box
// and stretched to fill a 32x64 cell. Wide poses (arms out, sword extended)
// got squeezed, so the fighter turned thin whenever they spread out.
// These factors stretch those cells back out. They were measured from the
// head and torso width against the stance, then checked by eye.
//
// Keys are tile numbers on the sheet (row * 21 + column). Player 2 sheets
// are mirror images of player 1, so both use the same table. The stretch is
// centered, and only the drawing widens: hit ranges and spacing still use
// the fighter's 150px body box.

const tile = (row, col) => row * 21 + col;
const row = (r, factors) => Object.fromEntries(Object.entries(factors).map(([c, f]) => [tile(r, Number(c)), f]));

export const DOM_SCALE_X = {
    ...row(1, { 2: 1.36, 3: 1.58, 4: 1.58, 5: 1.58, 6: 1.46, 7: 1.36, 8: 1.15 }), // walk: arms spread
    ...row(3, { 2: 1.19, 3: 1.36, 4: 1.36, 5: 1.36, 6: 1.19 }), // crouch
    ...row(4, { 2: 1.1, 3: 1.19, 4: 1.1 }), // hit reaction
    ...row(7, { 1: 1.19, 2: 1.19, 3: 1.36, 4: 1.36, 5: 1.19, 6: 1.19 }), // down 1
    ...row(8, { 5: 1.36 }), // down 2 reach
    ...row(9, { 4: 1.46 }), // 2: thrust
    ...row(12, { 20: 1.19 }), // 1,1,1 follow-through
    ...row(13, { 6: 1.19 }), // special: arms out
};

export const KASAI_SCALE_X = {
    ...row(7, { 2: 1.43, 3: 1.6, 4: 1.6, 5: 1.6, 6: 1.43 }), // down 1: sword out
    ...row(8, { 4: 1.43, 5: 1.6 }), // down 2
    ...row(9, { 3: 1.33, 4: 1.25, 5: 1.33 }), // 2: kick
    ...row(10, { 4: 1.43, 5: 1.43, 6: 1.54, 7: 1.43 }), // 1: sword raised
    ...row(11, { 4: 1.43, 5: 1.54, 6: 1.54 }), // 1,1
    ...row(12, { 4: 1.43, 5: 1.33, 6: 1.43, 14: 1.43, 16: 1.43, 18: 1.43 }), // 1,1,1
    ...row(13, { 7: 1.6 }), // special: flaming swing
};
