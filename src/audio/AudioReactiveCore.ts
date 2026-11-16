/**
 * AudioReactiveCore - Unified Web Audio Analyser & Charon Playback Reactivity Engine
 *
 * Strictly forbids browser window.speechSynthesis or fallback OS voices.
 * Drives real-time frequency analysis for 3D holographic skull jaw movement,
 * cranium vertex scaling, neural brain pulsation, and HUD telemetry graphs
 * from the active 24kHz Gemini Live / Charon AudioPlayer AnalyserNode.
 */

export type CharonSpeechHandler = (
  text: string,
  onStart?: () => void,
  onEnd?: () => void
) => Promise<void>;

export class AudioReactiveCore {
  private static instance: AudioReactiveCore | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private externalAnalyserNode: AnalyserNode | null = null;
  private externalIsPlayingFn: (() => boolean) | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyBinCount = 128;
  private isSpeaking = false;
  private charonSpeechHandler: CharonSpeechHandler | null = null;
  private onSpeechInterruptHandler: (() => void) | null = null;
  private lastAudioError: string | null = null;

  private constructor() {}

  public static getInstance(): AudioReactiveCore {
    if (!AudioReactiveCore.instance) {
      AudioReactiveCore.instance = new AudioReactiveCore();
    }
    return AudioReactiveCore.instance;
  }

  /**
   * Register the active 24kHz Gemini AudioPlayer AnalyserNode so 3D skull reactivity
   * reads real PCM audio output frequencies directly without creating extra contexts.
   */
  public registerExternalAnalyser(
    analyser: AnalyserNode | null,
    isPlayingFn?: () => boolean
  ): void {
    this.externalAnalyserNode = analyser;
    this.externalIsPlayingFn = isPlayingFn || null;
    if (analyser) {
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
  }

  /**
   * Register the strict Charon /api/tts speech playback handler (used by Screen Vision / Test Speech).
   */
  public registerCharonSpeechHandler(
    handler: CharonSpeechHandler | null,
    interruptHandler?: () => void
  ): void {
    this.charonSpeechHandler = handler;
    this.onSpeechInterruptHandler = interruptHandler || null;
  }

  public init(): AudioContext | null {
    if (this.externalAnalyserNode) {
      return this.audioContext;
    }
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.audioContext = new AudioCtx();
      } catch (e) {
        console.warn('[AudioReactiveCore] Web Audio context error:', e);
        return null;
      }

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.frequencyBinCount * 2;
      this.analyserNode.smoothingTimeConstant = 0.45;
      this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getAnalyserNode(): AnalyserNode | null {
    if (this.externalAnalyserNode) {
      return this.externalAnalyserNode;
    }
    if (!this.analyserNode) {
      this.init();
    }
    return this.analyserNode;
  }

  public linkSource(sourceNode: AudioNode): void {
    const analyser = this.getAnalyserNode();
    if (analyser && sourceNode && analyser.context === sourceNode.context) {
      try {
        sourceNode.connect(analyser);
      } catch (err) {
        console.warn('[AudioReactiveCore] Failed to link audio source:', err);
      }
    }
  }

  /**
   * Reads real frequency spectrum data from the active Gemini AudioPlayer analyser.
   */
  public getFrequencyData(targetArray?: Uint8Array): Uint8Array {
    const analyser = this.externalAnalyserNode || this.analyserNode;
    const playing = this.getIsSpeaking();

    if (!analyser) {
      const out = targetArray || this.dataArray || new Uint8Array(this.frequencyBinCount);
      out.fill(0);
      return out;
    }

    if (!this.dataArray || this.dataArray.length !== analyser.frequencyBinCount) {
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    }

    if (targetArray && targetArray.length === analyser.frequencyBinCount) {
      if (playing) {
        analyser.getByteFrequencyData(targetArray);
      } else {
        targetArray.fill(0);
      }
      return targetArray;
    }

    if (playing) {
      analyser.getByteFrequencyData(this.dataArray);
    } else {
      this.dataArray.fill(0);
    }

    if (targetArray) {
      const len = Math.min(targetArray.length, this.dataArray.length);
      if (playing) {
        for (let i = 0; i < len; i++) {
          targetArray[i] = this.dataArray[i];
        }
        if (targetArray.length > len) {
          targetArray.fill(0, len);
        }
      } else {
        targetArray.fill(0);
      }
      return targetArray;
    }

    return this.dataArray;
  }

  /**
   * Returns normalized average audio volume [0.0 ... 1.0]
   */
  public getAverageVolume(): number {
    if (!this.getIsSpeaking()) return 0;
    const freq = this.getFrequencyData();
    if (!freq || freq.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < freq.length; i++) {
      sum += freq[i];
    }
    return Math.min(1, sum / (freq.length * 160));
  }

  public getBandEnergies(): { bass: number; mid: number; treble: number } {
    if (!this.getIsSpeaking()) {
      return { bass: 0, mid: 0, treble: 0 };
    }
    const freq = this.getFrequencyData();
    const len = freq.length;
    if (len === 0) {
      return { bass: 0, mid: 0, treble: 0 };
    }

    const bassEnd = Math.max(1, Math.floor(len * 0.2));
    const midEnd = Math.max(bassEnd + 1, Math.floor(len * 0.6));

    let bSum = 0;
    let mSum = 0;
    let tSum = 0;
    for (let i = 0; i < bassEnd; i++) bSum += freq[i];
    for (let i = bassEnd; i < midEnd; i++) mSum += freq[i];
    for (let i = midEnd; i < len; i++) tSum += freq[i];

    return {
      bass: Math.min(1, (bSum / (bassEnd * 255)) * 1.4),
      mid: Math.min(1, (mSum / ((midEnd - bassEnd) * 255)) * 1.5),
      treble: Math.min(1, (tSum / ((len - midEnd) * 255)) * 1.6),
    };
  }

  public setSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking || Boolean(this.externalIsPlayingFn?.());
  }

  public setLastAudioError(err: string | null): void {
    this.lastAudioError = err;
  }

  public getLastAudioError(): string | null {
    return this.lastAudioError;
  }

  /**
   * Speaks text strictly through Gemini Charon TTS (/api/tts) + AudioPlayer.
   * NEVER falls back to browser window.speechSynthesis.
   */
  public async speakText(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!text?.trim()) {
      onEnd?.();
      return;
    }

    if (this.charonSpeechHandler) {
      await this.charonSpeechHandler(text, onStart, onEnd);
      return;
    }

    const msg = 'Charon speech playback handler is not initialized.';
    this.lastAudioError = msg;
    console.warn('[AudioReactiveCore]', msg);
    onEnd?.();
  }

  public stopSpeaking(): void {
    this.onSpeechInterruptHandler?.();
    this.isSpeaking = false;
  }
}
