/**
 * Browser Audio Alert System for Baadh Bol:
 * Synthesizes high-intensity audible emergency warning tones using Web Audio API (AudioContext).
 * Complies with browser autoplay policies via explicit user activation.
 * Includes a broadcast-grade Dynamic Compressor and dual-oscillator EAS siren for maximum loudness and penetration.
 * Deduplicates played alerts across polling intervals and page refreshes.
 * Handles playback errors gracefully without interrupting the dashboard.
 */

export type VolumeMode = 'loud' | 'standard';

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = false;
  private volumeMode: VolumeMode = 'loud';
  private playedAlertIds: Set<string> = new Set();
  private readonly STORAGE_PLAYED_KEY = 'baadhbol_played_alert_ids';
  private readonly STORAGE_ENABLED_KEY = 'baadhbol_sound_enabled';
  private readonly STORAGE_VOLUME_KEY = 'baadhbol_volume_mode';

  constructor() {
    // Restore sound preferences from localStorage
    try {
      const storedEnabled = localStorage.getItem(this.STORAGE_ENABLED_KEY);
      this.soundEnabled = storedEnabled === 'true';

      const storedVolume = localStorage.getItem(this.STORAGE_VOLUME_KEY) as VolumeMode | null;
      if (storedVolume === 'loud' || storedVolume === 'standard') {
        this.volumeMode = storedVolume;
      } else {
        this.volumeMode = 'loud'; // Default to loud for critical flood warnings
      }

      const storedIds = localStorage.getItem(this.STORAGE_PLAYED_KEY);
      if (storedIds) {
        const parsed = JSON.parse(storedIds);
        if (Array.isArray(parsed)) {
          this.playedAlertIds = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('[SoundManager] Could not restore audio preferences:', e);
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): boolean {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem(this.STORAGE_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (e) {}

    if (enabled) {
      this.initAudioContext();
    }
    return this.soundEnabled;
  }

  public toggleSound(): boolean {
    return this.setSoundEnabled(!this.soundEnabled);
  }

  public getVolumeMode(): VolumeMode {
    return this.volumeMode;
  }

  public setVolumeMode(mode: VolumeMode): VolumeMode {
    this.volumeMode = mode;
    try {
      localStorage.setItem(this.STORAGE_VOLUME_KEY, mode);
    } catch (e) {}
    return this.volumeMode;
  }

  public toggleVolumeMode(): VolumeMode {
    const next = this.volumeMode === 'loud' ? 'standard' : 'loud';
    return this.setVolumeMode(next);
  }

  /**
   * Initializes or resumes AudioContext following user gesture.
   */
  private initAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('[SoundManager] AudioContext initialization failed:', e);
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes a LOUD, high-penetration disaster alarm siren:
   * - Uses a multi-band Dynamics Compressor to maximize acoustic loudness (RMS) without digital clipping.
   * - Dual penetrating oscillators: Sawtooth (960 Hz) + Square (853.3 Hz) EAS warning tone combination.
   * - Three-burst high-urgency cadence: 2 rapid piercing alert blasts followed by a commanding siren warble.
   * - Master gain set to 0.95 for maximum clean headroom.
   */
  public playLoudEmergencySiren(): boolean {
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return false;

      const now = ctx.currentTime;

      // 1. Dynamics Compressor to maximize perceived loudness & acoustic punch
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, now);
      compressor.knee.setValueAtTime(32, now);
      compressor.ratio.setValueAtTime(14, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.12, now);

      // 2. Master Gain (Maximum clean headroom)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.95, now);

      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      // 3. Dual-tone Emergency Warning Synthesizer (Sawtooth + Square waves for maximum acoustic presence)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const sirenGain = ctx.createGain();

      osc1.type = 'sawtooth'; // Rich in all harmonics, sharp & commanding
      osc2.type = 'square';   // High acoustic presence, emergency alert standard

      // Frequency Envelopes:
      // Pulse 1: 0.00s to 0.20s (Urgent High-Penetration Blast 960Hz + 853Hz)
      osc1.frequency.setValueAtTime(960, now);
      osc2.frequency.setValueAtTime(853.3, now);

      // Pulse 2: 0.26s to 0.46s (Urgent High-Penetration Blast 960Hz + 853Hz)
      osc1.frequency.setValueAtTime(960, now + 0.26);
      osc2.frequency.setValueAtTime(853.3, now + 0.26);

      // Pulse 3: 0.52s to 1.30s (Urgent Siren Warble Sweep 960Hz <-> 1440Hz)
      osc1.frequency.setValueAtTime(960, now + 0.52);
      osc1.frequency.linearRampToValueAtTime(1440, now + 0.85);
      osc1.frequency.linearRampToValueAtTime(880, now + 1.22);

      osc2.frequency.setValueAtTime(853.3, now + 0.52);
      osc2.frequency.linearRampToValueAtTime(1280, now + 0.85);
      osc2.frequency.linearRampToValueAtTime(750, now + 1.22);

      // Amplitude Envelope for 3 distinct, sharp emergency siren pulses
      sirenGain.gain.setValueAtTime(0, now);

      // Pulse 1 Blast
      sirenGain.gain.linearRampToValueAtTime(0.90, now + 0.015);
      sirenGain.gain.setValueAtTime(0.90, now + 0.19);
      sirenGain.gain.linearRampToValueAtTime(0.001, now + 0.21);

      // Pulse 2 Blast
      sirenGain.gain.setValueAtTime(0.001, now + 0.25);
      sirenGain.gain.linearRampToValueAtTime(0.90, now + 0.27);
      sirenGain.gain.setValueAtTime(0.90, now + 0.45);
      sirenGain.gain.linearRampToValueAtTime(0.001, now + 0.47);

      // Pulse 3 Siren Warble
      sirenGain.gain.setValueAtTime(0.001, now + 0.51);
      sirenGain.gain.linearRampToValueAtTime(0.95, now + 0.54);
      sirenGain.gain.setValueAtTime(0.95, now + 1.18);
      sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 1.32);

      osc1.connect(sirenGain);
      osc2.connect(sirenGain);
      sirenGain.connect(compressor);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.35);
      osc2.stop(now + 1.35);

      return true;
    } catch (err) {
      console.warn('[SoundManager] Loud audio playback error handled gracefully:', err);
      return false;
    }
  }

  /**
   * Synthesizes a standard moderate emergency chime (Tone 1: 880 Hz, Tone 2: 587 Hz)
   */
  public playStandardChime(): boolean {
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return false;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.25);
      osc1.frequency.setValueAtTime(880, now + 0.35);
      osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.6);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.40, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.75);
      return true;
    } catch (err) {
      console.warn('[SoundManager] Standard chime error handled gracefully:', err);
      return false;
    }
  }

  /**
   * Plays alarm tone according to configured volume mode (defaults to loud).
   */
  public playAlarmTone(forceLoud?: boolean): boolean {
    const shouldPlayLoud = forceLoud !== undefined ? forceLoud : (this.volumeMode === 'loud');
    if (shouldPlayLoud) {
      return this.playLoudEmergencySiren();
    } else {
      return this.playStandardChime();
    }
  }

  /**
   * Test Sound: Forces playback of the loud alarm and arms the sound context.
   */
  public testSound(forceLoud: boolean = true): boolean {
    this.setSoundEnabled(true);
    return this.playAlarmTone(forceLoud);
  }

  /**
   * Evaluates incoming alerts during polling:
   * Only triggers the audible tone if there is a GENUINELY NEW critical/red alert
   * that has NOT been played before. Never plays repeatedly for the same alert.
   */
  public handleIncomingAlerts(alerts: any[]): { triggered: boolean; alertId?: string; headline?: string } {
    let triggered = false;
    let newAlertId: string | undefined = undefined;
    let headline: string | undefined = undefined;

    for (const a of alerts) {
      const id = a.alertId || a.sourceKey;
      if (!id) continue;

      const isCritical = a.level === 'red' || a.severity === 'Extreme' || a.isDemo;

      if (isCritical && !this.playedAlertIds.has(id)) {
        // Mark as played immediately
        this.playedAlertIds.add(id);
        this.persistPlayedIds();

        if (this.soundEnabled) {
          this.playAlarmTone();
          triggered = true;
          newAlertId = id;
          headline = a.headline || a.scriptText || 'Critical Flood Alert';
        }
        break; // Play at most once per sync batch
      }
    }

    return { triggered, alertId: newAlertId, headline };
  }

  private persistPlayedIds() {
    try {
      // Keep at most 200 latest played IDs in localStorage
      const array = Array.from(this.playedAlertIds).slice(-200);
      localStorage.setItem(this.STORAGE_PLAYED_KEY, JSON.stringify(array));
    } catch (e) {}
  }

  public clearPlayedHistory() {
    this.playedAlertIds.clear();
    try {
      localStorage.removeItem(this.STORAGE_PLAYED_KEY);
    } catch (e) {}
  }
}

export const SoundManager = new SoundAlertManager();
