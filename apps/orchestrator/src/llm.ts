import { StClient } from "@rp/st-client";
import { config } from "./config.js";

export const llm = new StClient({
  baseUrl: config.st.baseUrl,
  apiKey: config.st.apiKey,
});
