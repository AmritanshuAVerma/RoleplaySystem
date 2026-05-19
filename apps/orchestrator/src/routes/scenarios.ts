import { Router } from "express";
import { v4 as uuid } from "uuid";
import { Scenario, ScenarioCreate } from "@rp/shared";
import { db } from "../db.js";

export const scenariosRouter: Router = Router();

function row2scenario(r: any): Scenario {
  return Scenario.parse({
    id: r.id,
    worldId: r.world_id ?? undefined,
    title: r.title,
    hook: r.hook,
    openingScene: r.opening_scene,
    tags: JSON.parse(r.tags),
    suggestedCharacterIds: JSON.parse(r.suggested_character_ids),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

scenariosRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM scenarios ORDER BY created_at DESC").all();
  res.json(rows.map(row2scenario));
});

scenariosRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM scenarios WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row2scenario(row));
});

scenariosRouter.post("/", (req, res) => {
  const parsed = ScenarioCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO scenarios
      (id,world_id,title,hook,opening_scene,tags,suggested_character_ids,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    parsed.data.worldId ?? null,
    parsed.data.title,
    parsed.data.hook ?? "",
    parsed.data.openingScene ?? "",
    JSON.stringify(parsed.data.tags ?? []),
    JSON.stringify(parsed.data.suggestedCharacterIds ?? []),
    now,
    now,
  );
  res.status(201).json(row2scenario(db.prepare("SELECT * FROM scenarios WHERE id=?").get(id)));
});

scenariosRouter.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM scenarios WHERE id=?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not_found" });
  res.status(204).end();
});
