import { config } from "../../config.js";
import { WhisperCppAdapter } from "./whisper-cpp.js";

export interface SttAdapter {
  /** Transcribe a WAV/MP3/OGG buffer. Returns text + detected lang. */
  transcribe(audio: Buffer, opts?: { lang?: string }): Promise<{ text: string; lang: string }>;
}

export function getSttAdapter(): SttAdapter {
  switch (config.stt.provider) {
    case "whisper-cpp":
      return new WhisperCppAdapter(config.stt.whisperCppUrl);
    default:
      throw new Error(`Unknown STT provider: ${config.stt.provider}`);
  }
}
