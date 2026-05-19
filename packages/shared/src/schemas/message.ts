import { z } from "zod";
import { LangTag } from "./character.js";

export const MessageRole = z.enum(["system", "gm", "character", "ooc"]);

export const Message = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  characterId: z.string().uuid().optional(),
  role: MessageRole,
  content: z.string(),
  lang: LangTag.default("en"),
  /** Cached translations keyed by target lang tag. */
  translations: z.record(z.string()).default({}),
  audioPath: z.string().optional(),
  imagePath: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof Message>;

export const MessageCreate = Message.omit({
  id: true,
  translations: true,
  createdAt: true,
}).extend({
  translations: z.record(z.string()).optional(),
});
export type MessageCreate = z.infer<typeof MessageCreate>;
