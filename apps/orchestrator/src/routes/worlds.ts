import { Router } from "express";
import { v4 as uuid } from "uuid";
import { World, WorldCreate } from "@rp/shared";
import { db } from "../db.js";

export const worldsRouter: Router = Router();

function row2world(r: any): World {
  return World.parse({
    id: r.id,
    name: r.name,
    summary: r.summary,
    lore: JSON.parse(r.lore),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

worldsRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM worlds ORDER BY created_at DESC").all();
  res.json(rows.map(row2world));
});

worldsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM worlds WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row2world(row));
});

worldsRouter.post("/", (req, res) => {
  const parsed = WorldCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO worlds (id,name,summary,lore,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
  ).run(
    id,
    parsed.data.name,
    parsed.data.summary ?? "",
    JSON.stringify(parsed.data.lore ?? []),
    now,
    now,
  );
  res.status(201).json(row2world(db.prepare("SELECT * FROM worlds WHERE id=?").get(id)));
});

worldsRouter.patch("/:id", (req, res) => {
  const parsed = WorldCreate.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cur = db.prepare("SELECT * FROM worlds WHERE id=?").get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: "not_found" });
  db.prepare(
    `UPDATE worlds SET name=?,summary=?,lore=?,updated_at=? WHERE id=?`,
  ).run(
    parsed.data.name ?? cur.name,
    parsed.data.summary ?? cur.summary,
    parsed.data.lore ? JSON.stringify(parsed.data.lore) : cur.lore,
    new Date().toISOString(),
    req.params.id,
  );
  res.json(row2world(db.prepare("SELECT * FROM worlds WHERE id=?").get(req.params.id)));
});

worldsRouter.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM worlds WHERE id=?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not_found" });
  res.status(204).end();
});
