/**
 * ScreenVisionManager.ts - ARAVAN Vision & Display Media Pipeline
 *
 * Strict Compliance:
 * - OFF by default.
 * - Browser native navigator.mediaDevices.getDisplayMedia().
 * - Never bypasses permissions or captures screen without user consent.
 * - track.stop() called immediately upon STOP SHARING; track.onended handled.
 * - Efficient frame sampling (1-2 FPS max, change detection, compressed JPEG).
 * - No Gemini flooding.
 */

import { ScreenShareState, ScreenAnalysisMode, ScreenAnalysisResult } from '../types';
import { StateManager } from '../state/StateManager';
import { AudioReactiveCore } from '../audio/AudioReactiveCore';
import { MemoryManager } from '../memory/MemoryManager';

export type VisionStateListener = (state: ScreenShareState, stream: MediaStream | null) => void;
export type VisionAnalysisListener = (result: ScreenAnalysisResult) => void;

export class ScreenVisionManager {
  private static instance: ScreenVisionManager;

  private state: ScreenShareState = 'SCREEN_OFF';
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private captureCanvas: HTMLCanvasElement | null = null;
  private lastError: string | null = null;

  // Analysis settings
  private currentMode: ScreenAnalysisMode = 'auto';
  private isAnalyzing = false;
  private samplingIntervalId: number | null = null;

  // Change detection cache (32x32 thumbnail pixel buffer)
  private prevFrameData: Uint8ClampedArray | null = null;
  private lastCapturedBase64: string | null = null;
  private lastAnalysisTime = 0;

  private stateListeners: Set<VisionStateListener> = new Set();
  private analysisListeners: Set<VisionAnalysisListener> = new Set();
  private errorListeners: Set<(err: string | null) => void> = new Set();

  private constructor() {
    // Setup offscreen canvas for resizing/compressing frames
    if (typeof document !== 'undefined') {
      this.captureCanvas = document.createElement('canvas');
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
    }
  }

  public static getInstance(): ScreenVisionManager {
    if (!ScreenVisionManager.instance) {
      ScreenVisionManager.instance = new ScreenVisionManager();
    }
    return ScreenVisionManager.instance;
  }

  public getState(): ScreenShareState {
    return this.state;
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public setLastError(err: string | null): void {
    this.lastError = err;
    this.errorListeners.forEach((listener) => {
      try {
        listener(err);
      } catch (e) {
        console.warn('[ScreenVisionManager] Error listener error:', e);
      }
    });
  }

  public getMode(): ScreenAnalysisMode {
    return this.currentMode;
  }

  public setMode(mode: ScreenAnalysisMode): void {
    this.currentMode = mode;
  }

  public subscribeState(listener: VisionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state, this.mediaStream);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeAnalysis(listener: VisionAnalysisListener): () => void {
    this.analysisListeners.add(listener);
    return () => this.analysisListeners.delete(listener);
  }

  public subscribeError(listener: (err: string | null) => void): () => void {
    this.errorListeners.add(listener);
    listener(this.lastError);
    return () => this.errorListeners.delete(listener);
  }

  private notifyState(newState: ScreenShareState) {
    this.state = newState;
    this.stateListeners.forEach((listener) => {
      try {
        listener(this.state, this.mediaStream);
      } catch (err) {
        console.warn('[ScreenVisionManager] Listener error:', err);
      }
    });
  }

  /**
   * Attach an actively granted MediaStream directly from a user click handler
   */
  public async attachStream(stream: MediaStream): Promise<void> {
    this.cleanupStream();
    this.mediaStream = stream;
    this.lastError = null;

    if (this.videoElement) {
      this.videoElement.srcObject = stream;
      try {
        await this.videoElement.play();
      } catch (e) {
        console.warn('[ScreenVisionManager] videoElement play warning:', e);
      }
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const handleEnded = () => {
        console.log('[ScreenVisionManager] Native track ended detected');
        this.stopScreenShare();
      };
      videoTrack.addEventListener('ended', handleEnded);
      videoTrack.onended = handleEnded;
    }

    this.notifyState('SCREEN_ACTIVE');
    this.startAdaptiveFrameSampling();
  }

  /**
   * Request user permission and start screen sharing via browser native getDisplayMedia.
   * MUST be called directly inside a genuine user click handler.
   */
  public async startScreenShare(): Promise<MediaStream | null> {
    // 1. Browser support check (Section 11)
    if (!navigator?.mediaDevices || !navigator?.mediaDevices?.getDisplayMedia) {
      const msg = "Screen sharing is not supported by this browser.";
      console.warn('[ScreenVisionManager]', msg);
      this.setLastError(msg);
      this.notifyState('SCREEN_ERROR');
      return null;
    }

    // 2. Secure context check (Section 12)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const msg = "Screen Vision requires HTTPS or localhost.";
      console.warn('[ScreenVisionManager]', msg);
      this.setLastError(msg);
      this.notifyState('SCREEN_ERROR');
      return null;
    }

    // Check permissions policy if explicitly restricted by host iframe
    if (
      typeof document !== 'undefined' &&
      ((document as any).permissionsPolicy?.allowsFeature?.('display-capture') === false ||
       (document as any).featurePolicy?.allowsFeature?.('display-capture') === false)
    ) {
      const msg = "Browser permissions policy blocked screen capture in this preview frame. Open ARAVAN in a top-level tab.";
      console.warn('[ScreenVisionManager]', msg);
      this.setLastError(msg);
      this.notifyState('SCREEN_ERROR');
      return null;
    }

    if (this.state === 'SCREEN_ACTIVE' && this.mediaStream) {
      return this.mediaStream; // Already active
    }

    try {
      // 3. Direct browser permission request - NO preceding state dispatches or async delays!
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      await this.attachStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('[ScreenVisionManager] Screen share permission note:', err?.message || err);
      let errorMsg = "Screen sharing failed.";
      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (errName === 'NotAllowedError') {
        if (errMsg.toLowerCase().includes('permissions policy') || errMsg.toLowerCase().includes('display-capture')) {
          errorMsg = "Browser permissions policy blocked screen capture in iframe. Open ARAVAN in top-level tab.";
        } else {
          errorMsg = "Screen sharing was cancelled or denied by user.";
        }
      } else if (errName === 'SecurityError') {
        errorMsg = "Security error: Screen sharing requires HTTPS or top-level window.";
      } else if (errName === 'AbortError') {
        errorMsg = "Screen capture request was aborted.";
      } else if (errName === 'NotSupportedError') {
        errorMsg = "Screen capture is not supported on this device/display.";
      } else if (errMsg) {
        errorMsg = errMsg;
      }

      this.setLastError(errorMsg);
      this.cleanupStream();
      this.notifyState('SCREEN_OFF');
      return null;
    }
  }

  /**
   * Immediately stops all display media tracks and releases the stream
   */
  public stopScreenShare(): void {
    this.stopFrameSampling();
    this.cleanupStream();
    this.notifyState('SCREEN_OFF');
  }

  private cleanupStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.prevFrameData = null;
    this.lastCapturedBase64 = null;
  }

  /**
   * Grabs a downscaled, compressed JPEG frame from the active screen stream
   */
  public captureFrame(maxWidth = 1024, maxHeight = 720, quality = 0.75): string | null {
    if (!this.videoElement || !this.captureCanvas || this.state !== 'SCREEN_ACTIVE') {
      return null;
    }

    const video = this.videoElement;
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    if (!vWidth || !vHeight) {
      return null;
    }

    // Calculate aspect-ratio preserving dimensions
    let targetWidth = vWidth;
    let targetHeight = vHeight;

    if (targetWidth > maxWidth) {
      targetHeight = Math.round((maxWidth / targetWidth) * targetHeight);
      targetWidth = maxWidth;
    }
    if (targetHeight > maxHeight) {
      targetWidth = Math.round((maxHeight / targetHeight) * targetWidth);
      targetHeight = maxHeight;
    }

    this.captureCanvas.width = targetWidth;
    this.captureCanvas.height = targetHeight;
    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const dataUrl = this.captureCanvas.toDataURL('image/jpeg', quality);
    this.lastCapturedBase64 = dataUrl;
    return dataUrl;
  }

  /**
   * Change detection using low-res thumbnail diff
   */
  private hasScreenChangedSignificantly(thresholdPercent = 3.5): boolean {
    if (!this.videoElement || !this.captureCanvas) return true;

    const thumbW = 32;
    const thumbH = 32;
    const canvas = document.createElement('canvas');
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    ctx.drawImage(this.videoElement, 0, 0, thumbW, thumbH);
    const imgData = ctx.getImageData(0, 0, thumbW, thumbH).data;

    if (!this.prevFrameData) {
      this.prevFrameData = new Uint8ClampedArray(imgData);
      return true;
    }

    let diffScore = 0;
    const totalPixels = thumbW * thumbH;

    for (let i = 0; i < imgData.length; i += 4) {
      const rDiff = Math.abs(imgData[i] - this.prevFrameData[i]);
      const gDiff = Math.abs(imgData[i + 1] - this.prevFrameData[i + 1]);
      const bDiff = Math.abs(imgData[i + 2] - this.prevFrameData[i + 2]);
      if (rDiff + gDiff + bDiff > 45) {
        diffScore++;
      }
    }

    this.prevFrameData = new Uint8ClampedArray(imgData);
    const percentChanged = (diffScore / totalPixels) * 100;
    return percentChanged >= thresholdPercent;
  }

  /**
   * Start adaptive background frame sampling (1-2 FPS without flooding Gemini)
   */
  private startAdaptiveFrameSampling(): void {
    this.stopFrameSampling();
    // Cache latest frame every 800ms to stay fresh for instantaneous user questions
    this.samplingIntervalId = window.setInterval(() => {
      if (this.state === 'SCREEN_ACTIVE') {
        this.captureFrame(1024, 720, 0.75);
      }
    }, 800);
  }

  private stopFrameSampling(): void {
    if (this.samplingIntervalId !== null) {
      clearInterval(this.samplingIntervalId);
      this.samplingIntervalId = null;
    }
  }

  /**
   * Trigger a vision analysis request to ARAVAN
   */
  public async analyzeScreen(customPrompt?: string, mode?: ScreenAnalysisMode): Promise<string> {
    if (this.state !== 'SCREEN_ACTIVE') {
      return 'Screen sharing is not currently active. Enable screen share first.';
    }

    if (this.isAnalyzing) {
      return 'ARAVAN is currently processing the previous screen frame.';
    }

    const targetMode = mode || this.currentMode;
    const frameData = this.captureFrame(1024, 720, 0.75);

    if (!frameData) {
      return 'Unable to capture current display frame.';
    }

    this.isAnalyzing = true;

    try {
      // Gather long-term memories if available for context
      let memoryContext: string | undefined;
      try {
        const memMgr = MemoryManager.getInstance();
        const contextStr = await memMgr.getRelevantContext(customPrompt || 'screen vision analysis');
        if (contextStr) {
          memoryContext = contextStr;
        }
      } catch {
        // ignore memory lookup failure
      }

      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: frameData,
          mode: targetMode,
          prompt: customPrompt,
          memoryContext,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Vision analysis failed');
      }

      const resultText = data.text as string;
      const analysisResult: ScreenAnalysisResult = {
        text: resultText,
        mode: targetMode,
        timestamp: Date.now(),
      };

      // Notify analysis listeners
      this.analysisListeners.forEach((l) => l(analysisResult));

      // Append ARAVAN response directly to the existing conversation stream
      StateManager.getInstance().addMessage({
        role: 'assistant',
        text: resultText,
        source: 'text',
      });

      // Simultaneously vocalize through ARAVAN's audio speech engine
      AudioReactiveCore.getInstance().speakText(resultText);

      this.lastAnalysisTime = Date.now();
      return resultText;
    } catch (err: any) {
      console.error('[ScreenVisionManager] Error performing vision analysis:', err?.message || err);
      const errorMsg = 'I had trouble interpreting your screen frame just now. Please try again in a moment.';
      StateManager.getInstance().addMessage({
        role: 'assistant',
        text: errorMsg,
        source: 'text',
      });
      return errorMsg;
    } finally {
      this.isAnalyzing = false;
    }
  }

  public getIsAnalyzing(): boolean {
    return this.isAnalyzing;
  }
}
