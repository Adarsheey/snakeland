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

        // ── Guard: finished players never move again ──────────────────────────
        if (this.finishedPlayers.includes(player)) {
            this.nextTurn();
            this.ui.updateActivePlayer(this.getCurrentPlayer());
            this.ui.setRollButtonState(true);
            this.isProcessingTurn = false;
            return;
        }

        const startPos = player.position;
        let targetPos = startPos + rollValue;

        // 1. Move visuals step-by-step
        if (targetPos > 100) {
            // Bounce back: go to 100 then back
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
            if (this.gameEnded) return;

        } else {
            // 3. Check Snakes / Ladders only if not at finish
            await this.checkEntityInteractions(player);
        }

        // 4. Update UI
        this.ui.updateScoreboard();

        // 5. Next Turn
        if (!this.gameEnded) {
            const playerFinished = this.finishedPlayers.includes(player);
            // Extra turn for rolling 6, unless player just finished
            if (rollValue === 6 && !playerFinished) {
                // Same player continues
            } else {
                this.nextTurn();
            }

            this.ui.updateActivePlayer(this.getCurrentPlayer());
            this.ui.setRollButtonState(true);
        }

        this.isProcessingTurn = false;
    }

    nextTurn() {
        const total = this.players.length;
        let nextIndex = (this.currentPlayerIndex + 1) % total;
        let loops = 0;

        // Skip finished players
        while (this.finishedPlayers.includes(this.players[nextIndex]) && loops < total) {
            nextIndex = (nextIndex + 1) % total;
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

        this.ui.updateScoreboard(); // Mark player as finished in UI

        // Show brief rank celebration (non-blocking for 2-player; auto-closes)
        const isFinalRound = this.finishedPlayers.length >= this.players.length - 1;

        if (isFinalRound) {
            // Last unfinished player is automatically last place — end game now
            this.endGame();
        } else {
            // Mid-game winner: show celebratory modal, user must click to continue
            await this.ui.showRankModal(player, rank);
        }
    }

    endGame() {
        this.gameEnded = true;

        // Determine last place: the player who hasn't finished yet
        const lastPlayer = this.players.find(p => !this.finishedPlayers.includes(p));
        if (lastPlayer) {
            this.finishedPlayers.push(lastPlayer); // Add as last place
        }

        this.ui.showGameOver(this.finishedPlayers, this.players);
    }
}
