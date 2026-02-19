export class Board {
    constructor(game) {
        this.game = game;
        this.gridSize = 10;
        this.boardElement = document.getElementById('board');
        this.overlayElement = document.getElementById('board-overlay');

        // Snakes: Start (Head) -> End (Tail). Start > End.
        this.snakes = {
            16: 6,
            47: 26,
            49: 11,
            56: 53,
            62: 19,
            64: 60,
            87: 24,
            93: 73,
            95: 75,
            98: 78
        };

        // Ladders: Start (Bottom) -> End (Top). Start < End.
        this.ladders = {
            1: 38,
            4: 14,
            9: 31,
            21: 42,
            28: 84,
            36: 44,
            51: 67,
            71: 91,
            80: 100
        };
    }

    init() {
        this.generateGrid();
        // Delay overlay drawing to ensure DOM is fully rendered/sized
        requestAnimationFrame(() => {
            this.drawOverlay();
        });

        // Redraw on resize
        window.addEventListener('resize', () => {
            this.drawOverlay();
        });
    }

    generateGrid() {
        this.boardElement.innerHTML = '';
        for (let i = 1; i <= 100; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.textContent = i;

            // Calculate Position
            const { row, col } = this.getGridPosition(i);

            cell.style.gridRow = row;
            cell.style.gridColumn = col;

            this.boardElement.appendChild(cell);
        }
    }

    getGridPosition(n) {
        // Visual Row (1-10 from top)
        const r = Math.floor((n - 1) / 10); // 0 to 9 (from bottom basic logic)
        const visualRow = 10 - r;

        let visualCol;
        if (r % 2 === 0) {
            // Even row index (0, 2...) -> Bottom row (1-10), 21-30. Left to Right.
            visualCol = (n - 1) % 10 + 1;
        } else {
            // Odd row index (1, 3...) -> 11-20. Right to Left.
            visualCol = 10 - ((n - 1) % 10);
        }
        return { row: visualRow, col: visualCol };
    }

    // Get center coordinates of a cell relative to the board container
    getCellCenter(n) {
        const cell = this.boardElement.querySelector(`.cell[data-index='${n}']`);
        if (!cell) return { x: 0, y: 0 };

        const rect = cell.getBoundingClientRect();
        const boardRect = this.boardElement.getBoundingClientRect();

        return {
            x: rect.left - boardRect.left + rect.width / 2,
            y: rect.top - boardRect.top + rect.height / 2
        };
    }

    drawOverlay() {
        this.overlayElement.innerHTML = '';
        const boardRect = this.boardElement.getBoundingClientRect();

        // Set viewBox matching current pixels for easier drawing, 
        // or just rely on 0-100% if we mapped coords to %? 
        // Let's use internal coordinate system matching the board size.
        this.overlayElement.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);

        // Draw Ladders
        for (const [start, end] of Object.entries(this.ladders)) {
            this.drawLadder(Number(start), Number(end));
        }

        // Draw Snakes
        for (const [start, end] of Object.entries(this.snakes)) {
            this.drawSnake(Number(start), Number(end));
        }
    }

    drawSnake(head, tail) {
        const start = this.getCellCenter(head);
        const end = this.getCellCenter(tail);

        // Unique vivid color pairs per snake
        const colorPalette = [
            ['#ff4757', '#ff6b81'],   // red
            ['#2ed573', '#7bed9f'],   // green
            ['#eccc68', '#ffa502'],   // amber/orange
            ['#70a1ff', '#1e90ff'],   // blue
            ['#ff6b6b', '#ee5a24'],   // deep orange
            ['#a29bfe', '#6c5ce7'],   // purple
            ['#fd79a8', '#e84393'],   // pink
            ['#00cec9', '#00b894'],   // teal
            ['#fdcb6e', '#e17055'],   // warm yellow-orange
            ['#b2bec3', '#636e72'],   // steel grey
        ];

        // Pick a color by snake index (stable — use head cell number mod palette length)
        const colorIdx = (head % colorPalette.length);
        const [colorA, colorB] = colorPalette[colorIdx];

        const gradId = `snakeGrad_${head}`;

        // --- Define per-snake gradient ---
        let defs = this.overlayElement.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            this.overlayElement.prepend(defs);
        }
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.id = gradId;
        grad.setAttribute("gradientUnits", "userSpaceOnUse");
        grad.setAttribute("x1", start.x); grad.setAttribute("y1", start.y);
        grad.setAttribute("x2", end.x); grad.setAttribute("y2", end.y);
        grad.innerHTML = `
            <stop offset="0%"   stop-color="${colorA}" />
            <stop offset="100%" stop-color="${colorB}" />
        `;
        defs.appendChild(grad);

        // --- Build a simple 2-bend path using 3 quadratic bezier curves ---
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Perpendicular unit vector
        const px = -dy / len;
        const py = dx / len;

        // Bend amplitude — fixed feel, not too wild
        const amp = Math.min(len * 0.22, 25);
        const sign = (head % 2 === 0) ? 1 : -1;

        // 2 intermediate points along the snake, bent left then right
        const mid1x = start.x + dx * 0.33 + px * amp * sign;
        const mid1y = start.y + dy * 0.33 + py * amp * sign;
        const mid2x = start.x + dx * 0.67 - px * amp * sign;
        const mid2y = start.y + dy * 0.67 - py * amp * sign;

        // Smooth path: start -> Q bend1 -> mid1 -> Q bend2 -> end
        // Use the midpoints as anchors and derived control points for smoothness
        const pathStr = [
            `M ${start.x} ${start.y}`,
            `Q ${mid1x} ${mid1y} ${(mid1x + mid2x) / 2} ${(mid1y + mid2y) / 2}`,
            `Q ${mid2x} ${mid2y} ${end.x} ${end.y}`,
        ].join(' ');

        // --- Snake body path ---
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathStr);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", `url(#${gradId})`);
        path.setAttribute("stroke-width", "8");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        this.overlayElement.appendChild(path);

        // --- Sharp tail: triangle spike at end ---
        // Direction of last segment (mid2 -> end)
        const tdx = end.x - mid2x;
        const tdy = end.y - mid2y;
        const tLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const tux = tdx / tLen;
        const tuy = tdy / tLen;

        const spikeLen = 10;
        const spikeW = 4;

        const tipX = end.x + tux * spikeLen;
        const tipY = end.y + tuy * spikeLen;
        const b1x = end.x - tuy * spikeW;
        const b1y = end.y + tux * spikeW;
        const b2x = end.x + tuy * spikeW;
        const b2y = end.y - tux * spikeW;

        const spike = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        spike.setAttribute("points", `${tipX},${tipY} ${b1x},${b1y} ${b2x},${b2y}`);
        spike.setAttribute("fill", colorB);
        this.overlayElement.appendChild(spike);

        // --- Eyes at head — perpendicular to first segment direction ---
        const eyeOffset = 4;
        const hdx = mid1x - start.x;
        const hdy = mid1y - start.y;
        const hLen = Math.sqrt(hdx * hdx + hdy * hdy) || 1;
        const hpx = -hdy / hLen;
        const hpy = hdx / hLen;

        this.drawCircle(start.x + hpx * eyeOffset, start.y + hpy * eyeOffset, 3, 'white');
        this.drawCircle(start.x - hpx * eyeOffset, start.y - hpy * eyeOffset, 3, 'white');
        this.drawCircle(start.x + hpx * eyeOffset, start.y + hpy * eyeOffset, 1.5, '#111');
        this.drawCircle(start.x - hpx * eyeOffset, start.y - hpy * eyeOffset, 1.5, '#111');
    }

    drawLadder(startIdx, endIdx) {
        const p1 = this.getCellCenter(startIdx);
        const p2 = this.getCellCenter(endIdx);

        const width = 10;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Perpendicular offset
        const ox = -Math.sin(angle) * (width / 2);
        const oy = Math.cos(angle) * (width / 2);

        // Two rails
        const rail1 = `M ${p1.x + ox} ${p1.y + oy} L ${p2.x + ox} ${p2.y + oy}`;
        const rail2 = `M ${p1.x - ox} ${p1.y - oy} L ${p2.x - ox} ${p2.y - oy}`;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("stroke", "#8B4513");
        g.setAttribute("stroke-width", "2");

        const r1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        r1.setAttribute("d", rail1);
        g.appendChild(r1);

        const r2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        r2.setAttribute("d", rail2);
        g.appendChild(r2);

        // Steps
        const stepsCount = Math.floor(len / 15);
        for (let i = 1; i < stepsCount; i++) {
            const t = i / stepsCount;
            const sx = p1.x + dx * t;
            const sy = p1.y + dy * t;
            const stepPath = `M ${sx + ox} ${sy + oy} L ${sx - ox} ${sy - oy}`;
            const step = document.createElementNS("http://www.w3.org/2000/svg", "path");
            step.setAttribute("d", stepPath);
            g.appendChild(step);
        }

        this.overlayElement.appendChild(g);
    }

    drawCircle(x, y, r, color) {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
        c.setAttribute("r", r);
        c.setAttribute("fill", color);
        this.overlayElement.appendChild(c);
    }
}
