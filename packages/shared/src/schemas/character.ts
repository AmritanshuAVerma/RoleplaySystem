import { z } from "zod";

/** BCP-47-ish language tag, kept loose for v1. */
export const LangTag = z.string().min(2).max(16);

export const CharacterKind = z.enum(["pc", "npc", "ai"]);

/**
 * Free-form sheet. v1 doesn't enforce a system (D&D 5e, PbtA, etc.) —
 * we store whatever the user enters and let the GM agent reason over it.
 */
export const CharacterSheet = z.object({
  system: z.string().default("freeform"),
  attributes: z.record(z.union([z.string(), z.number()])).default({}),
  skills: z.array(z.string()).default([]),
  inventory: z.array(z.string()).default([]),
  notes: z.string().default(""),
});
export type CharacterSheet = z.infer<typeof CharacterSheet>;

export const Character = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: CharacterKind,
  persona: z.string().default(""),
  sheet: CharacterSheet,
  portraitPath: z.string().optional(),
  lang: LangTag.default("en"),
  /** SillyTavern character-card id, if imported from / synced to ST. */
  stCharacterId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Character = z.infer<typeof Character>;

export const CharacterCreate = Character.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sheet: CharacterSheet.partial().optional(),
});
export type CharacterCreate = z.infer<typeof CharacterCreate>;
