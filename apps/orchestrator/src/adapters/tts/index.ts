import { config } from "../../config.js";
import { XttsAdapter } from "./xtts.js";

export interface TtsAdapter {
  /** Returns audio bytes (wav/mp3) for the given text. */
  synthesize(text: string, opts?: { voice?: string; lang?: string }): Promise<Buffer>;
}

export function getTtsAdapter(): TtsAdapter {
  switch (config.tts.provider) {
    case "xtts":
      return new XttsAdapter(config.tts.xttsUrl);
    default:
      throw new Error(`Unknown TTS provider: ${config.tts.provider}`);
  }
}
