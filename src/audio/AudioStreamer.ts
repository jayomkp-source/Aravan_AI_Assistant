/**
 * AudioStreamer - Low-latency Microphone Capture & PCM16 16kHz Encoder
 * 
 * Captures microphone input, downsamples/encodes to 16-bit PCM mono at 16kHz,
 * calculates real-time input amplitude, and streams base64 chunks to Gemini Live.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private onAudioChunkCallback: ((base64Pcm: string) => void) | null = null;
  private onVolumeChangeCallback: ((volume: number) => void) | null = null;
  private isStreaming = false;
  private isMuted = false;
  private animationFrameId: number | null = null;

  constructor() {}

  /**
   * Start microphone capture and 16kHz PCM streaming
   */
  async start(
    onAudioChunk: (base64Pcm: string) => void,
    onVolumeChange?: (volume: number) => void
  ): Promise<void> {
    if (this.isStreaming) return;

    this.onAudioChunkCallback = onAudioChunk;
    this.onVolumeChangeCallback = onVolumeChange || null;

    try {
      // Request microphone stream with clean voice processing
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      // Initialize AudioContext (support hardware sample rates with software downsampling)
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.audioContext = new AudioCtx({ sampleRate: 16000 });
      } catch {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create Analyser for input level visualization
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.4;
      this.sourceNode.connect(this.analyserNode);

      // Create ScriptProcessor for raw PCM extraction (bufferSize 2048 for low latency)
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isStreaming || this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const actualSampleRate = e.inputBuffer.sampleRate;

        // Downsample to 16kHz if the browser AudioContext is running at 44.1kHz or 48kHz
        const pcm16Data = this.resampleTo16k(inputChannelData, actualSampleRate);
        const pcm16Base64 = this.floatTo16BitPCMBase64(pcm16Data);

        if (this.onAudioChunkCallback && pcm16Base64) {
          this.onAudioChunkCallback(pcm16Base64);
        }
      };

      // Connect source to processor
      this.sourceNode.connect(this.processorNode);

      // CRITICAL: Route processorNode through a silent GainNode (gain = 0)
      // Chromium requires the node to connect to destination to keep processing,
      // but a silent gain node prevents microphone feedback loop through speakers!
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.processorNode.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.isStreaming = true;
      this.startVolumeMonitoring();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  /**
   * Monitor volume/RMS for UI waveforms and Orb pulsation
   */
  private startVolumeMonitoring(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVolume = () => {
      if (!this.isStreaming || !this.analyserNode) return;

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

      this.animationFrameId = requestAnimationFrame(updateVolume);
    };

    this.animationFrameId = requestAnimationFrame(updateVolume);
  }

  /**
   * Resample Float32 audio to 16kHz
   */
  private resampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
    if (!inputSampleRate || inputSampleRate === 16000) {
      return input;
    }
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetInput = 0;

    while (offsetResult < result.length) {
      const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
        accum += input[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : input[offsetInput] || 0;
      offsetResult++;
      offsetInput = nextOffsetInput;
    }
    return result;
  }

  /**
   * Convert Float32Array to 16-bit PCM little-endian Base64
   */
  private floatTo16BitPCMBase64(input: Float32Array): string {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < input.length; i++) {
      // Clamp float sample between -1 and 1
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to signed 16-bit integer
      const pcm16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(i * 2, pcm16, true); // true for little-endian
    }

    // Convert ArrayBuffer to binary string and base64 encode using fast chunks
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 2048;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  /**
   * Stop microphone capture and cleanup audio nodes
   */
  stop(): void {
    this.isStreaming = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.onAudioChunkCallback = null;
    this.onVolumeChangeCallback = null;
  }

  get active(): boolean {
    return this.isStreaming && !this.isMuted;
  }

  get isStreamingActive(): boolean {
    return this.isStreaming;
  }

  get streaming(): boolean {
    return this.isStreaming;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}
