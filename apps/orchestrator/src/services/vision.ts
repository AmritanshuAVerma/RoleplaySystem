import { llm } from "../llm.js";
import { config } from "../config.js";

/**
 * Run the configured vision model over an image and return a concise,
 * GM-useful description. The result is injected as a system note into
 * the GM turn so even text-only GM models can react to images.
 *
 * `imageDataUrl` must be a full `data:image/...;base64,...` URL or a
 * publicly fetchable http(s) URL the model can resolve.
 */
export async function describeImage(
  imageDataUrl: string,
  hint?: string,
): Promise<string> {
  const prompt =
    "Describe this image in 2-4 sentences for a tabletop roleplay GM. " +
    "Focus on subjects, mood, setting, and any text. No preamble." +
    (hint ? ` Player hint: ${hint}` : "");

  const { content } = await llm.chat({
    model: config.models.vision,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 220,
  });
  return content.trim();
}
