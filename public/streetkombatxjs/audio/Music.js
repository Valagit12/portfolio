// ./audio/Music.js
//
// Background music. Menus play the menu track (Assets.menuMusic, a local
// file). Fights stream one of FIGHT_TRACKS from YouTube through the official
// embedded player, shown small in the page's controls strip ("Fight music").
// Each new match moves on to the next track; a rematch keeps the same one.
// A track that ends starts again.
//
// States opt in with `static music = "fight"`; game.js calls setMode() on
// every state change. If YouTube can't load (offline, blocked), fights just
// keep the menu track.

import { Assets } from "../gfx/Assets.js";

export const FIGHT_TRACKS = [
    { id: "yhoGxMP0DIM", title: "Guile's Theme", from: "Street Fighter II" },
    { id: "cegjc9BIlnU", title: "Ryu's Theme", from: "Street Fighter II" },
    { id: "Xi9iel6rZXo", title: "Juke-Joint Jezebel (Moroder mix)", from: "Mortal Kombat (1995)" },
];

const VOLUME = 55; // YouTube's 0..100
const API_TIMEOUT_MS = 10000;

export const Music = {
    mode: "menu",
    next: 0, // index of the track the next match plays
    current: null,
    player: null,
    playerLoad: null,
    loadedId: null,
    failed: false, // YouTube unavailable: fights keep the menu track
    errors: 0, // tracks in a row that couldn't play
    ui: null,

    /** @param {{ title: HTMLAnchorElement, from: HTMLElement, next: HTMLButtonElement, slot: HTMLElement }} ui */
    init(ui) {
        Music.ui = ui;
        ui.next.addEventListener("click", () => {
            ui.next.blur(); // keep Enter / Space for the game
            Music.skip();
        });
        Music._show(FIGHT_TRACKS[Music.next], false);
    },

    /** "fight" during matches, "menu" everywhere else. */
    setMode(mode) {
        if (mode === Music.mode) return;
        Music.mode = mode;
        if (mode === "fight") {
            Music.current = FIGHT_TRACKS[Music.next];
            Music.next = (Music.next + 1) % FIGHT_TRACKS.length;
            Music._startFight();
        } else {
            Music.player?.pauseVideo?.();
            if (Assets.soundEnabled) Assets.playMenuMusic();
            Music._show(FIGHT_TRACKS[Music.next], false);
        }
    },

    /** The header's sound toggle: mutes or resumes whichever music belongs to the current screen. */
    setSoundEnabled(on) {
        Assets.soundEnabled = on;
        if (!on) {
            Assets.menuMusic?.pause();
            Music.player?.pauseVideo?.();
        } else if (Music.mode === "fight" && !Music.failed) {
            Music._startFight();
        } else {
            Assets.playMenuMusic();
        }
    },

    /** Next track now (during a fight), or for the next fight. */
    skip() {
        if (Music.mode === "fight") {
            Music.current = FIGHT_TRACKS[Music.next];
            Music.next = (Music.next + 1) % FIGHT_TRACKS.length;
            Music._startFight();
        } else {
            Music.next = (Music.next + 1) % FIGHT_TRACKS.length;
            Music._show(FIGHT_TRACKS[Music.next], false);
        }
    },

    async _startFight() {
        const track = Music.current;
        Music._show(track, true);
        if (!Assets.soundEnabled || Music.failed) return;
        try {
            await Music._ensurePlayer();
        } catch (err) {
            console.warn("YouTube music unavailable; keeping the menu track", err);
            Music.failed = true;
            Music._show(track, false, "Couldn't reach YouTube");
            return;
        }
        // The screen or the track may have changed while the player loaded
        if (Music.mode !== "fight" || Music.current !== track || !Assets.soundEnabled) return;
        Assets.menuMusic?.pause();
        if (Music.loadedId === track.id) {
            Music.player.playVideo();
        } else {
            Music.loadedId = track.id;
            Music.player.loadVideoById(track.id);
        }
        Music.player.setVolume(VOLUME);
    },

    /** Load the IFrame API and create the player (once). */
    _ensurePlayer() {
        Music.playerLoad ??= new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("timed out")), API_TIMEOUT_MS);
            const create = () => {
                Music.player = new window.YT.Player(Music.ui.slot, {
                    width: 144,
                    height: 81,
                    playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1 },
                    events: {
                        onReady: () => {
                            clearTimeout(timer);
                            resolve();
                        },
                        onStateChange: (e) => {
                            if (e.data === window.YT.PlayerState.PLAYING) Music.errors = 0;
                            // Loop the track for as long as the fight lasts
                            if (e.data === window.YT.PlayerState.ENDED) {
                                Music.player.seekTo(0);
                                Music.player.playVideo();
                            }
                        },
                        // The video can't play here (removed, or embedding turned off): try the next one
                        onError: () => {
                            console.warn(`YouTube track "${Music.current?.title}" can't play; skipping`);
                            Music.loadedId = null;
                            if (++Music.errors >= FIGHT_TRACKS.length) {
                                // None of them play: give up and keep the menu track
                                Music.failed = true;
                                Music._show(Music.current, false, "Fight music unavailable");
                                if (Music.mode === "fight" && Assets.soundEnabled) Assets.playMenuMusic();
                            } else if (Music.mode === "fight") {
                                Music.skip();
                            }
                        },
                    },
                });
            };
            if (window.YT?.Player) return create();
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previous?.();
                create();
            };
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.onerror = () => {
                clearTimeout(timer);
                reject(new Error("script failed to load"));
            };
            document.head.append(script);
        });
        return Music.playerLoad;
    },

    _show(track, playing, note) {
        const ui = Music.ui;
        if (!ui) return;
        ui.title.textContent = track.title;
        ui.title.href = `https://www.youtube.com/watch?v=${track.id}`;
        ui.from.textContent = note ?? (playing ? `Now playing · ${track.from}` : `Up next · ${track.from}`);
    },
};
