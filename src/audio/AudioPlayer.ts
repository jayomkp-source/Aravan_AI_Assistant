/**
 * AudioPlayer - High-Fidelity 24kHz PCM Audio Stream Player for Gemini Live & Charon TTS
 *
 * STRICT COMPLIANCE:
 * - Dedicated ONLY to playing Gemini Charon 24kHz PCM/WAV audio chunks.
 * - Zero fallback audio, zero browser SpeechSynthesis, zero external TTS.
 * - Serialized chunk scheduling using Web Audio API clock for gapless ordered playback.
 * - Instant barge-in / interruption handling (immediate queue purge and node cancellation).
 */

import { AudioReactiveCore } from './AudioReactiveCore';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private activeSourceNodes: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime = 0;
  private isPlaying = false;
  private onPlaybackStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onVolumeChangeCallback: ((volume: number) => void) | null = null;
  private onErrorCallback: ((error: string | null) => void) | null = null;
  private animationFrameId: number | null = null;
  private scheduleChain: Promise<void> = Promise.resolve();
  private generationId = 0;
  private lastError: string | null = null;

  constructor() {}

  /**
   * Initializes the 24kHz Web Audio context (or resumes safely if suspended).
   */
  async initialize(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.audioContext = new AudioCtx({ sampleRate: 24000 });
      } catch {
        this.audioContext = new AudioCtx();
      }

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.35;
      this.analyserNode.connect(this.audioContext.destination);

      AudioReactiveCore.getInstance().registerExternalAnalyser(
        this.analyserNode,
        () => this.isPlaying
      );

      this.startVolumeMonitoring();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await Promise.race([
          this.audioContext.resume(),
          new Promise<void>((resolve) => setTimeout(resolve, 250)),
        ]);
      } catch (err: any) {
        this.recordError(err?.message || 'AudioContext resume blocked by browser autoplay policy');
      }
    }
  }

  private recordError(err: string | null): void {
    this.lastError = err;
    AudioReactiveCore.getInstance().setLastAudioError(err);
    this.onErrorCallback?.(err);
  }

  setCallbacks(
    onPlaybackStateChange: (isPlaying: boolean) => void,
    onVolumeChange?: (volume: number) => void,
    onError?: (error: string | null) => void
  ): void {
    this.onPlaybackStateChangeCallback = onPlaybackStateChange;
    this.onVolumeChangeCallback = onVolumeChange || null;
    this.onErrorCallback = onError || null;
  }

  /**
   * Enqueues and plays a 24kHz 16-bit PCM (or RIFF WAV) base64 chunk in strict arrival order.
   */
  playPCMChunk(base64Data: string): Promise<void> {
    if (!base64Data) return Promise.resolve();
    const myGen = this.generationId;

    this.scheduleChain = this.scheduleChain
      .then(() => this.schedulePCMChunkInternal(base64Data, myGen))
      .catch((err) => {
        console.error('[ARAVAN AudioPlayer] Queue chunk error:', err);
      });

    return this.scheduleChain;
  }

  private async schedulePCMChunkInternal(base64Data: string, expectedGen: number): Promise<void> {
    if (expectedGen !== this.generationId) return;

    await this.initialize();
    if (expectedGen !== this.generationId) return;
    if (!this.audioContext || !this.analyserNode) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      if (len === 0) return;

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Extract raw 24kHz PCM payload if wrapped in RIFF WAV container (e.g. unary Charon TTS)
      let pcmBytes = bytes;
      if (
        bytes.length > 44 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46
      ) {
        let dataIndex = -1;
        for (let i = 12; i < Math.min(bytes.length - 8, 128); i++) {
          if (
            bytes[i] === 0x64 &&
            bytes[i + 1] === 0x61 &&
            bytes[i + 2] === 0x74 &&
            bytes[i + 3] === 0x61
          ) {
            dataIndex = i;
            break;
          }
        }
        pcmBytes = dataIndex !== -1 ? bytes.subarray(dataIndex + 8) : bytes.subarray(44);
      }

      const sampleCount = Math.floor(pcmBytes.length / 2);
      if (sampleCount === 0) return;

      const dataView = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, sampleCount * 2);
      const float32Array = new Float32Array(sampleCount);

      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, sampleCount, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      if (expectedGen !== this.generationId) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyserNode);

      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime + 0.005) {
        this.nextStartTime = currentTime + 0.025;
      }

      const startTime = this.nextStartTime;
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSourceNodes.add(source);
      this.setPlayingState(true);
      AudioReactiveCore.getInstance().setSpeakingState(true);
      this.recordError(null);

      source.onended = () => {
        this.activeSourceNodes.delete(source);
        if (this.activeSourceNodes.size === 0) {
          this.setPlayingState(false);
          this.nextStartTime = 0;
          AudioReactiveCore.getInstance().setSpeakingState(false);
        }
      };
    } catch (err: any) {
      const msg = err?.message || 'Error decoding/scheduling PCM chunk';
      console.error('[ARAVAN AudioPlayer]', msg);
      this.recordError(msg);
    }
  }

  /**
   * Returns a Promise that resolves once all currently queued audio finishes playing
   * or is interrupted.
   */
  waitForDrain(): Promise<void> {
    if (!this.isPlaying && this.activeSourceNodes.size === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const check = () => {
        if (!this.isPlaying && this.activeSourceNodes.size === 0) {
          resolve();
        } else {
          setTimeout(check, 60);
        }
      };
      setTimeout(check, 60);
    });
  }

  /**
   * BARGE-IN / INTERRUPTION:
   * Instantly stops all playing audio, invalidates queued chunks, and resets timeline.
   */
  interrupt(): void {
    this.generationId++;
    for (const source of this.activeSourceNodes) {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch {
        // Node may have already stopped
      }
    }
    this.activeSourceNodes.clear();
    this.nextStartTime = 0;
    this.setPlayingState(false);
    AudioReactiveCore.getInstance().setSpeakingState(false);
  }

  private startVolumeMonitoring(): void {
    if (!this.analyserNode) return;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVolume = () => {
      if (this.analyserNode) {
        if (this.isPlaying) {
          this.analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalized = Math.min(1, average / 110);
          this.onVolumeChangeCallback?.(normalized);
        } else {
          this.onVolumeChangeCallback?.(0);
        }
      }
      this.animationFrameId = requestAnimationFrame(updateVolume);
    };

    this.animationFrameId = requestAnimationFrame(updateVolume);
  }

  private setPlayingState(playing: boolean): void {
    if (this.isPlaying !== playing) {
      this.isPlaying = playing;
      this.onPlaybackStateChangeCallback?.(playing);
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  get currentlyPlaying(): boolean {
    return this.isPlaying;
  }

  get state(): string {
    return this.audioContext ? this.audioContext.state : 'uninitialized';
  }

  get queueLength(): number {
    return this.activeSourceNodes.size;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  stop(): void {
    this.interrupt();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    AudioReactiveCore.getInstance().registerExternalAnalyser(null);

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.onPlaybackStateChangeCallback = null;
    this.onVolumeChangeCallback = null;
    this.onErrorCallback = null;
  }
}
