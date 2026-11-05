// Web Audio API based Realtime Ringtone Generator
// No external audio files needed; guarantees instant playback without 404 or CORS issues.

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private ringInterval: NodeJS.Timeout | null = null;
  private isRinging = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play a single harmonic chime (frequencies in Hz, duration in seconds)
  private playChord(frequencies: number[], duration = 0.8, type: OscillatorType = "sine", gainLevel = 0.15) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gainLevel, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      gainNode.connect(ctx.destination);

      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn("Audio chime note:", e);
    }
  }

  // Outgoing Ringtone: Traditional gentle calling tone (440Hz + 480Hz)
  startOutgoingRing() {
    this.stopAll();
    this.isRinging = true;

    const playPulse = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 1.2);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        gainNode.connect(ctx.destination);

        [440, 480].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 1.5);
        });
      } catch (err) {
        console.warn("Outgoing ring note:", err);
      }
    };

    playPulse();
    this.ringInterval = setInterval(playPulse, 3500);
  }

  // Incoming Ringtone: Beautiful celestial prayer chime arpeggio (C5 - E5 - G5 - C6)
  startIncomingRing() {
    this.stopAll();
    this.isRinging = true;

    const playMelody = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const notes = [
          { freq: 523.25, time: 0 }, // C5
          { freq: 659.25, time: 0.22 }, // E5
          { freq: 783.99, time: 0.44 }, // G5
          { freq: 1046.5, time: 0.66 }, // C6
          { freq: 783.99, time: 1.1 }, // G5
          { freq: 1046.5, time: 1.35 }, // C6
        ];

        notes.forEach(({ freq, time }) => {
          const noteTime = ctx.currentTime + time;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.18, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.65);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 0.7);
        });
      } catch (err) {
        console.warn("Incoming ring note:", err);
      }
    };

    playMelody();
    this.ringInterval = setInterval(playMelody, 3200);
  }

  // Connected chime when call is picked
  playConnectedSound() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const notes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.15 },
        { freq: 783.99, time: 0.3 },
      ];
      notes.forEach(({ freq, time }) => {
        const noteTime = ctx.currentTime + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.15, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.55);
      });
    } catch (_) {}
  }

  // End Call sound
  playEndSound() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const notes = [
        { freq: 659.25, time: 0 },
        { freq: 523.25, time: 0.2 },
      ];
      notes.forEach(({ freq, time }) => {
        const noteTime = ctx.currentTime + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.12, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.45);
      });
    } catch (_) {}
  }

  stopAll() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

export const ringtone = typeof window !== "undefined" ? new SoundSynthesizer() : ({} as any);
