import { z } from "zod";
import { LangTag } from "./character.js";

export const Controller = z.enum(["human", "ai"]);

export const SessionParticipant = z.object({
  characterId: z.string().uuid(),
  controller: Controller,
  /** Model name (resolved inside SillyTavern) when controller='ai'. */
  model: z.string().optional(),
  lang: LangTag.default("en"),
});
export type SessionParticipant = z.infer<typeof SessionParticipant>;

export const SessionState = z.object({
  turn: z.number().int().nonnegative().default(0),
  scene: z.string().default(""),
  flags: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
});
export type SessionState = z.infer<typeof SessionState>;

export const Session = z.object({
  id: z.string().uuid(),
  scenarioId: z.string().uuid(),
  gmModel: z.string(),
  participants: z.array(SessionParticipant),
  state: SessionState,
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});
export type Session = z.infer<typeof Session>;

export const SessionCreate = Session.omit({
  id: true,
  startedAt: true,
  endedAt: true,
  state: true,
}).extend({
  state: SessionState.partial().optional(),
});
export type SessionCreate = z.infer<typeof SessionCreate>;
