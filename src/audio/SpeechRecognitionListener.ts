/**
 * SpeechRecognitionListener - Web Speech API Integration for ARAVAN
 * 
 * Provides continuous real-time user speech transcription alongside Web Audio PCM streaming:
 * - Immediate transcription visibility in chat UI
 * - Automatic voice command routing
 * - Echo suppression while ARAVAN is speaking
 * - Auto-restart on silence / browser timeouts
 */

export class SpeechRecognitionListener {
  private recognition: any = null;
  private active = false;
  private paused = false;
  private isSpeaking = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private restartTimeout: number | null = null;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const r = new SpeechRecognition();
        r.continuous = true;
        r.interimResults = true;
        r.lang = 'en-US';
        r.maxAlternatives = 1;

        r.onresult = (event: any) => {
          if (!this.active || this.paused || this.isSpeaking) return;

          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript.trim() && this.onTranscriptCallback) {
            this.onTranscriptCallback(finalTranscript.trim(), true);
          } else if (interimTranscript.trim() && this.onTranscriptCallback) {
            this.onTranscriptCallback(interimTranscript.trim(), false);
          }
        };

        r.onerror = (event: any) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            console.warn('[ARAVAN SpeechRecognition] Permission denied or not allowed.');
            this.active = false;
          }
          // 'no-speech' is normal during silence, onend will handle restart
        };

        r.onend = () => {
          if (this.active && !this.paused && !this.isSpeaking) {
            this.scheduleRestart(250);
          }
        };

        this.recognition = r;
      } catch (err) {
        console.warn('[ARAVAN SpeechRecognition] Could not instantiate Web Speech API:', err);
      }
    }
  }

  get isSupported(): boolean {
    return !!this.recognition;
  }

  get isActive(): boolean {
    return this.active && !this.paused;
  }

  start(onTranscript: (text: string, isFinal: boolean) => void): void {
    if (!this.recognition) return;

    this.onTranscriptCallback = onTranscript;
    this.active = true;
    this.paused = false;

    try {
      this.recognition.start();
    } catch {
      // Already running or starting
    }
  }

  setSpeaking(isSpeaking: boolean): void {
    this.isSpeaking = isSpeaking;
    if (isSpeaking) {
      this.pause();
    } else if (this.active) {
      this.resume();
    }
  }

  pause(): void {
    this.paused = true;
    if (this.restartTimeout !== null) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
  }

  resume(): void {
    if (!this.active) return;
    this.paused = false;
    this.scheduleRestart(150);
  }

  stop(): void {
    this.active = false;
    this.paused = false;
    this.onTranscriptCallback = null;
    if (this.restartTimeout !== null) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
  }

  private scheduleRestart(delayMs: number): void {
    if (this.restartTimeout !== null) {
      clearTimeout(this.restartTimeout);
    }
    this.restartTimeout = window.setTimeout(() => {
      this.restartTimeout = null;
      if (this.active && !this.paused && !this.isSpeaking && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // ignore already started
        }
      }
    }, delayMs);
  }
}
