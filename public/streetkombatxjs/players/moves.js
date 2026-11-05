// ./players/moves.js
//
// Frame data and boxes for both fighters. Tune the game here.
//
// Timing is in ticks (1/60 s). A move plays its sprite frames at its
// animation's ticks-per-frame, ends when it reaches frame `end`, then the
// fighter holds a follow-through pose for `recovery` ticks before they can act.
//
// Every hit lists the sprite frames it is active on, its hitbox, and how it
// must be guarded. The ground normals stay active a few frames past the
// strike (up to 3, never past the move's end or into the next hit of a
// string), so they still catch a juggled opponent drifting into range. Hitstun and blockstun are worked out when the hit
// connects, so once both fighters can act again the attacker is exactly
// `onHit` / `onBlock` ticks ahead (positive = plus) or behind (negative =
// minus). Hits with `knockdown: true` put the opponent on the floor instead,
// and the advantage comes from how long they take to get up.
//
// Optional move fields:
//   recoveryOnHit  recovery once the move's last hit lands (not on block or
//            whiff). Every attack uses 0: on hit you're free the moment the
//            swing finishes. Hitstun is set from it, so onHit advantage is
//            unchanged; the gain is following up in juggles, where there's
//            no hitstun.
//   display  sprite frame to show at each timeline frame, as [animation, frame]
//            (lets a move reuse better frames than its own sheet row has)
//   advance  [{ frames: [from, to], px }] step forward px spread over those frames
//   fx       [{ frame, type, ... }] effects spawned when the timeline reaches a frame
//
// Boxes are [left, top, right, bottom] in the fighter's 150x300 sprite box,
// written for a fighter facing right (mirrored when facing left). Jump
// attacks reach a little behind the body, so a deep jump-in can hit an
// opponent you've jumped over (a cross-up). A hit
// connects when its hitbox overlaps one of the opponent's hurtboxes. Fighters
// pressed together are 120px apart, so a hitbox reaching x = 185 hits a
// standing opponent from up to 30px away.
//
// Guard heights decide how a hit that connects can be blocked:
// Blocking only works facing the attacker: hold block and you won't turn
// around, so a cross-up from behind gets through.
//   high      stand block (Y) blocks it
//   mid       stand block or crouching blocks it
//   low       only crouching blocks it
//   overhead  only stand block blocks it
// High hitboxes all sit above the crouching hurtbox, so they also whiff
// over a crouching opponent.

// ---------- Damage ----------
// Health is 1000 (MAX_HEALTH in Player.js). The two fighters hit differently
// on purpose:
//   Dom hits like a truck but gets fewer chances. His fast moves are light
//   (jab 30, crouching punch 30); his slow, punishable ones hurt (the 2
//   overhead 120, the clap special 130, the press that ends his string 95).
//   Kasai's sword and fire are sharper and he lands more often: his sword
//   moves out-damage Dom's fists (1 40, crouching thrust 45, jump-in stab
//   70), his string leaves you standing for more pressure, and his big hits
//   are a little smaller (2 75, special 115).
// Repeats in a combo scale down (DAMAGE_SCALING below), so the long
// combos and juggles cost a lot less per hit.

export const HEIGHT = {
    HIGH: "high",
    MID: "mid",
    LOW: "low",
    OVERHEAD: "overhead",
};

// How each strength of hit looks and feels
export const LEVEL = {
    light: { hitstop: 5, blockHitstop: 4, shake: 0, reactionPeak: 2, vibrate: 3 },
    medium: { hitstop: 8, blockHitstop: 5, shake: 3, reactionPeak: 4, vibrate: 4 },
    heavy: { hitstop: 12, blockHitstop: 7, shake: 9, reactionPeak: 5, vibrate: 6 },
    special: { hitstop: 14, blockHitstop: 8, shake: 12, reactionPeak: 5, vibrate: 7 },
};

// ---------- Hurtboxes ----------
// Where a fighter can be hit. While an attack is out, its limb (the hitbox,
// pulled in slightly) is also hittable until the move ends, so whiffed
// attacks can be punished at the fist. Knocked-down fighters have none.

export const HURTBOXES = {
    stand: [
        [40, 5, 115, 150], // head and torso
        [30, 150, 120, 300], // legs
    ],
    crouch: [[30, 145, 125, 300]],
    air: [[35, 20, 115, 260]],
};

// How much of a hitbox stays hittable as a limb hurtbox
export const LIMB_INSET = 14;

const hit = (props) => ({ push: 12, blockPush: 12, knockdown: false, ...props });

// ---------- The light-attack string ----------
// 1, 1,1 and 1,1,1 share one timeline: each longer animation starts with
// the shorter one's frames, so chaining swaps the animation without
// restarting it. Hits belong to the string, so a punch that already
// connected during 1 can't connect again after chaining into 1,1.

export const STRING_MOVES = {
    standing1: { anim: "standing1", end: 9, recovery: 9, recoveryOnHit: 0, hitCount: 1, label: "1" },
    standing11: { anim: "standing11", end: 15, recovery: 12, recoveryOnHit: 0, hitCount: 2, label: "1,1", lunge: true },
    standing111: { anim: "standing111", end: 20, recovery: 5, recoveryOnHit: 0, hitCount: 3, label: "1,1,1", lunge: true },
};

// Chain windows: the next press must come by this frame
export const CHAIN_WINDOW = { standing1: 6, standing11: 12 };

// Dom's string ends in a knockdown. Its hitboxes reach down to 144, just
// above the crouching hurtbox (145): low enough to catch a juggled opponent
// near the floor, still high enough to whiff over a crouch.
export const DOM_STRING = [
    // One-arm front raise: dumbbell swung up and out to head height
    hit({ id: "s1", sound: "dom_hit_light", frames: [2, 7], box: [90, 25, 188, 144], damage: 30, level: "light", height: HEIGHT.HIGH, push: 10, blockPush: 10, onHit: 3, onBlock: 1 }),
    // Overhead hammer: wind up behind the head, bring both dumbbells down in front
    hit({ id: "s2", sound: "dom_hit_medium", frames: [9, 13], box: [90, 35, 195, 144], damage: 45, level: "medium", height: HEIGHT.HIGH, push: 14, blockPush: 16, onHit: 3, onBlock: -2 }),
    // Overhead press thrust: knocks them down
    hit({ id: "s3", sound: "dom_hit_heavy", frames: [18, 20], box: [85, 35, 205, 144], damage: 95, level: "heavy", height: HEIGHT.HIGH, push: 20, blockPush: 40, onHit: 8, onBlock: -6, knockdown: true }),
];

// Dom's sheet rows only have a hammer curl and a slow shoulder press, so his
// string shows hand-picked frames (all three rows share frames 0-12):
//   1      arm low → arm raised straight out in front (frame 6) → back down
//   1,1    → arms up past the head, overhead wind-up → dumbbells down in front
//   1,1,1  → arms back up overhead → thrust forward, stepping in for range
const dom = (...frames) => frames.map((f) => ["standing111", f]);
const DOM_OPENING = dom(0, 1, 6, 6, 6, 5); // shared by all three
const DOM_HAMMER = dom(7, 12, 14, 9, 9); // timeline frames 6-10
// Trails start one frame before the hit so the arc is drawn by the moment of impact
const swingUp = { type: "swing", center: [70, 80], radius: 95, from: 75, to: -50, width: 30, life: 8 };
const swingDown = { type: "swing", center: [70, 85], radius: 100, from: -100, to: 20, width: 34, life: 8 };

// A flat forward streak at height y from x0 to x1 (an arc with a huge radius)
const streak = (y, x0, x1, life) => {
    const radius = 600;
    const cx = (x0 + x1) / 2;
    const deg = (x) => (Math.acos((x - cx) / radius) * 180) / Math.PI;
    return { type: "swing", center: [cx, y - radius], radius, from: deg(x0), to: deg(x1), width: 26, life };
};
const thrust = streak(70, 30, 215, 8);

// Every Dom attack gets a streak along its motion (string + the shared moves)
export const DOM_MOVES = {
    standing1: {
        ...STRING_MOVES.standing1,
        display: [...DOM_OPENING, ...dom(2, 1, 0, 0)],
        fx: [{ frame: 1, ...swingUp }],
    },
    standing11: {
        ...STRING_MOVES.standing11,
        display: [...DOM_OPENING, ...DOM_HAMMER, ...dom(8, 7), ["standing11", 14], ["standing11", 15], ["standing11", 15]],
        advance: [{ frames: [8, 9], px: 22 }],
        fx: [{ frame: 1, ...swingUp }, { frame: 8, ...swingDown }],
    },
    standing111: {
        ...STRING_MOVES.standing111,
        display: [...DOM_OPENING, ...DOM_HAMMER, ...dom(12, 13, 14, 15, 16, 17, 18, 19, 20, 20)],
        advance: [{ frames: [8, 9], px: 22 }, { frames: [16, 18], px: 60 }],
        fx: [{ frame: 1, ...swingUp }, { frame: 8, ...swingDown }, { frame: 17, ...thrust }],
    },
};

// Kasai's string doesn't knock down: it ends low and keeps them standing next to him
export const KASAI_STRING = [
    // Rising sword slash
    // (the fire runs past the blade: see KASAI_FIRE_BLADE)
    hit({ id: "s1", sound: "kasai_slash", swingSound: "fire_slash", frames: [2, 7], box: [100, 40, 212, 140], damage: 40, level: "light", height: HEIGHT.HIGH, push: 10, blockPush: 10, onHit: 3, onBlock: 1 }),
    // Low kick
    hit({ id: "s2", frames: [11, 15], box: [90, 215, 200, 295], damage: 35, level: "medium", height: HEIGHT.LOW, push: 14, blockPush: 16, onHit: 3, onBlock: -2 }),
    // Flaming low stab
    hit({ id: "s3", sound: "kasai_stab", swingSound: "fire", frames: [16, 20], box: [90, 185, 205, 295], damage: 80, level: "heavy", height: HEIGHT.LOW, push: 60, blockPush: 40, onHit: 6, onBlock: -6 }),
];

// ---------- Everything else ----------

export const COMMON_MOVES = {
    standing2: {
        anim: "standing2", end: 7, recovery: 10, recoveryOnHit: 0, label: "2",
        hits: [hit({ id: "2", frames: [3, 7], box: [90, 60, 200, 200], damage: 95, level: "heavy", height: HEIGHT.OVERHEAD, push: 36, blockPush: 30, onHit: 4, onBlock: -4 })],
    },
    // Fast poke that's a big risk: -15 on block, and the attacker stands up
    // during its recovery (standing hurtbox), so any normal punishes it.
    down1: {
        anim: "down1", end: 7, recovery: 15, recoveryOnHit: 0, crouching: true, recoveryStanding: true, label: "Down 1",
        hits: [hit({ id: "d1", frames: [3, 7], box: [100, 150, 185, 215], damage: 35, level: "light", height: HEIGHT.MID, onHit: 2, onBlock: -15 })],
    },
    down2: {
        anim: "down2", end: 8, recovery: 9, recoveryOnHit: 0, crouching: true, label: "Down 2",
        hits: [hit({ id: "d2", frames: [4, 8], box: [100, 225, 205, 295], damage: 55, level: "medium", height: HEIGHT.LOW, push: 24, blockPush: 20, onHit: 3, onBlock: -5 })],
    },
    // Hands: swing overhead and bring it down in front (the strike is the
    // sheet's last frame, so it's shown on the active frames)
    jump1: {
        anim: "jump1", end: 5, recovery: 5, recoveryOnHit: 0, air: true, label: "Jump 1",
        display: [["jump1", 0], ["jump1", 1], ["jump1", 3], ["jump1", 5], ["jump1", 5], ["jump1", 5]],
        hits: [hit({ id: "j1", frames: [3, 4], box: [40, 30, 192, 185], damage: 55, level: "medium", height: HEIGHT.OVERHEAD, push: 16, onHit: 6, onBlock: 2, launch: true })],
    },
    jump2: {
        anim: "jump2", untilLanding: true, recoveryOnHit: 0, air: true, label: "Jump 2",
        // Kick: legs, lower body
        hits: [hit({ id: "j2", frames: [0, 0], box: [45, 175, 190, 300], damage: 80, level: "heavy", height: HEIGHT.OVERHEAD, push: 22, onHit: 8, onBlock: 3, knockdown: true })],
    },
};

// The same hits with their own sound (Dom's ringing iron, see audio/sfx.js)
const withSound = (hits, sound) => hits.map((h) => ({ ...h, sound }));
// The same hits with a character's own damage (see "Damage" at the top of this file)
const damage = (hits, amount) => hits.map((h) => ({ ...h, damage: amount }));

// Dom's streaks (and sounds) on the shared moves
Object.assign(DOM_MOVES, {
    // Overhead chop down in front
    standing2: { ...COMMON_MOVES.standing2, hits: damage(withSound(COMMON_MOVES.standing2.hits, "dom_standing2"), 120), fx: [{ frame: 2, type: "swing", center: [75, 95], radius: 112, from: -110, to: 30, width: 32, life: 8 }] },
    // Kneeling straight punch
    down1: { ...COMMON_MOVES.down1, hits: damage(withSound(COMMON_MOVES.down1.hits, "dom_down1"), 30), fx: [{ frame: 2, ...streak(175, 45, 192, 6) }] },
    // Reach down to the floor in front
    down2: { ...COMMON_MOVES.down2, hits: damage(COMMON_MOVES.down2.hits, 65), fx: [{ frame: 3, type: "swing", center: [80, 150], radius: 118, from: -5, to: 75, width: 30, life: 9 }] },
    // Overhead swing coming down in front
    jump1: { ...COMMON_MOVES.jump1, hits: damage(withSound(COMMON_MOVES.jump1.hits, "dom_jump1"), 45), fx: [{ frame: 2, type: "swing", center: [70, 105], radius: 108, from: -105, to: 35, width: 30, life: 7 }] },
    // Kick: streak along the legs
    jump2: { ...COMMON_MOVES.jump2, hits: damage(COMMON_MOVES.jump2.hits, 90), fx: [{ frame: 0, type: "swing", center: [40, 150], radius: 140, from: 15, to: 60, width: 28, life: 10 }] },
});

// Specials: a big reward on hit (follow up freely), very punishable on block.
// Dom steps in and claps both dumbbells together on the opponent's head.
// Active only on frame 6 (arms together in front). Cancelled from 1,1 it
// skips the wind-up (starts at frame 3) so it still combos. Stuns longer
// than Kasai's (+40): enough time to walk up and start a jump-in.
export const DOM_SPECIAL = {
    anim: "special", end: 10, recovery: 28, recoveryFrame: 9, label: "Special",
    recoveryOnHit: 0,
    cancelStartFrame: 3,
    advance: [{ frames: [4, 6], px: 70 }],
    fx: [{ frame: 5, type: "clash", at: [212, 48] }, { frame: 5, ...streak(55, 40, 225, 8) }],
    hits: [hit({ id: "sp", frames: [6, 6], box: [100, 0, 245, 110], damage: 130, level: "special", height: HEIGHT.HIGH, push: 44, blockPush: 36, onHit: 40, onBlock: -14 })],
};

// Active only on the downward flaming slash (frame 7), not while the sword is
// still raised overhead. The fire reaches 110px past the blade, so the hitbox
// does too. Small pushback so Kasai can use the +22 to follow up.
export const KASAI_SPECIAL = {
    anim: "special", end: 10, recovery: 28, recoveryOnHit: 0, label: "Special",
    swingSound: "fire", // instead of the usual whoosh (see audio/sfx.js)
    // Big burning arc from overhead down in front (fires a frame early: 6 ticks per frame)
    fx: [{ frame: 6, type: "swing", style: "fire", center: [80, 100], radius: 230, from: -100, to: 50, width: 44, life: 16 }],
    hits: [hit({ id: "sp", frames: [7, 7], box: [85, 40, 285, 290], damage: 115, level: "special", height: HEIGHT.OVERHEAD, push: 12, blockPush: 22, onHit: 22, onBlock: -12 })],
};

// ---------- Kasai's fire ----------
// His sword is on fire and the flames reach past the blade. For each sprite
// frame where the blade shows: [hiltX, hiltY, tipX, tipY] (facing right,
// measured off the sheet). The flame carries on past the tip in the same
// direction for `reach` px; hitboxes on those moves include it.
const KASAI_STAND1_BLADE = {
    reach: 40,
    frames: { 2: [141, 141, 112, 203], 3: [134, 103, 144, 162], 4: [134, 62, 178, 116], 5: [119, 41, 178, 100], 6: [119, 41, 187, 103] },
};
export const KASAI_FIRE_BLADE = {
    // 1,1 and 1,1,1 open with the same frames as 1
    standing1: KASAI_STAND1_BLADE,
    standing11: KASAI_STAND1_BLADE,
    standing111: KASAI_STAND1_BLADE,
    special: {
        reach: 110,
        frames: { 4: [98, 18, 15, 66], 5: [131, 11, 26, 22], 6: [134, 87, 108, 7], 7: [100, 135, 181, 200], 8: [137, 87, 126, 11] },
    },
    jump1: { reach: 45, frames: { 2: [131, 27, 138, 118], 4: [108, 52, 130, 136], 5: [126, 107, 129, 194] } },
};

// Kasai's streaks burn (style "fire")
const fire = (fx) => ({ ...fx, style: "fire" });
// A straight up-and-down streak at x from y0 to y1 (an arc with a huge radius)
const vstreak = (x, y0, y1, life) => {
    const radius = 600;
    const cy = (y0 + y1) / 2;
    const deg = (y) => (Math.asin((y - cy) / radius) * 180) / Math.PI;
    return { type: "swing", center: [x - radius, cy], radius, from: deg(y0), to: deg(y1), width: 24, life };
};
const risingSlash = fire({ frame: 1, type: "swing", center: [90, 120], radius: 112, from: 115, to: -30, width: 26, life: 10 });
const lowKick = fire({ frame: 10, ...streak(258, 30, 235, 10) });
const lowSlash = fire({ frame: 15, type: "swing", center: [95, 120], radius: 105, from: -55, to: 80, width: 30, life: 11 });

export const KASAI_MOVES = {
    standing1: { ...STRING_MOVES.standing1, fx: [risingSlash] },
    standing11: { ...STRING_MOVES.standing11, fx: [risingSlash, lowKick] },
    standing111: { ...STRING_MOVES.standing111, fx: [risingSlash, lowKick, lowSlash] },
    // Front kick rising up in front
    standing2: { ...COMMON_MOVES.standing2, hits: damage(COMMON_MOVES.standing2.hits, 75), fx: [fire({ frame: 2, type: "swing", center: [80, 175], radius: 105, from: 80, to: -45, width: 30, life: 11 })] },
    // Kneeling sword thrust
    down1: { ...COMMON_MOVES.down1, hits: damage(COMMON_MOVES.down1.hits, 45), fx: [fire({ frame: 2, ...streak(178, 25, 225, 8) })] },
    // Low kick along the floor
    down2: { ...COMMON_MOVES.down2, hits: damage(COMMON_MOVES.down2.hits, 50), fx: [fire({ frame: 3, ...streak(266, 30, 240, 10) })] },
    // Downward stab: raise the sword, hold it, drive it straight down.
    // Same start-up as before (active from tick 9), but the stab stays on
    // screen for 9 ticks instead of flashing past, and a burning streak
    // follows the blade down.
    jump1: {
        ...COMMON_MOVES.jump1,
        end: 7,
        display: [["jump1", 1], ["jump1", 2], ["jump1", 2], ["jump1", 4], ["jump1", 5], ["jump1", 5], ["jump1", 5], ["jump1", 5]],
        fx: [fire({ frame: 2, ...vstreak(132, 0, 275, 11) })],
        hits: [hit({ id: "j1", sound: "kasai_jump1", frames: [3, 5], box: [40, 80, 190, 240], damage: 70, level: "medium", height: HEIGHT.OVERHEAD, push: 16, onHit: 6, onBlock: 2, launch: true })],
    },
    // Kick: streak along the legs
    jump2: { ...COMMON_MOVES.jump2, hits: damage(COMMON_MOVES.jump2.hits, 70), fx: [fire({ frame: 0, type: "swing", center: [40, 150], radius: 140, from: -10, to: 75, width: 28, life: 12 })] },
};

// ---------- Knockdowns ----------
// Launched back in an arc, lie on the floor, get up. Can't be hit at any
// point once they touch the floor (no hitting them on the ground). While
// they're still in the air they can be juggled (below). A KO is a knockdown
// they don't get up from.

export const KNOCKDOWN = {
    launchSpeed: 14, // px/tick upward at launch
    gravity: 1.5,
    travel: 7, // px/tick backward while airborne
    downTicks: 34, // lying on the floor
    getupTicks: 14,
};

// ---------- Juggles ----------
// A hit with `launch: true` (both fighters' jump 1) knocks the opponent
// flat and floats them up instead of stunning them. While they're airborne
// any hit keeps them up: it can't be blocked, and it pops them up again.
// The same goes for any knockdown while they're still in the air (the end of
// Dom's string, a second special): hitting them there turns it into a juggle.
// Jump 1 always pops them very high (`launch`), high enough to jump after
// them and keep the juggle going with another jump attack. Other hits pop
// them less each time (`relaunch`; past the end of the list, every hit uses
// its last value). No pop goes above `ceiling`. There's no limit on hits:
// the juggle lasts until they touch the floor. A knockdown hit (jump 2, the end of
// Dom's string, a second special) drops them in a faster knockdown arc, but
// they can still be hit until they land. Landing is an ordinary knockdown: lie down, get up.

export const JUGGLE = {
    launch: 26, // px/tick upward from any jump 1 hit (~375px high, ~58 ticks in the air)
    relaunch: [15, 13, 11, 9], // upward speed from each further hit (not jump 1); the last repeats
    ceiling: 460, // highest a pop can carry them (px above the floor), so they stay on screen
    gravity: 0.9, // floatier than a knockdown, so there's time to follow up
    // Gravity scaling: each juggle hit makes them fall this much (fraction of
    // `gravity`) faster than the last, so long juggles slowly come down.
    // Very gentle on purpose: 10 hits in, they're only 18% heavier.
    gravityGrowth: 0.02,
    travel: 2.5, // px/tick away from the attacker (slow, so the 1,1,1 string reaches)
    spin: 15, // degrees per tick tipping over to flat
    // Extra px added on each side of a juggled fighter's hurtbox, so they're
    // easier to keep hitting (the body box lying flat is ~240 wide, ~80 tall)
    hurtboxPad: { x: 40, y: 50 },
};

// ---------- Damage scaling ----------
// Once a move has already hit in the current combo, hitting with it again
// multiplies the combo's damage scale by `repeatScale`, and the scale stays
// for the rest of the combo (every later hit deals base damage x scale).
// Moves are told apart by their hit id, so 1, 1,1 and 1,1,1's three hits
// are different moves; a second 1,1 repeats them.

export const DAMAGE_SCALING = {
    repeatScale: 0.8,
};

// ---------- Dashes and running ----------
// Double-tap forward or back (two fresh presses within DOUBLE_TAP_TICKS).
// `speeds` is px moved on each tick; the fighter can't act until the list
// runs out. The backdash can't be hit for its first `invulnerable` ticks,
// but its slow tail can be punished. Keep holding forward after a forward
// dash to break into a run; let go to skid to a stop. You can attack, jump
// or block straight out of a run.

export const DOUBLE_TAP_TICKS = 14;

export const DASH = {
    forward: { speeds: [24, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3], invulnerable: 0 },
    back: { speeds: [22, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 0, 0], invulnerable: 6 },
};

export const RUN = {
    fromDashTick: 6, // still holding forward this far into a dash: start running
    speed: 13,
    jumpCarry: 7, // forward px/tick kept when jumping out of a run
    brake: [10, 7, 4, 2, 1], // skid after letting go
};

// ---------- Jumping ----------
// Up alone jumps straight up; up with forward or back jumps that way. The
// direction is locked at takeoff (no steering in the air). A short squat
// before leaving the ground and a short landing make jumps a commitment.
// A forward jump from close range carries you over the opponent, and you
// turn to face them once you land.

export const JUMP = {
    squat: 3, // ticks crouching before takeoff (still grounded)
    speed: 31, // px/tick upward at takeoff
    gravity: 1.75, // ~290px high, ~37 ticks in the air
    forward: 6.5, // px/tick across the ground
    back: 5.5,
    landing: 3, // ticks of landing before you can act
};
