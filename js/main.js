/**
 * Entry point for the Snakes and Ladders Application.
 */
import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
