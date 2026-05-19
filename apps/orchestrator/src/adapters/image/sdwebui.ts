import type { ImageAdapter, ImageGenOpts } from "./index.js";

/**
 * AUTOMATIC1111 / Forge Stable Diffusion WebUI API.
 *
 * When `faceImageB64` is supplied we activate two alwayson scripts:
 *   - ReActor   — swaps the generated face for the supplied reference
 *   - ADetailer — auto-inpaints the face region for higher fidelity
 *
 * Both extensions must already be installed in the WebUI
 * (see scripts/setup-forge-extensions.ps1).
 */
export class SdWebUiAdapter implements ImageAdapter {
  constructor(private readonly baseUrl: string) {}

  async generate(prompt: string, opts?: ImageGenOpts): Promise<Buffer> {
    const alwaysonScripts: Record<string, { args: unknown[] }> = {};

    if (opts?.faceImageB64) {
      // ReActor arg order (sd-webui-reactor >= 0.7.x). Conservative defaults;
      // tweak in the UI if you need a different restorer/upscaler.
      alwaysonScripts["reactor"] = {
        args: [
          opts.faceImageB64,            // 0  source image (base64)
          true,                         // 1  enable
          "0",                          // 2  source face indexes
          "0",                          // 3  target face indexes
          "inswapper_128.onnx",         // 4  model
          "CodeFormer",                 // 5  face restorer
          1,                            // 6  restorer visibility
          true,                         // 7  restore first
          "None",                       // 8  upscaler
          1,                            // 9  upscaler scale
          1,                            // 10 upscaler visibility
          false,                        // 11 swap in source
          true,                         // 12 swap in generated
          1,                            // 13 console log level
          0,                            // 14 gender source (0 = no filter)
          0,                            // 15 gender target
          false,                        // 16 save original
          0.8,                          // 17 codeformer weight
          false,                        // 18 source hash check
          false,                        // 19 target hash check
          "CUDA",                       // 20 device
          true,                         // 21 mask face
        ],
      };
      // ADetailer face inpaint pass — sharpens the swapped face.
      alwaysonScripts["ADetailer"] = {
        args: [
          true,                         // enable
          false,                        // skip img2img
          {
            ad_model: "face_yolov8n.pt",
            ad_prompt: "",
            ad_negative_prompt: "",
            ad_confidence: 0.3,
            ad_denoising_strength: 0.4,
          },
        ],
      };
    }

    const body: Record<string, unknown> = {
      prompt,
      negative_prompt: opts?.negative ?? "",
      width: opts?.width ?? 1024,
      height: opts?.height ?? 1024,
      steps: opts?.steps ?? 30,
      sampler_name: opts?.sampler ?? "DPM++ 2M SDE Karras",
      cfg_scale: opts?.cfgScale ?? 6.5,
    };
    if (Object.keys(alwaysonScripts).length > 0) {
      body["alwayson_scripts"] = alwaysonScripts;
    }

    const res = await fetch(`${this.baseUrl}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`sdwebui ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { images?: string[] };
    const b64 = json.images?.[0];
    if (!b64) throw new Error("sdwebui returned no image");
    return Buffer.from(b64, "base64");
  }
}
