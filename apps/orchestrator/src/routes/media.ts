import { Router } from "express";
import multer from "multer";
import { writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { config } from "../config.js";
import { getImageAdapter } from "../adapters/image/index.js";
import { getSttAdapter } from "../adapters/stt/index.js";
import { getTtsAdapter } from "../adapters/tts/index.js";
import { translate } from "../services/translation.js";

export const mediaRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

mediaRouter.post("/stt", upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "audio_file_required" });
  const lang = typeof req.body?.lang === "string" ? req.body.lang : undefined;
  try {
    const out = await getSttAdapter().transcribe(req.file.buffer, { lang });
    res.json(out);
  } catch (e) {
    res.status(502).json({ error: "stt_failed", detail: String(e) });
  }
});

mediaRouter.post("/tts", async (req, res) => {
  const { text, voice, lang } = (req.body ?? {}) as {
    text?: string;
    voice?: string;
    lang?: string;
  };
  if (!text) return res.status(400).json({ error: "text_required" });
  try {
    const buf = await getTtsAdapter().synthesize(text, { voice, lang });
    const filename = `${uuid()}.wav`;
    await writeFile(join(config.dataDir, filename), buf);
    res.json({ path: `/media/files/${filename}` });
  } catch (e) {
    res.status(502).json({ error: "tts_failed", detail: String(e) });
  }
});

mediaRouter.post("/image", async (req, res) => {
  const { prompt, negative, width, height, faceImageDataUrl } = (req.body ?? {}) as {
    prompt?: string;
    negative?: string;
    width?: number;
    height?: number;
    faceImageDataUrl?: string;
  };
  if (!prompt) return res.status(400).json({ error: "prompt_required" });
  let faceImageB64: string | undefined;
  if (faceImageDataUrl) {
    const m = faceImageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!m?.[2]) return res.status(400).json({ error: "invalid_faceImageDataUrl" });
    faceImageB64 = m[2];
  }
  // Auto-prepend/append the env-configured prompt scaffolding so the caller
  // doesn't have to remember Pony score tags / default LoRAs on every gen.
  // The prompt is expected to NOT already contain these (no de-dup performed).
  const loraTags = config.image.defaultLoras
    ? config.image.defaultLoras
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [name, weight] = pair.split(":");
          const w = weight ? Number(weight) : 0.7;
          return `<lora:${name}:${Number.isFinite(w) ? w : 0.7}>`;
        })
        .join(" ")
    : "";
  const finalPrompt = [config.image.defaultPositive, prompt, loraTags]
    .filter((s) => s && s.length > 0)
    .join(", ");
  const finalNegative = [negative ?? "", config.image.defaultNegative]
    .filter((s) => s && s.length > 0)
    .join(", ");
  try {
    const buf = await getImageAdapter().generate(finalPrompt, {
      negative: finalNegative,
      width,
      height,
      faceImageB64,
    });
    const filename = `${uuid()}.png`;
    await writeFile(join(config.dataDir, filename), buf);
    res.json({ path: `/media/files/${filename}` });
  } catch (e) {
    res.status(502).json({ error: "image_failed", detail: String(e) });
  }
});

mediaRouter.post("/translate", async (req, res) => {
  const { text, from, to } = (req.body ?? {}) as {
    text?: string;
    from?: string;
    to?: string;
  };
  if (!text || !from || !to) return res.status(400).json({ error: "text_from_to_required" });
  try {
    const translated = await translate(text, from, to);
    res.json({ text: translated });
  } catch (e) {
    res.status(502).json({ error: "translate_failed", detail: String(e) });
  }
});

mediaRouter.get("/loras", async (_req, res) => {
  try {
    const entries = await readdir(config.image.loraDir);
    const names = entries
      .filter((n) => /\.(safetensors|pt|ckpt)$/i.test(n))
      .map((n) => n.replace(/\.(safetensors|pt|ckpt)$/i, ""))
      .sort((a, b) => a.localeCompare(b));
    res.json({ loras: names });
  } catch (e) {
    // Folder may not exist yet — return empty list instead of 500.
    res.json({ loras: [], warning: String(e) });
  }
});
