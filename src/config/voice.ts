/**
 * ARAVAN Voice Configuration
 * 
 * CRITICAL REQUIREMENT:
 * This is the SINGLE SOURCE OF TRUTH for ARAVAN's voice.
 * ARAVAN MUST use a male Gemini Live voice for the entire session.
 * 
 * Absolutely NO fallback voices (no female voice, no default voice, no browser TTS).
 */

export const ARAVAN_VOICE = "Charon" as const;

export const ARAVAN_VOICE_CONFIG = {
  voiceName: ARAVAN_VOICE,
} as const;

export const VOICE_PIPELINE = "Gemini Live" as const;
export const VOICE_FALLBACK_STATUS = "DISABLED" as const;
export const AUDIO_INPUT_FORMAT = "PCM16 / 16kHz" as const;
export const AUDIO_OUTPUT_FORMAT = "PCM / 24kHz" as const;
export const LIVE_MODEL_NAME = "gemini-3.1-flash-live-preview" as const;

/**
 * Validates that the ARAVAN voice configuration is strictly present and valid.
 * Throws an error immediately if configuration is missing, preventing any fallback.
 */
export function validateVoiceConfig(): void {
  if (!ARAVAN_VOICE || typeof ARAVAN_VOICE !== "string") {
    throw new Error("ARAVAN voice configuration missing.");
  }
}

/**
 * Development logging for voice verification.
 */
export function logVoiceSafetyCheck(): void {
  if (process.env.NODE_ENV !== "production" || typeof window !== "undefined") {
    console.log(
      `%c[ARAVAN]%c Connecting Live API\n` +
      `[ARAVAN] Model: ${LIVE_MODEL_NAME}\n` +
      `[ARAVAN] Voice: ${ARAVAN_VOICE}\n` +
      `[ARAVAN] Audio input: ${AUDIO_INPUT_FORMAT}\n` +
      `[ARAVAN] Audio output: ${AUDIO_OUTPUT_FORMAT}\n` +
      `[ARAVAN] Voice fallback: ${VOICE_FALLBACK_STATUS}`,
      "color: #f59e0b; font-weight: bold;",
      "color: inherit;"
    );
  }
}
