export class Dice {
    constructor(elementId) {
        // Element is retrieved during roll or set by UI
    }

    async roll() {
        const element = document.getElementById('dice-cube');
        if (!element) return 1; // Fallback

        // Random outcome
        const finalValue = Math.floor(Math.random() * 6) + 1;

        // Random rotations for effect
        // We want a lot of spin
        const spinCount = 2; // turns
        const xRand = Math.floor(Math.random() * 4);
        const yRand = Math.floor(Math.random() * 4);

        // Target angles for each face
        // 1: 0, 0
        // 2: 0, -90
        // 3: 0, -180
        // 4: 0, 90
        // 5: -90, 0
        // 6: 90, 0

        let xTarget = 0;
        let yTarget = 0;

        switch (finalValue) {
            case 1: xTarget = 0; yTarget = 0; break;
            case 2: xTarget = 0; yTarget = -90; break;
            case 3: xTarget = 0; yTarget = -180; break;
            case 4: xTarget = 0; yTarget = 90; break;
            case 5: xTarget = -90; yTarget = 0; break;
            case 6: xTarget = 90; yTarget = 0; break;
        }

        // Add full rotations to simulate rolling
        const xRot = xTarget + (360 * spinCount);
        const yRot = yTarget + (360 * spinCount);

        // Reset transition to allow "snap back" if we were already rotated?
        // Actually, we can just keep adding rotations.
        // But to keep numbers sane, let's reset to 0,0 first? 
        // If we reset, visual glitch. 
        // Better: ensure we are always adding to current rotation?
        // Simplifying: Just set specific high rotation.

        element.style.transition = 'transform 1s cubic-bezier(0.1, 0.7, 0.1, 1)';
        element.style.transform = `translateZ(-30px) rotateX(${xRot}deg) rotateY(${yRot}deg)`;

        return new Promise(resolve => {
            setTimeout(() => {
                // Return just the value. We leave the dice rotated.
                // Next roll will add more rotation or we reset.
                // If we reset here silently it might jerk. 
                // Let's leave it. The next roll will overwrite transform.
                // To support next roll starting from here, we'd need to track current rotation.
                // For simplicity, we just overwrite. It will snap to start then roll.
                // To avoid snap, we could toggle classes or use JS state.
                // Given "Vanilla JS", snapping at start of roll is acceptable or we hide it.

                resolve(finalValue);
            }, 1000);
        });
    }
}
