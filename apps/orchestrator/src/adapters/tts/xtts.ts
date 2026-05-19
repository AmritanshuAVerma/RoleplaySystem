import type { TtsAdapter } from "./index.js";

/**
 * Coqui XTTS server (https://github.com/coqui-ai/TTS), exposing /tts_to_audio.
 * Endpoint shape varies by community wrapper; adjust as needed.
 */
export class XttsAdapter implements TtsAdapter {
  constructor(private readonly baseUrl: string) {}

  async synthesize(
    text: string,
    opts?: { voice?: string; lang?: string },
  ): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/tts_to_audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        speaker_wav: opts?.voice,
        language: opts?.lang ?? "en",
      }),
    });
    if (!res.ok) throw new Error(`xtts ${res.status}: ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }
}
