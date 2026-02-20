import { Board } from './Board.js';
import { Player } from './Player.js';
import { Dice } from './Dice.js';
import { UI } from './UI.js';
import { AudioController } from './Audio.js';
import { Utils } from './Utils.js';

export class Game {
    constructor() {
        this.board = new Board(this);
        this.ui = new UI(this);
        this.dice = new Dice('dice');
        this.audio = new AudioController();
        this.players = [];
        this.finishedPlayers = [];
        this.currentPlayerIndex = 0;
        this.isProcessingTurn = false;
        this.gameEnded = false;

        this.playerColors = ['#ff2020', '#1d8aff', '#00e676', '#ffb300'];
    }

    init() {
        this.board.init();
        this.ui.showSetup();
    }

    start(playerNames) {
        this.players = playerNames.map((name, index) =>
            new Player(this, index, name, this.playerColors[index % this.playerColors.length])
        );
        this.finishedPlayers = [];
        this.gameEnded = false;
        this.currentPlayerIndex = 0;

        this.ui.updateActivePlayer(this.getCurrentPlayer());
        this.ui.updateScoreboard();
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    async handleRoll() {
        if (this.isProcessingTurn || this.gameEnded) return;
        this.isProcessingTurn = true;
        this.ui.setRollButtonState(false);

        // Resume AudioContext if needed (browser autoplay policy)
        if (this.audio.ctx.state === 'suspended') {
            await this.audio.ctx.resume();
        }

        this.audio.playRoll();
        const rollValue = await this.dice.roll();

        await this.processTurn(rollValue);
    }

    async processTurn(rollValue) {
        const player = this.getCurrentPlayer();
        const startPos = player.position;
        let targetPos = startPos + rollValue;

        // 1. Move visuals step-by-step
        if (targetPos > 100) {
            // Bounce back
            const overshoot = targetPos - 100;
            const forwardSteps = 100 - startPos;
            await player.move(forwardSteps);

            player.position = 100;
            player.updatePositionVisuals();
            await Utils.sleep(200);

            player.position = 100 - overshoot;
            player.updatePositionVisuals();
            this.audio.playMove();

        } else {
            await player.move(rollValue);
        }

        // 2. Check Win / Finish
        if (player.position === 100) {
            await this.handlePlayerFinish(player);
            // If game ended in handlePlayerFinish, return
            if (this.gameEnded) return;
        } else {
            // 3. Check Snakes / Ladders only if not finished
            await this.checkEntityInteractions(player);
        }

        // 4. Update UI
        this.ui.updateScoreboard();

        // 5. Next Turn
        if (!this.gameEnded) {
            // Logic for next player:
            // If dice was 6 and player NOT finished, they get another turn.
            // If player finished, they don't get another turn even if they rolled 6 (usually).
            // Let's say if you finish, turn passes.

            const playerFinished = this.finishedPlayers.includes(player);
            if (rollValue === 6 && !playerFinished) {
                // Same player continues
            } else {
                this.nextTurn();
            }
        }

        if (!this.gameEnded) {
            this.ui.updateActivePlayer(this.getCurrentPlayer());
            this.ui.setRollButtonState(true);
        }

        this.isProcessingTurn = false;
    }

    nextTurn() {
        // Find next non-finished player
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let loops = 0;

        while (this.finishedPlayers.includes(this.players[nextIndex]) && loops < this.players.length) {
            nextIndex = (nextIndex + 1) % this.players.length;
            loops++;
        }

        this.currentPlayerIndex = nextIndex;
    }

    async checkEntityInteractions(player) {
        const snakeTail = this.board.snakes[player.position];
        const ladderTop = this.board.ladders[player.position];

        if (snakeTail) {
            await Utils.sleep(400);
            this.audio.playSnake();
            player.moveTo(snakeTail);
        } else if (ladderTop) {
            await Utils.sleep(400);
            this.audio.playLadder();
            player.moveTo(ladderTop);
        }
    }

    async handlePlayerFinish(player) {
        this.audio.playWin();
        this.finishedPlayers.push(player);
        const rank = this.finishedPlayers.length;

        // Show celebration for this player
        await this.ui.showRankModal(player, rank);

        // Check if game should end
        // Game ends if only 1 player remaining (or 0 if single player testing)
        // Active mechanics:
        // 2 players: 1 finishes -> 1 left -> Game Over immediately? User said "others should continue".
        // But with 1 player left, there's no one to play against.
        // So traditionally, once N-1 players finish, the last one is last place and game ends.

        if (this.finishedPlayers.length >= this.players.length - 1 && this.players.length > 1) {
            this.endGame();
        }
    }

    endGame() {
        this.gameEnded = true;
        this.ui.showGameOver(this.finishedPlayers, this.players);
    }
}
