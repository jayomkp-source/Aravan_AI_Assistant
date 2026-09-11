/**
 * AudioPlayer - High-Fidelity 24kHz PCM Audio Stream Player for Gemini Live
 * 
 * STRICT COMPLIANCE:
 * - Dedicated ONLY to playing Gemini Live 24kHz PCM audio chunks.
 * - Zero fallback audio, zero browser SpeechSynthesis, zero external TTS.
 * - Gapless playback scheduling using Web Audio API clock.
 * - Instant barge-in / interruption handling (immediate queue purge and node cancellation).
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private activeSourceNodes: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime = 0;
  private isPlaying = false;
  private onPlaybackStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onVolumeChangeCallback: ((volume: number) => void) | null = null;
  private animationFrameId: number | null = null;

  constructor() {}

  /**
   * Initializes the 24kHz Web Audio context upon user interaction.
   */
  async initialize(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // Prefer 24kHz for direct 1:1 Gemini Live PCM rate, fallback to system rate with native resampling
      try {
        this.audioContext = new AudioCtx({ sampleRate: 24000 });
      } catch {
        this.audioContext = new AudioCtx();
      }

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;
      this.analyserNode.connect(this.audioContext.destination);

      this.startVolumeMonitoring();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Registers event callbacks for playback status and real-time volume
   */
  setCallbacks(
    onPlaybackStateChange: (isPlaying: boolean) => void,
    onVolumeChange?: (volume: number) => void
  ): void {
    this.onPlaybackStateChangeCallback = onPlaybackStateChange;
    this.onVolumeChangeCallback = onVolumeChange || null;
  }

  /**
   * Plays a 24kHz 16-bit PCM base64-encoded chunk from Gemini Live
   */
  async playPCMChunk(base64Data: string): Promise<void> {
    if (!base64Data) return;

    await this.initialize();
    if (!this.audioContext || !this.analyserNode) return;

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const sampleCount = Math.floor(len / 2);
      if (sampleCount === 0) return;

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Safe DataView Little-Endian decoding (immune to alignment or odd-length issues)
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
      const float32Array = new Float32Array(sampleCount);

      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
      }

      // Create single-channel 24kHz audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        1,
        sampleCount,
        24000
      );
      audioBuffer.copyToChannel(float32Array, 0);

      // Create audio buffer source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyserNode);

      const currentTime = this.audioContext.currentTime;

      // Schedule gapless playback:
      // If nextStartTime is behind currentTime, catch up to currentTime + small jitter buffer (20ms)
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.02;
      }

      const startTime = this.nextStartTime;
      source.start(startTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSourceNodes.add(source);
      this.setPlayingState(true);

      source.onended = () => {
        this.activeSourceNodes.delete(source);
        if (this.activeSourceNodes.size === 0) {
          this.setPlayingState(false);
          this.nextStartTime = 0;
        }
      };
    } catch (err) {
      console.error('[ARAVAN AudioPlayer] Error decoding/scheduling PCM chunk:', err);
    }
  }

  /**
   * BARGE-IN / INTERRUPTION:
   * Instantly stops all playing audio, cancels all queued buffers, and resets timeline.
   */
  interrupt(): void {
    for (const source of this.activeSourceNodes) {
      try {
        source.stop(0);
        source.disconnect();
      } catch {
        // Node may have already stopped
      }
    }
    this.activeSourceNodes.clear();
    this.nextStartTime = 0;
    this.setPlayingState(false);
  }

  /**
   * Continuous volume monitoring for output speaker visualization
   */
  private startVolumeMonitoring(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVolume = () => {
      if (this.analyserNode) {
        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(1, average / 128);

        if (this.onVolumeChangeCallback) {
          this.onVolumeChangeCallback(normalized);
        }
      }
      this.animationFrameId = requestAnimationFrame(updateVolume);
    };

    this.animationFrameId = requestAnimationFrame(updateVolume);
  }

  private setPlayingState(playing: boolean): void {
    if (this.isPlaying !== playing) {
      this.isPlaying = playing;
      if (this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(playing);
      }
    }
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

  /**
   * Teardown AudioPlayer
   */
  stop(): void {
    this.interrupt();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

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
  }
}
