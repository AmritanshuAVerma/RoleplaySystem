/**
 * Minimal typed client for SillyTavern's HTTP API.
 *
 * SillyTavern exposes several endpoints; for v1 we only need:
 *   - chat completions (OpenAI-compatible at /v1/chat/completions when
 *     "OpenAI-compatible API" extension is enabled), OR
 *   - the native /api/backends/* routes.
 *
 * To keep this stable we go through SillyTavern's OpenAI-compatible
 * surface. If you use a backend that doesn't expose it (e.g. raw Kobold),
 * point ST_BASE_URL at the backend's OpenAI-compatible endpoint instead —
 * the interface here is the same.
 *
 * NOTE: SillyTavern's exact paths shift between versions. Treat this as a
 * thin wrapper you may need to update when you pin a ST version.
 */

/**
 * OpenAI-compatible multimodal content part. Vision-capable backends
 * (llava, qwen-vl, gemma3-vision, qwen3-vl, ...) accept this form;
 * text-only backends should be passed plain string `content`.
 */
export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  name?: string;
  content: string | ChatContentPart[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  /** Free-form passthrough for backend-specific knobs. */
  extra?: Record<string, unknown>;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  raw: unknown;
}

export interface StClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export class StClient {
  private baseUrl: string;
  private apiKey?: string;
  private fetchImpl: typeof fetch;

  constructor(opts: StClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.8,
        top_p: req.top_p ?? 0.95,
        max_tokens: req.max_tokens ?? 512,
        stop: req.stop,
        ...req.extra,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ST chat failed ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { content, model: json.model ?? req.model, raw: json };
  }

  /** Health-check helper; returns true if base URL responds. */
  async ping(): Promise<boolean> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/`, { method: "GET" });
      return res.ok || res.status === 404; // ST may not have a / handler
    } catch {
      return false;
    }
  }
}
