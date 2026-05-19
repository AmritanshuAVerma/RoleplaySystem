import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { Character, CharacterCreate, CharacterSheet } from "@rp/shared";
import { db } from "../db.js";

export const charactersRouter: Router = Router();

function row2char(r: any): Character {
  return Character.parse({
    id: r.id,
    name: r.name,
    kind: r.kind,
    persona: r.persona,
    sheet: JSON.parse(r.sheet),
    portraitPath: r.portrait_path ?? undefined,
    lang: r.lang,
    stCharacterId: r.st_character_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

charactersRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM characters ORDER BY created_at DESC").all();
  res.json(rows.map(row2char));
});

charactersRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM characters WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(row2char(row));
});

charactersRouter.post("/", (req, res) => {
  const parsed = CharacterCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const now = new Date().toISOString();
  const id = uuid();
  const sheet = CharacterSheet.parse(parsed.data.sheet ?? {});
  db.prepare(
    `INSERT INTO characters (id,name,kind,persona,sheet,portrait_path,lang,st_character_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    parsed.data.name,
    parsed.data.kind,
    parsed.data.persona ?? "",
    JSON.stringify(sheet),
    parsed.data.portraitPath ?? null,
    parsed.data.lang ?? "en",
    parsed.data.stCharacterId ?? null,
    now,
    now,
  );
  res.status(201).json(row2char(db.prepare("SELECT * FROM characters WHERE id=?").get(id)));
});

const Patch = CharacterCreate.partial();
charactersRouter.patch("/:id", (req, res) => {
  const parsed = Patch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cur = db.prepare("SELECT * FROM characters WHERE id=?").get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: "not_found" });
  const merged = {
    name: parsed.data.name ?? cur.name,
    kind: parsed.data.kind ?? cur.kind,
    persona: parsed.data.persona ?? cur.persona,
    sheet: parsed.data.sheet
      ? CharacterSheet.parse({ ...JSON.parse(cur.sheet), ...parsed.data.sheet })
      : JSON.parse(cur.sheet),
    portraitPath: parsed.data.portraitPath ?? cur.portrait_path,
    lang: parsed.data.lang ?? cur.lang,
    stCharacterId: parsed.data.stCharacterId ?? cur.st_character_id,
  };
  db.prepare(
    `UPDATE characters SET name=?,kind=?,persona=?,sheet=?,portrait_path=?,lang=?,st_character_id=?,updated_at=? WHERE id=?`,
  ).run(
    merged.name,
    merged.kind,
    merged.persona,
    JSON.stringify(merged.sheet),
    merged.portraitPath ?? null,
    merged.lang,
    merged.stCharacterId ?? null,
    new Date().toISOString(),
    req.params.id,
  );
  res.json(row2char(db.prepare("SELECT * FROM characters WHERE id=?").get(req.params.id)));
});

charactersRouter.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM characters WHERE id=?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not_found" });
  res.status(204).end();
});

// Silence unused import warning for the strict tsc setup.
void z;
