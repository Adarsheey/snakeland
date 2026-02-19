export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playRoll() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Noise buffer for rattle
        const bufferSize = this.ctx.sampleRate * 0.8;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();

        // Filter to simulate plastic/wood container/dice
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);

        // Rattle envelope
        gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        noise.start(now);
        noise.stop(now + 0.8);
    }

    playMove() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSnake() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playLadder() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playWin() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // Simple arpeggio
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime + (i * 0.1);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
        });
    }
}
