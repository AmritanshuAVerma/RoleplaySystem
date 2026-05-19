import { z } from "zod";

export const LoreEntry = z.object({
  id: z.string().uuid(),
  keys: z.array(z.string()).min(1),
  content: z.string().min(1),
  priority: z.number().int().default(0),
});
export type LoreEntry = z.infer<typeof LoreEntry>;

export const World = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  summary: z.string().default(""),
  lore: z.array(LoreEntry).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type World = z.infer<typeof World>;

export const WorldCreate = World.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type WorldCreate = z.infer<typeof WorldCreate>;
