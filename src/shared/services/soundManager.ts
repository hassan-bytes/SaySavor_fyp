// ============================================================
// FILE: soundManager.ts
// SECTION: shared > services
// PURPOSE: App ke sounds manage karna â€” new order, accepted, ready sounds.
//          Partner dashboard mein use hota hai real-time order alerts ke liye.
// ============================================================
// ============================================
// NOTIFICATION SOUNDS UTILITY
// ============================================

/**
 * Sound notification system for order events
 * Uses heavily synthesized Web Audio API for guaranteed cross-browser loud alerts 
 * without relying on external mp3/ogg files that might be blocked.
 */

class OrderSoundManager {
    private static instance: OrderSoundManager;
    private enabled: boolean = true;
    private ctx: AudioContext | null = null;
    private isUnlocked: boolean = false;

    private constructor() { }

    static getInstance(): OrderSoundManager {
        if (!OrderSoundManager.instance) {
            OrderSoundManager.instance = new OrderSoundManager();
        }
        return OrderSoundManager.instance;
    }

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                return null;
            }
        }
        return this.ctx;
    }

    /**
     * Initializes audio context to bypass Autoplay Policies
     */
    public unlockAudio() {
        if (this.isUnlocked) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = 0;
            osc.start();
            osc.stop(ctx.currentTime + 0.01);
            this.isUnlocked = true;
        } catch (e) { }
    }

    /**
     * Play notification for new order (Aggressive Dual-Tone Alarm)
     */
    playNewOrder() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx || ctx.state === 'suspended') return;

        try {
            // Play a ringing bell pattern (5 fast rings)
            for (let i = 0; i < 6; i++) {
                const startTime = ctx.currentTime + (i * 0.25);

                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'triangle';

                // Ringing frequencies
                osc1.frequency.setValueAtTime(1200, startTime);
                osc1.frequency.exponentialRampToValueAtTime(800, startTime + 0.15);

                gain1.gain.setValueAtTime(0, startTime);
                gain1.gain.linearRampToValueAtTime(0.8, startTime + 0.02); // VERY LOUD (0.8)
                gain1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(startTime);
                osc1.stop(startTime + 0.2);
            }
        } catch (e) { }
    }

    /**
     * Play service bell (Polite Double-Ding for Waiter Call)
     */
    playServiceBell() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx || ctx.state === 'suspended') return;

        try {
            const playDing = (delay: number) => {
                const startTime = ctx.currentTime + delay;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(1400, startTime);
                osc.frequency.exponentialRampToValueAtTime(1200, startTime + 0.1);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.6);
            };

            playDing(0);
            playDing(0.15); // Second ding follows closely
        } catch (e) { }
    }

    /**
     * Play success sound for order acceptance (Simple ting)
     */
    playAccepted() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx || ctx.state === 'suspended') return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // High C

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { }
    }

    /**
     * Play rejection sound (Low buzz)
     */
    playRejected() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx || ctx.state === 'suspended') return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 150;
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { }
    }

    /**
     * Play ready notification
     */
    playReady() {
        this.playAccepted();
    }

    /**
     * Toggle sound on/off
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

export const soundManager = OrderSoundManager.getInstance();
