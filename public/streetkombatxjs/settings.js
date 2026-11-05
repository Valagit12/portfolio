// ./settings.js
//
// Match settings chosen on the main menu. Remembered in this browser when
// storage is available; otherwise they just last for the session.

const STORAGE_KEY = "streetkombatx.roundTime";
const CPU_KEY = "streetkombatx.cpu";

// Seconds on the round clock, cycled with left/right on the menu
export const ROUND_TIMES = [30, 60, 90, 120, 180, 240, 300];
const DEFAULT_ROUND_TIME = 90;

function loadRoundTime() {
    try {
        const saved = Number(localStorage.getItem(STORAGE_KEY));
        if (ROUND_TIMES.includes(saved)) return saved;
    } catch {
        // storage blocked (private window, file://): use the default
    }
    return DEFAULT_ROUND_TIME;
}

function loadCpu() {
    try {
        return localStorage.getItem(CPU_KEY) === "on";
    } catch {
        return false;
    }
}

export const Settings = {
    roundTime: loadRoundTime(),
    // Player 2 is the computer (players/Cpu.js)
    cpu: loadCpu(),

    toggleCpu() {
        Settings.cpu = !Settings.cpu;
        try {
            localStorage.setItem(CPU_KEY, Settings.cpu ? "on" : "off");
        } catch {
            // not remembered, but still used this session
        }
    },

    /**
     * Step the round time up (+1) or down (-1) through ROUND_TIMES.
     * Stops at the ends, unless `wrap` (then the longest goes back to the shortest).
     */
    stepRoundTime(dir, wrap = false) {
        const n = ROUND_TIMES.length;
        const i = ROUND_TIMES.indexOf(Settings.roundTime) + dir;
        const next = ROUND_TIMES[wrap ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
        if (next === Settings.roundTime) return;
        Settings.roundTime = next;
        try {
            localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
            // not remembered, but still used this session
        }
    },
};
