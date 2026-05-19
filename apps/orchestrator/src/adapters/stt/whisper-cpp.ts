import type { SttAdapter } from "./index.js";

/**
 * Talks to a whisper.cpp server started with:
 *   ./server -m models/ggml-base.bin --host 0.0.0.0 --port 8081
 *
 * The /inference endpoint accepts multipart with field 'file'.
 */
export class WhisperCppAdapter implements SttAdapter {
  constructor(private readonly url: string) {}

  async transcribe(
    audio: Buffer,
    opts?: { lang?: string },
  ): Promise<{ text: string; lang: string }> {
    const form = new FormData();
    form.append("file", new Blob([audio]), "audio.wav");
    if (opts?.lang) form.append("language", opts.lang);
    form.append("response_format", "json");

    const res = await fetch(this.url, { method: "POST", body: form });
    if (!res.ok) throw new Error(`whisper.cpp ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { text?: string; language?: string };
    return { text: (json.text ?? "").trim(), lang: json.language ?? opts?.lang ?? "en" };
  }
}
