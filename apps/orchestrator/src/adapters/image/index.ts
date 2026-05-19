import { config } from "../../config.js";
import { SdWebUiAdapter } from "./sdwebui.js";

export interface ImageGenOpts {
  negative?: string;
  width?: number;
  height?: number;
  steps?: number;
  sampler?: string;
  cfgScale?: number;
  /** Base64-encoded reference face (PNG/JPEG bytes, no `data:` prefix). */
  faceImageB64?: string;
}

export interface ImageAdapter {
  /** Returns PNG bytes for the prompt. */
  generate(prompt: string, opts?: ImageGenOpts): Promise<Buffer>;
}

export function getImageAdapter(): ImageAdapter {
  switch (config.image.provider) {
    case "sdwebui":
      return new SdWebUiAdapter(config.image.sdwebuiUrl);
    default:
      throw new Error(`Unknown image provider: ${config.image.provider}`);
  }
}
