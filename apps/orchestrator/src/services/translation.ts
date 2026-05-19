import { llm } from "../llm.js";
import { config } from "../config.js";

/**
 * Translate `text` from `from` -> `to` using the utility model via SillyTavern.
 * Caller is responsible for caching the result.
 */
export async function translate(text: string, from: string, to: string): Promise<string> {
  if (!text.trim() || from === to) return text;
  const { content } = await llm.chat({
    model: config.models.utility,
    temperature: 0.2,
    max_tokens: Math.min(2048, Math.ceil(text.length * 1.5) + 64),
    messages: [
      {
        role: "system",
        content:
          "You are a translator. Translate the user's text literally, preserving names, formatting, and roleplay tone. Output ONLY the translation, no commentary.",
      },
      { role: "user", content: `Translate from ${from} to ${to}:\n\n${text}` },
    ],
  });
  return content.trim();
}
