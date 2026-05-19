import { z } from "zod";

export const Scenario = z.object({
  id: z.string().uuid(),
  worldId: z.string().uuid().optional(),
  title: z.string().min(1),
  hook: z.string().default(""),
  openingScene: z.string().default(""),
  tags: z.array(z.string()).default([]),
  /** Suggested PCs / NPCs for this scenario. */
  suggestedCharacterIds: z.array(z.string().uuid()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Scenario = z.infer<typeof Scenario>;

export const ScenarioCreate = Scenario.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ScenarioCreate = z.infer<typeof ScenarioCreate>;
