// src/gfx/Assets.js

import { ImageLoader } from "./ImageLoader.js";
import { SpriteSheet } from "./SpriteSheet.js";

export class Assets {
    // Intro images
    static loading1 = null;
    static loading2 = null;


    // Menu/Help/Pause/End
    static menu = [];
    static help = [];
    static charSelectScreen = null;
    static stageSelectScreen = null;
    static pause = [];
    static endScreen = [];

    // Fonts (canvas font strings; load the .ttf with CSS)
    static dragonForce = null;
    static dragonForceNum = null;
    static dragonForceEndScreen = null;

    // Backgrounds
    static fireTemple = [];
    static kingdom = [];

    // Kasai animations
    static kasai_stance_player1 = [];
    static kasai_walk_left_player1 = [];
    static kasai_walk_right_player1 = [];
    static kasai_block_player1 = [];
    static kasai_crouch_player1 = [];
    static kasai_jump_player1 = [];
    static kasai_hit_player1 = [];
    static kasai_jump2_player1 = [];
    static kasai_jump1_player1 = [];
    static kasai_down1_player1 = [];
    static kasai_down2_player1 = [];
    static kasai_2_player1 = [];
    static kasai_1_player1 = [];
    static kasai_11_player1 = [];
    static kasai_111_player1 = [];
    static kasai_special_player1 = [];

    static kasai_stance_player2 = [];
    static kasai_walk_left_player2 = [];
    static kasai_walk_right_player2 = [];
    static kasai_block_player2 = [];
    static kasai_crouch_player2 = [];
    static kasai_jump_player2 = [];
    static kasai_hit_player2 = [];
    static kasai_jump2_player2 = [];
    static kasai_jump1_player2 = [];
    static kasai_down1_player2 = [];
    static kasai_down2_player2 = [];
    static kasai_2_player2 = [];
    static kasai_1_player2 = [];
    static kasai_11_player2 = [];
    static kasai_111_player2 = [];
    static kasai_special_player2 = [];

    // Dom animations
    static dom_stance_player1 = [];
    static dom_walk_left_player1 = [];
    static dom_walk_right_player1 = [];
    static dom_block_player1 = [];
    static dom_crouch_player1 = [];
    static dom_jump_player1 = [];
    static dom_hit_player1 = [];
    static dom_jump2_player1 = [];
    static dom_jump1_player1 = [];
    static dom_down1_player1 = [];
    static dom_down2_player1 = [];
    static dom_2_player1 = [];
    static dom_1_player1 = [];
    static dom_11_player1 = [];
    static dom_111_player1 = [];
    static dom_special_player1 = [];
    static dom_special_cancel_player1 = [];

    static dom_stance_player2 = [];
    static dom_walk_left_player2 = [];
    static dom_walk_right_player2 = [];
    static dom_block_player2 = [];
    static dom_crouch_player2 = [];
    static dom_jump_player2 = [];
    static dom_hit_player2 = [];
    static dom_jump2_player2 = [];
    static dom_jump1_player2 = [];
    static dom_down1_player2 = [];
    static dom_down2_player2 = [];
    static dom_2_player2 = [];
    static dom_1_player2 = [];
    static dom_11_player2 = [];
    static dom_111_player2 = [];
    static dom_special_player2 = [];
    static dom_special_cancel_player2 = [];

    // Music
    static menuMusic = null;

    static async init() {
        // Intro
        Assets.loading1 = await ImageLoader.loadImage(
            "./res/IntroScreen/loading1.png"
        );
        Assets.loading2 = await ImageLoader.loadImage(
            "./res/IntroScreen/loading2.png"
        );

        // Menu
        Assets.menu = [];
        Assets.menu.push(
            await ImageLoader.loadImage(
                "./res/MenuScreen/loading1.png"
            )
        );
        Assets.menu.push(
            await ImageLoader.loadImage(
                "./res/MenuScreen/loading2.png"
            )
        );
        Assets.menu.push(
            await ImageLoader.loadImage(
                "./res/MenuScreen/loading3.png"
            )
        );

        // Help screens
        Assets.help = [];
        Assets.help.push(
            await ImageLoader.loadImage(
                "./res/HelpScreen/How To Play pt1.png"
            )
        );
        Assets.help.push(
            await ImageLoader.loadImage(
                "./res/HelpScreen/How To Play Screen2.png"
            )
        );
        Assets.help.push(
            await ImageLoader.loadImage(
                "./res/HelpScreen/How To Play Screen3.png"
            )
        );
        Assets.help.push(
            await ImageLoader.loadImage(
                "./res/HelpScreen/How To Play Screen4.png"
            )
        );
        Assets.help.push(
            await ImageLoader.loadImage(
                "./res/HelpScreen/How To Play ScreenControl.png"
            )
        );

        // Character select
        Assets.charSelectScreen = await ImageLoader.loadImage(
            "./res/CharScreen/charSelect.png"
        );

        // Stage select
        Assets.stageSelectScreen = await ImageLoader.loadImage(
            "./res/StageScreen/StageSelectScreen.png"
        );

        // End screen
        Assets.endScreen = [];
        Assets.endScreen.push(
            await ImageLoader.loadImage("./res/EndScreen/endScreen1.png")
        );
        Assets.endScreen.push(
            await ImageLoader.loadImage("./res/EndScreen/endScreen2.png")
        );
        Assets.endScreen.push(
            await ImageLoader.loadImage("./res/EndScreen/endScreen3.png")
        );

        // Pause screen
        Assets.pause = [];
        Assets.pause.push(
            await ImageLoader.loadImage("./res/PauseScreen/pause1.png")
        );
        Assets.pause.push(
            await ImageLoader.loadImage("./res/PauseScreen/pause2.png")
        );
        Assets.pause.push(
            await ImageLoader.loadImage("./res/PauseScreen/pause3.png")
        );

        // Fonts: you still need a CSS @font-face pointing at DragonForcE.ttf
        Assets.dragonForce = '50px "DragonForcE"';
        Assets.dragonForceNum = '80px "DragonForcE"';
        Assets.dragonForceEndScreen = '120px "DragonForcE"';

        // Sprite sheets
        const kasaiSheetPlayer1 = new SpriteSheet(
            await ImageLoader.loadImage(
                "./res/SpriteSheet/Kasai/Player1/Kasai_SpriteSheet.png"
            ),
            32,
            64,
            21
        );

        const kasaiSheetPlayer2 = new SpriteSheet(
            await ImageLoader.loadImage(
                "./res/SpriteSheet/Kasai/Player2/Kasai_SpriteSheet.png"
            ),
            32,
            64,
            21
        );

        const domSheetPlayer2 = new SpriteSheet(
            await ImageLoader.loadImage(
                "./res/SpriteSheet/Dom/Player2/Dom_SpriteSheet.png"
            ),
            32,
            64,
            21
        );

        const domSheetPlayer1 = new SpriteSheet(
            await ImageLoader.loadImage(
                "./res/SpriteSheet/Dom/Player1/Dom_SpriteSheet.png"
            ),
            32,
            64,
            21
        );

        // Backgrounds
        const fireTempleSheet = new SpriteSheet(
            await ImageLoader.loadImage(
                "./res/backgrounds/FireTemple.png"
            ),
            1280,
            720,
            3
        );
        const kingdomSheet = new SpriteSheet(
            await ImageLoader.loadImage(
                "./res/backgrounds/KingDomsKingdom.png"
            ),
            1280,
            720,
            3
        );

        Assets.fireTemple = new Array(8);
        Assets.kingdom = new Array(8);

        for (let i = 0; i < Assets.fireTemple.length; i++) {
            Assets.fireTemple[i] = fireTempleSheet.crop(i);
        }

        for (let i = 0; i < Assets.kingdom.length; i++) {
            Assets.kingdom[i] = kingdomSheet.crop(i);
        }

        // === Kasai Player 1 ===
        Assets.kasai_stance_player1 = new Array(8);
        Assets.kasai_walk_left_player1 = new Array(10);
        Assets.kasai_walk_right_player1 = new Array(10);
        Assets.kasai_block_player1 = new Array(7);
        Assets.kasai_crouch_player1 = new Array(8);
        Assets.kasai_jump_player1 = new Array(7);
        Assets.kasai_hit_player1 = new Array(7);
        Assets.kasai_jump2_player1 = new Array(1);
        Assets.kasai_jump1_player1 = new Array(6);
        Assets.kasai_down1_player1 = new Array(8);
        Assets.kasai_down2_player1 = new Array(9);
        Assets.kasai_2_player1 = new Array(8);
        Assets.kasai_1_player1 = new Array(10);
        Assets.kasai_11_player1 = new Array(16);
        Assets.kasai_111_player1 = new Array(21);
        Assets.kasai_special_player1 = new Array(11);

        for (let i = 0; i < Assets.kasai_stance_player1.length; i++) {
            Assets.kasai_stance_player1[i] = kasaiSheetPlayer1.crop(i);
        }

        for (let i = 0; i < Assets.kasai_walk_left_player1.length; i++) {
            Assets.kasai_walk_right_player1[i] = kasaiSheetPlayer1.crop(i + 21);
            Assets.kasai_walk_left_player1[
                Assets.kasai_walk_left_player1.length - 1 - i
            ] = Assets.kasai_walk_right_player1[i];
        }

        for (let i = 0; i < Assets.kasai_block_player1.length; i++) {
            Assets.kasai_block_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 2);
        }

        for (let i = 0; i < Assets.kasai_crouch_player1.length; i++) {
            Assets.kasai_crouch_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 3);
        }

        for (let i = 0; i < Assets.kasai_jump_player1.length; i++) {
            Assets.kasai_jump_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 5);
        }

        for (let i = 0; i < Assets.kasai_hit_player1.length; i++) {
            Assets.kasai_hit_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 4);
        }

        Assets.kasai_jump2_player1[0] = kasaiSheetPlayer1.crop(126);

        for (let i = 0; i < Assets.kasai_jump1_player1.length; i++) {
            Assets.kasai_jump1_player1[i] = kasaiSheetPlayer1.crop(
                i + 2 + 21 * 6
            );
        }

        for (let i = 0; i < Assets.kasai_down1_player1.length; i++) {
            Assets.kasai_down1_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 7);
        }

        for (let i = 0; i < Assets.kasai_down2_player1.length; i++) {
            Assets.kasai_down2_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 8);
        }

        for (let i = 0; i < Assets.kasai_2_player1.length; i++) {
            Assets.kasai_2_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 9);
        }

        for (let i = 0; i < Assets.kasai_1_player1.length; i++) {
            Assets.kasai_1_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 10);
        }

        for (let i = 0; i < Assets.kasai_11_player1.length; i++) {
            Assets.kasai_11_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 11);
        }

        for (let i = 0; i < Assets.kasai_111_player1.length; i++) {
            Assets.kasai_111_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 12);
        }

        for (let i = 0; i < Assets.kasai_special_player1.length; i++) {
            Assets.kasai_special_player1[i] = kasaiSheetPlayer1.crop(i + 21 * 13);
        }

        // === Kasai Player 2 ===
        Assets.kasai_stance_player2 = new Array(8);
        Assets.kasai_walk_left_player2 = new Array(10);
        Assets.kasai_walk_right_player2 = new Array(10);
        Assets.kasai_block_player2 = new Array(7);
        Assets.kasai_crouch_player2 = new Array(8);
        Assets.kasai_jump_player2 = new Array(7);
        Assets.kasai_hit_player2 = new Array(7);
        Assets.kasai_jump2_player2 = new Array(1);
        Assets.kasai_jump1_player2 = new Array(6);
        Assets.kasai_down1_player2 = new Array(8);
        Assets.kasai_down2_player2 = new Array(9);
        Assets.kasai_2_player2 = new Array(8);
        Assets.kasai_1_player2 = new Array(10);
        Assets.kasai_11_player2 = new Array(16);
        Assets.kasai_111_player2 = new Array(21);
        Assets.kasai_special_player2 = new Array(11);

        for (let i = 0; i < Assets.kasai_stance_player2.length; i++) {
            Assets.kasai_stance_player2[i] = kasaiSheetPlayer2.crop(i);
        }

        for (let i = 0; i < Assets.kasai_walk_left_player2.length; i++) {
            Assets.kasai_walk_left_player2[i] = kasaiSheetPlayer2.crop(i + 21);
            Assets.kasai_walk_right_player2[
                Assets.kasai_walk_right_player2.length - 1 - i
            ] = Assets.kasai_walk_left_player2[i];
        }

        for (let i = 0; i < Assets.kasai_block_player2.length; i++) {
            Assets.kasai_block_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 2);
        }

        for (let i = 0; i < Assets.kasai_crouch_player2.length; i++) {
            Assets.kasai_crouch_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 3);
        }

        for (let i = 0; i < Assets.kasai_jump_player2.length; i++) {
            Assets.kasai_jump_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 5);
        }

        for (let i = 0; i < Assets.kasai_hit_player2.length; i++) {
            Assets.kasai_hit_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 4);
        }

        Assets.kasai_jump2_player2[0] = kasaiSheetPlayer2.crop(126);

        for (let i = 0; i < Assets.kasai_jump1_player2.length; i++) {
            Assets.kasai_jump1_player2[i] = kasaiSheetPlayer2.crop(
                i + 2 + 21 * 6
            );
        }

        for (let i = 0; i < Assets.kasai_down1_player2.length; i++) {
            Assets.kasai_down1_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 7);
        }

        for (let i = 0; i < Assets.kasai_down2_player2.length; i++) {
            Assets.kasai_down2_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 8);
        }

        for (let i = 0; i < Assets.kasai_2_player2.length; i++) {
            Assets.kasai_2_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 9);
        }

        for (let i = 0; i < Assets.kasai_1_player2.length; i++) {
            Assets.kasai_1_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 10);
        }

        for (let i = 0; i < Assets.kasai_11_player2.length; i++) {
            Assets.kasai_11_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 11);
        }

        for (let i = 0; i < Assets.kasai_111_player2.length; i++) {
            Assets.kasai_111_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 12);
        }

        for (let i = 0; i < Assets.kasai_special_player2.length; i++) {
            Assets.kasai_special_player2[i] = kasaiSheetPlayer2.crop(i + 21 * 13);
        }

        // === Dom Player 1 ===
        Assets.dom_stance_player1 = new Array(8);
        Assets.dom_walk_left_player1 = new Array(10);
        Assets.dom_walk_right_player1 = new Array(10);
        Assets.dom_block_player1 = new Array(7);
        Assets.dom_crouch_player1 = new Array(8);
        Assets.dom_jump_player1 = new Array(7);
        Assets.dom_hit_player1 = new Array(7);
        Assets.dom_jump2_player1 = new Array(1);
        Assets.dom_jump1_player1 = new Array(6);
        Assets.dom_down1_player1 = new Array(8);
        Assets.dom_down2_player1 = new Array(9);
        Assets.dom_2_player1 = new Array(8);
        Assets.dom_1_player1 = new Array(10);
        Assets.dom_11_player1 = new Array(16);
        Assets.dom_111_player1 = new Array(21);
        Assets.dom_special_player1 = new Array(11);
        Assets.dom_special_cancel_player1 = new Array(24);

        for (let i = 0; i < Assets.dom_stance_player1.length; i++) {
            Assets.dom_stance_player1[i] = domSheetPlayer1.crop(i);
        }

        for (let i = 0; i < Assets.dom_walk_left_player1.length; i++) {
            Assets.dom_walk_right_player1[i] = domSheetPlayer1.crop(i + 21);
            Assets.dom_walk_left_player1[
                Assets.dom_walk_left_player1.length - 1 - i
            ] = Assets.dom_walk_right_player1[i];
        }

        for (let i = 0; i < Assets.dom_block_player1.length; i++) {
            Assets.dom_block_player1[i] = domSheetPlayer1.crop(i + 21 * 2);
        }

        for (let i = 0; i < Assets.dom_crouch_player1.length; i++) {
            Assets.dom_crouch_player1[i] = domSheetPlayer1.crop(i + 21 * 3);
        }

        for (let i = 0; i < Assets.dom_jump_player1.length; i++) {
            Assets.dom_jump_player1[i] = domSheetPlayer1.crop(i + 21 * 5);
        }

        for (let i = 0; i < Assets.dom_hit_player1.length; i++) {
            Assets.dom_hit_player1[i] = domSheetPlayer1.crop(i + 21 * 4);
        }

        Assets.dom_jump2_player1[0] = domSheetPlayer1.crop(126);

        for (let i = 0; i < Assets.dom_jump1_player1.length; i++) {
            Assets.dom_jump1_player1[i] = domSheetPlayer1.crop(
                i + 2 + 21 * 6
            );
        }

        for (let i = 0; i < Assets.dom_down1_player1.length; i++) {
            Assets.dom_down1_player1[i] = domSheetPlayer1.crop(i + 21 * 7);
        }

        for (let i = 0; i < Assets.dom_down2_player1.length; i++) {
            Assets.dom_down2_player1[i] = domSheetPlayer1.crop(i + 21 * 8);
        }

        for (let i = 0; i < Assets.dom_2_player1.length; i++) {
            Assets.dom_2_player1[i] = domSheetPlayer1.crop(i + 21 * 9);
        }

        for (let i = 0; i < Assets.dom_1_player1.length; i++) {
            Assets.dom_1_player1[i] = domSheetPlayer1.crop(i + 21 * 10);
        }

        for (let i = 0; i < Assets.dom_11_player1.length; i++) {
            Assets.dom_11_player1[i] = domSheetPlayer1.crop(i + 21 * 11);
        }

        for (let i = 0; i < Assets.dom_111_player1.length; i++) {
            Assets.dom_111_player1[i] = domSheetPlayer1.crop(i + 21 * 12);
        }

        for (let i = 0; i < Assets.dom_special_player1.length; i++) {
            Assets.dom_special_player1[i] = domSheetPlayer1.crop(i + 21 * 13);
        }

        for (let i = 0; i < 14; i++) {
            Assets.dom_special_cancel_player1[i] = domSheetPlayer1.crop(
                i + 21 * 12
            );
        }

        for (
            let i = 14;
            i < Assets.dom_special_cancel_player1.length;
            i++
        ) {
            Assets.dom_special_cancel_player1[i] = domSheetPlayer1.crop(
                i + 21 * 13 - 14
            );
        }

        // === Dom Player 2 ===
        Assets.dom_stance_player2 = new Array(8);
        Assets.dom_walk_left_player2 = new Array(10);
        Assets.dom_walk_right_player2 = new Array(10);
        Assets.dom_block_player2 = new Array(7);
        Assets.dom_crouch_player2 = new Array(8);
        Assets.dom_jump_player2 = new Array(7);
        Assets.dom_hit_player2 = new Array(7);
        Assets.dom_jump2_player2 = new Array(1);
        Assets.dom_jump1_player2 = new Array(6);
        Assets.dom_down1_player2 = new Array(8);
        Assets.dom_down2_player2 = new Array(9);
        Assets.dom_2_player2 = new Array(8);
        Assets.dom_1_player2 = new Array(10);
        Assets.dom_11_player2 = new Array(16);
        Assets.dom_111_player2 = new Array(21);
        Assets.dom_special_player2 = new Array(11);
        Assets.dom_special_cancel_player2 = new Array(24);

        for (let i = 0; i < Assets.dom_stance_player2.length; i++) {
            Assets.dom_stance_player2[i] = domSheetPlayer2.crop(i);
        }

        for (let i = 0; i < Assets.dom_walk_left_player2.length; i++) {
            Assets.dom_walk_right_player2[i] = domSheetPlayer2.crop(i + 21);
            Assets.dom_walk_left_player2[
                Assets.dom_walk_left_player2.length - 1 - i
            ] = Assets.dom_walk_right_player2[i];
        }

        for (let i = 0; i < Assets.dom_block_player2.length; i++) {
            Assets.dom_block_player2[i] = domSheetPlayer2.crop(i + 21 * 2);
        }

        for (let i = 0; i < Assets.dom_crouch_player2.length; i++) {
            Assets.dom_crouch_player2[i] = domSheetPlayer2.crop(i + 21 * 3);
        }

        for (let i = 0; i < Assets.dom_jump_player2.length; i++) {
            Assets.dom_jump_player2[i] = domSheetPlayer2.crop(i + 21 * 5);
        }

        for (let i = 0; i < Assets.dom_hit_player2.length; i++) {
            Assets.dom_hit_player2[i] = domSheetPlayer2.crop(i + 21 * 4);
        }

        Assets.dom_jump2_player2[0] = domSheetPlayer2.crop(126);

        for (let i = 0; i < Assets.dom_jump1_player2.length; i++) {
            Assets.dom_jump1_player2[i] = domSheetPlayer2.crop(
                i + 2 + 21 * 6
            );
        }

        for (let i = 0; i < Assets.dom_down1_player2.length; i++) {
            Assets.dom_down1_player2[i] = domSheetPlayer2.crop(i + 21 * 7);
        }

        for (let i = 0; i < Assets.dom_down2_player2.length; i++) {
            Assets.dom_down2_player2[i] = domSheetPlayer2.crop(i + 21 * 8);
        }

        for (let i = 0; i < Assets.dom_2_player2.length; i++) {
            Assets.dom_2_player2[i] = domSheetPlayer2.crop(i + 21 * 9);
        }

        for (let i = 0; i < Assets.dom_1_player2.length; i++) {
            Assets.dom_1_player2[i] = domSheetPlayer2.crop(i + 21 * 10);
        }

        for (let i = 0; i < Assets.dom_11_player2.length; i++) {
            Assets.dom_11_player2[i] = domSheetPlayer2.crop(i + 21 * 11);
        }

        for (let i = 0; i < Assets.dom_111_player2.length; i++) {
            Assets.dom_111_player2[i] = domSheetPlayer2.crop(i + 21 * 12);
        }

        for (let i = 0; i < Assets.dom_special_player2.length; i++) {
            Assets.dom_special_player2[i] = domSheetPlayer2.crop(i + 21 * 13);
        }

        for (let i = 0; i < 14; i++) {
            Assets.dom_special_cancel_player2[i] = domSheetPlayer2.crop(
                i + 21 * 12
            );
        }

        for (
            let i = 14;
            i < Assets.dom_special_cancel_player1.length;
            i++
        ) {
            Assets.dom_special_cancel_player2[i] = domSheetPlayer2.crop(
                i + 21 * 13 - 14
            );
        }

        Assets.menuMusic = new Audio("./MenuOST.wav"); // relative to index.html
        Assets.menuMusic.loop = true;

        // Try to preload audio so it's ready when we play it
        await new Promise((resolve) => {
            const onReady = () => {
                Assets.menuMusic.removeEventListener("canplaythrough", onReady);
                resolve();
            };
            Assets.menuMusic.addEventListener("canplaythrough", onReady);
            // In case the event already fired (cached), resolve on next tick
            setTimeout(resolve, 0);
        });
    }

    static playMenuMusic() {
        if (!Assets.menuMusic) return;

        Assets.menuMusic.currentTime = 0;
        Assets.menuMusic
            .play()
            .catch((err) => {
                console.warn("Menu music play was blocked (likely autoplay):", err);
            });
    }
}
