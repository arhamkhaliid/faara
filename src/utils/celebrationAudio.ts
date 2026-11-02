/**
 * FAARA.EXE — Grand Birthday Celebration Audio Engine
 * Synthesizes a joyful, recognizable "Happy Birthday" melody (music box / celesta)
 * harmonized with warm chords and an ambient celebratory applause/cheering layer.
 * Browser-safe, zero external dependencies, strictly triggered by user interaction.
 */

class CelebrationAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private activeOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private cleanupTimeout: number | null = null;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
  }

  public stop() {
    if (this.cleanupTimeout) {
      window.clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Safe disconnect
      }
    });
    this.activeOscillators = [];
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch {
        // Safe close
      }
      this.ctx = null;
    }
    this.masterGain = null;
  }

  public playCelebration(isMutedInitial: boolean = false) {
    this.stop();
    this.isMuted = isMutedInitial;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.setValueAtTime(this.isMuted ? 0 : 0.75, ctx.currentTime);
      master.connect(ctx.destination);
      this.masterGain = master;

      const startTime = ctx.currentTime + 0.05;

      // -----------------------------------------------------------
      // 1. Synthesize Warm Cheering & Applause Soundscape
      // -----------------------------------------------------------
      this.playApplauseLayer(ctx, master, startTime, 10.5);

      // -----------------------------------------------------------
      // 2. Synthesize Joyful "Happy Birthday" Celesta Melody
      // -----------------------------------------------------------
      this.playHappyBirthdayMelody(ctx, master, startTime);

      // Auto-cleanup after 11.5 seconds
      this.cleanupTimeout = window.setTimeout(() => {
        this.stop();
      }, 11500);
    } catch {
      // Audio playback is optional and fail-safe
    }
  }

  /**
   * Warm crowd cheering & applause synthesized via filtered noise
   */
  private playApplauseLayer(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    duration: number
  ) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate gentle pink/brownian noise with randomized clapping peaks
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;

      // Add soft random individual claps
      if (Math.random() < 0.0035) {
        data[i] += (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.25);
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter noise to sound like warm acoustic clapping/cheers (avoid harsh hiss)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1150, startTime);
    bandpass.Q.setValueAtTime(1.1, startTime);

    const applauseGain = ctx.createGain();
    applauseGain.gain.setValueAtTime(0, startTime);
    // Swell quickly on cut
    applauseGain.gain.linearRampToValueAtTime(0.22, startTime + 0.6);
    // Sustain comfortably through first two phrases
    applauseGain.gain.setValueAtTime(0.24, startTime + 3.0);
    // Swell enthusiastically during "Happy Birthday Dear Faara"
    applauseGain.gain.linearRampToValueAtTime(0.35, startTime + 5.5);
    // Peak at finale
    applauseGain.gain.linearRampToValueAtTime(0.40, startTime + 8.0);
    // Natural smooth fade out over 2.5 seconds
    applauseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(applauseGain);
    applauseGain.connect(destination);

    noiseSource.start(startTime);
    noiseSource.stop(startTime + duration);
    this.activeOscillators.push(noiseSource);
  }

  /**
   * Joyful Celesta/Music Box "Happy Birthday" Melody & Harmonies
   */
  private playHappyBirthdayMelody(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number
  ) {
    const beat = 0.42; // Tempo ~142 BPM, cheerful and uplifting

    // Notes: pitch (Hz), startBeat, duration (beats)
    const melody: [number, number, number][] = [
      // Phrase 1: "Happy Birthday to you"
      [392.00, 0.0, 0.75],   // G4 "Hap-"
      [392.00, 0.75, 0.25],  // G4 "-py"
      [440.00, 1.0, 1.0],    // A4 "Birth-"
      [392.00, 2.0, 1.0],    // G4 "-day"
      [523.25, 3.0, 1.0],    // C5 "to"
      [493.88, 4.0, 2.0],    // B4 "you"

      // Phrase 2: "Happy Birthday to you"
      [392.00, 6.0, 0.75],   // G4 "Hap-"
      [392.00, 6.75, 0.25],  // G4 "-py"
      [440.00, 7.0, 1.0],    // A4 "Birth-"
      [392.00, 8.0, 1.0],    // G4 "-day"
      [587.33, 9.0, 1.0],    // D5 "to"
      [523.25, 10.0, 2.0],   // C5 "you"

      // Phrase 3: "Happy Birthday Dear Faa-ra"
      [392.00, 12.0, 0.75],  // G4 "Hap-"
      [392.00, 12.75, 0.25], // G4 "-py"
      [783.99, 13.0, 1.0],   // G5 "Birth-"
      [659.25, 14.0, 1.0],   // E5 "-day"
      [523.25, 15.0, 1.0],   // C5 "Dear"
      [493.88, 16.0, 1.0],   // B4 "Faa-"
      [440.00, 17.0, 2.0],   // A4 "-ra"

      // Phrase 4: "Happy Birthday to you!"
      [698.46, 19.0, 0.75],  // F5 "Hap-"
      [698.46, 19.75, 0.25], // F5 "-py"
      [659.25, 20.0, 1.0],   // E5 "Birth-"
      [523.25, 21.0, 1.0],   // C5 "-day"
      [587.33, 22.0, 1.0],   // D5 "to"
      [523.25, 23.0, 3.0],   // C5 "you!"
    ];

    // Chords: [bassFreq, harmonyFreq1, harmonyFreq2], startBeat, durationBeats
    const chords: [[number, number, number], number, number][] = [
      [[130.81, 261.63, 329.63], 0.0, 5.8],   // C major
      [[146.83, 246.94, 293.66], 6.0, 5.8],   // G7
      [[130.81, 261.63, 329.63], 12.0, 4.0],  // C major
      [[174.61, 261.63, 349.23], 16.0, 2.8],  // F major
      [[130.81, 261.63, 329.63], 19.0, 3.8],  // C major
      [[130.81, 261.63, 392.00], 23.0, 3.5],  // C major final resolving chime
    ];

    // Play melody notes with rich bell/celesta timbre
    melody.forEach(([freq, beatOffset, noteBeats]) => {
      const noteStart = startTime + beatOffset * beat;
      const noteDuration = noteBeats * beat;
      this.playCelestaNote(ctx, destination, freq, noteStart, noteDuration, 0.32);
    });

    // Play backing chords
    chords.forEach(([notes, beatOffset, chordBeats]) => {
      const chordStart = startTime + beatOffset * beat;
      const chordDuration = chordBeats * beat;
      notes.forEach((freq, idx) => {
        this.playChordNote(
          ctx,
          destination,
          freq,
          chordStart,
          chordDuration,
          idx === 0 ? 0.16 : 0.08
        );
      });
    });
  }

  /**
   * Celesta / Music Box chime note
   */
  private playCelestaNote(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    start: number,
    duration: number,
    volume: number
  ) {
    // Fundamental (triangle wave for body warmth)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, start);

    // Octave overtone (sine wave for crystal bell clarity)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, start);

    // Celesta envelope: crisp 6ms attack, singing bell ring decay
    const decayDuration = Math.max(duration * 1.4, 0.85);
    gain1.gain.setValueAtTime(0, start);
    gain1.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.001, start + decayDuration);

    gain2.gain.setValueAtTime(0, start);
    gain2.gain.linearRampToValueAtTime(volume * 0.45, start + 0.006);
    gain2.gain.exponentialRampToValueAtTime(0.001, start + decayDuration * 0.7);

    osc1.connect(gain1);
    gain1.connect(destination);

    osc2.connect(gain2);
    gain2.connect(destination);

    osc1.start(start);
    osc1.stop(start + decayDuration);
    osc2.start(start);
    osc2.stop(start + decayDuration);

    this.activeOscillators.push(osc1, osc2);
  }

  /**
   * Warm acoustic chord note
   */
  private playChordNote(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    start: number,
    duration: number,
    volume: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(start);
    osc.stop(start + duration);
    this.activeOscillators.push(osc);
  }
}

export const celebrationAudio = new CelebrationAudioEngine();
