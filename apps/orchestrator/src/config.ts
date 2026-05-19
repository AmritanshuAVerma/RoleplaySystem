import "dotenv/config";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir: req("DATA_DIR", "./data"),
  dbFile: req("DB_FILE", "./data/roleplay.sqlite"),

  st: {
    baseUrl: req("ST_BASE_URL", "http://127.0.0.1:8000"),
    apiKey: process.env.ST_API_KEY || undefined,
  },

  models: {
    default: req("LLM_DEFAULT_MODEL", "llama3.1:8b-instruct"),
    gm: req("LLM_GM_MODEL", "llama3.1:8b-instruct"),
    utility: req("LLM_UTILITY_MODEL", "llama3.1:8b-instruct"),
    vision: req("LLM_VISION_MODEL", "rp-vision:4b"),
  },

  stt: {
    provider: req("STT_PROVIDER", "whisper-cpp"),
    whisperCppUrl: req("WHISPER_CPP_URL", "http://127.0.0.1:8081/inference"),
  },

  tts: {
    provider: req("TTS_PROVIDER", "xtts"),
    xttsUrl: req("XTTS_URL", "http://127.0.0.1:8020"),
  },

  image: {
    provider: req("IMAGE_PROVIDER", "sdwebui"),
    sdwebuiUrl: req("SDWEBUI_URL", "http://127.0.0.1:7860"),
    /** Filesystem path of the WebUI LoRA folder (for the /media/loras listing). */
    loraDir: req("LORA_DIR", "./vendor/sd-webui-forge/models/Lora"),
    /** Comma-separated `name:weight` pairs auto-appended to every prompt. */
    defaultLoras: (process.env.IMAGE_DEFAULT_LORAS ?? "").trim(),
    /** Prepended to every positive prompt (e.g. Pony score tags). */
    defaultPositive: (process.env.IMAGE_DEFAULT_POSITIVE ?? "").trim(),
    /** Appended to every negative prompt. */
    defaultNegative: (process.env.IMAGE_DEFAULT_NEGATIVE ?? "").trim(),
  },
};
