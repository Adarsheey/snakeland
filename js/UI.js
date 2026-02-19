export class UI {
    constructor(game) {
        this.game = game;
        this.setupElements();
        this.bindEvents();
    }

    setupElements() {
        this.setupModal = document.getElementById('setup-modal');
        this.winModal = document.getElementById('win-modal');
        this.setupForm = document.getElementById('setup-form');
        this.playerCountSelect = document.getElementById('player-count');
        this.playerInputs = document.getElementById('player-inputs');

        // Corners
        this.corners = [
            document.getElementById('corner-0'),
            document.getElementById('corner-1'),
            document.getElementById('corner-2'),
            document.getElementById('corner-3')
        ];

        this.restartBtn = document.getElementById('restart-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.themeToggle = document.getElementById('theme-toggle');

        // Prepare Dice Control
        const template = document.getElementById('dice-template');
        this.diceControl = template.content.cloneNode(true).querySelector('.dice-control-panel');
        this.rollBtn = this.diceControl.querySelector('#roll-btn');

        // Provide dice element to game/dice instance if needed, 
        // but Dice class queries #dice-cube.

        this.updatePlayerInputs(2);
    }

    bindEvents() {
        this.playerCountSelect.addEventListener('change', (e) => {
            this.updatePlayerInputs(Number(e.target.value));
        });

        this.setupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const players = [];
            for (let i = 0; i < this.playerCountSelect.value; i++) {
                players.push(formData.get(`player-${i}-name`) || `Player ${i + 1}`);
            }
            this.game.start(players);
            this.setupModal.close();
        });

        this.rollBtn.addEventListener('click', () => {
            this.game.handleRoll();
        });

        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => {
                const confirmed = confirm("Are you sure you want to restart the game?");
                if (confirmed) location.reload();
            });
        }

        this.playAgainBtn.addEventListener('click', () => {
            if (this.game.gameEnded) {
                location.reload();
            } else {
                this.winModal.close();
            }
        });

        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.dataset.theme;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.dataset.theme = newTheme;
            this.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }

    updatePlayerInputs(count) {
        this.playerInputs.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label>Player ${i + 1} Name</label>
                <input type="text" name="player-${i}-name" placeholder="Player ${i + 1}" value="Player ${i + 1}" required>
            `;
            this.playerInputs.appendChild(div);
        }
    }

    showSetup() {
        this.setupModal.showModal();
    }

    updateActivePlayer(player) {
        // Highlight active corner
        this.corners.forEach(c => c.classList.remove('active'));

        const activeCorner = this.corners[player.id];
        if (activeCorner) {
            // Append Dice Control to this corner
            activeCorner.appendChild(this.diceControl);

            // Ensure visual active state
            const info = activeCorner.querySelector('.player-info');
            if (info) {
                // Reset all borders
                document.querySelectorAll('.player-info').forEach(el => el.classList.remove('active-turn'));
                info.classList.add('active-turn');
            }
        }

        // Update list/scoreboard logic
        this.updateScoreboard();
    }

    updateScoreboard() {
        // Update all corners
        this.game.players.forEach(p => {
            const corner = this.corners[p.id];

            const isFinished = this.game.finishedPlayers.includes(p);
            const rank = this.game.finishedPlayers.indexOf(p) + 1;

            let statusHTML = `<span class="player-status">Pos: ${p.position}</span>`;
            if (isFinished) {
                statusHTML = `<span class="player-status" style="color:#f59e0b">🏆 Rank: ${rank}</span>`;
            }

            // Check if info exists
            let info = corner.querySelector('.player-info');
            if (!info) {
                info = document.createElement('div');
                info.className = 'player-info';
                corner.appendChild(info);
            }

            // Background = player color, text = white
            info.style.background = p.color;
            info.style.color = '#ffffff';

            let rankBadge = '';
            if (isFinished) rankBadge = `<span style="font-size:1.2rem">🏆 Rank: ${rank}</span>`;

            info.innerHTML = `
                <span class="player-name" style="color:#fff">${p.name}</span>
                ${isFinished ? rankBadge : `<span class="player-status" style="color:rgba(255,255,255,0.85)">Pos: ${p.position}</span>`}
            `;

            if (p === this.game.getCurrentPlayer() && !this.game.gameEnded) {
                info.classList.add('active-turn');
            } else {
                info.classList.remove('active-turn');
            }
        });

        // Hide unused corners
        for (let i = this.game.players.length; i < 4; i++) {
            this.corners[i].innerHTML = '';
        }
    }

    setRollButtonState(enabled) {
        this.rollBtn.disabled = !enabled;
    }

    async showRankModal(player, rank) {
        const title = document.getElementById('winner-name');
        const btn = document.getElementById('play-again-btn');

        title.innerHTML = `${player.name} finished <br><span style="font-size:3rem">${this.getOrdinal(rank)}!</span>`;
        btn.textContent = "Continue Game";

        this.winModal.showModal();
        this.startConfetti();

        return new Promise(resolve => {
            const closeHandler = () => {
                resolve();
                btn.removeEventListener('click', closeHandler);
            };
            btn.onclick = closeHandler;
        });
    }

    showGameOver(finishedPlayers, allPlayers) {
        const title = document.getElementById('winner-name');
        const btn = document.getElementById('play-again-btn');
        title.textContent = "Game Over!";

        let listHtml = '<ul style="list-style:none; padding:0; margin-top:1rem; text-align:left;">';
        finishedPlayers.forEach((p, i) => {
            listHtml += `<li style="margin-bottom:0.5rem; font-size:1.2rem">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : 'e'} ${p.name}
            </li>`;
        });

        const lastPlayer = allPlayers.find(p => !finishedPlayers.includes(p));
        if (lastPlayer) {
            listHtml += `<li style="opacity:0.7; font-size:1rem; margin-top:0.5rem">🐢 ${lastPlayer.name} (Last)</li>`;
        }
        listHtml += '</ul>';

        const content = this.winModal.querySelector('.modal-content');
        const oldResults = content.querySelector('.results-list');
        if (oldResults) oldResults.remove();

        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'results-list';
        resultsDiv.innerHTML = listHtml;

        title.after(resultsDiv);

        btn.textContent = "Play Again";
        btn.onclick = () => location.reload();

        this.winModal.showModal();
        this.startConfetti();
    }

    getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    startConfetti() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';

        const container = this.winModal.querySelector('.confetti-container');
        container.innerHTML = '';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vy: Math.random() * 5 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        }

        let animationId;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.y += p.vy;
                if (p.y > canvas.height) p.y = -10;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 5, 5);
            });
            if (this.winModal.open) {
                animationId = requestAnimationFrame(animate);
            }
        };
        animate();
    }
}
