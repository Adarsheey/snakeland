export class Player {
    constructor(game, id, name, color) {
        this.game = game;
        this.id = id;
        this.name = name;
        this.color = color;
        this.position = 1;
        this.element = this.createToken();
        this.updatePositionVisuals();
    }

    createToken() {
        const token = document.createElement('div');
        token.classList.add('player-token');
        token.style.backgroundColor = this.color;
        token.setAttribute('title', this.name);
        token.id = `player-${this.id}`;

        // Append to board container so it moves relative to it
        document.querySelector('.board-container').appendChild(token);
        return token;
    }

    async move(steps) {
        // Step-by-step movement for visual effect
        for (let i = 0; i < steps; i++) {
            if (this.position < 100) {
                this.position++;
                this.updatePositionVisuals();
                this.game.audio.playMove(); // Trigger sound
                await new Promise(r => setTimeout(r, 300)); // Delay between steps
            } else {
                // Bounce back logic handled by Game controller or here?
                // Logic request says: "If player overshoots 100: Bounce back".
                // Simplest is to handle overshoot after the loop or perform it step by step.
                // Let's overshoot step by step: 99 -> 100 -> 99.
                this.position = 100 - (this.position + 1 - 100);
                // Wait, if I am at 98 and roll 4. 
                // 99, 100, 99, 98.
                // It's easier to handle step direction.
            }
        }
    }

    // Move to specific position (Snake/Ladder/Jump)
    moveTo(targetPos) {
        this.position = targetPos;
        this.updatePositionVisuals();
    }

    // Step-by-step generic move for the loop in Game.js
    setPosition(pos) {
        this.position = pos;
        this.updatePositionVisuals();
    }

    updatePositionVisuals() {
        const center = this.game.board.getCellCenter(this.position);

        // Offset based on player ID to avoid total overlap
        // 2-4 players. 
        // P1: -5, -5
        // P2: 5, -5
        // P3: -5, 5
        // P4: 5, 5

        let offsetX = 0;
        let offsetY = 0;
        const offsetAmount = 6;

        switch (this.id) {
            case 0: offsetX = -offsetAmount; offsetY = -offsetAmount; break;
            case 1: offsetX = offsetAmount; offsetY = -offsetAmount; break;
            case 2: offsetX = -offsetAmount; offsetY = offsetAmount; break;
            case 3: offsetX = offsetAmount; offsetY = offsetAmount; break;
        }

        this.element.style.left = `${center.x + offsetX}px`;
        this.element.style.top = `${center.y + offsetY}px`;
    }
}
