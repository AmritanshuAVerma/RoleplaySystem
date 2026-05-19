import { Router } from "express";
import { v4 as uuid } from "uuid";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Character,
  Message,
  Scenario,
  Session,
  SessionCreate,
  SessionState,
  World,
} from "@rp/shared";
import { db } from "../db.js";
import { runGmTurn } from "../services/gm-agent.js";
import { config } from "../config.js";

export const sessionsRouter: Router = Router();

function row2session(r: any): Session {
  return Session.parse({
    id: r.id,
    scenarioId: r.scenario_id,
    gmModel: r.gm_model,
    participants: JSON.parse(r.participants),
    state: JSON.parse(r.state),
    startedAt: r.started_at,
    endedAt: r.ended_at ?? undefined,
  });
}

function row2message(r: any): Message {
  return Message.parse({
    id: r.id,
    sessionId: r.session_id,
    characterId: r.character_id ?? undefined,
    role: r.role,
    content: r.content,
    lang: r.lang,
    translations: JSON.parse(r.translations),
    audioPath: r.audio_path ?? undefined,
    imagePath: r.image_path ?? undefined,
    createdAt: r.created_at,
  });
}

sessionsRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM sessions ORDER BY started_at DESC").all();
  res.json(rows.map(row2session));
});

sessionsRouter.post("/", (req, res) => {
  const parsed = SessionCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  const now = new Date().toISOString();
  const state = SessionState.parse(parsed.data.state ?? {});
  db.prepare(
    `INSERT INTO sessions (id,scenario_id,gm_model,participants,state,started_at)
     VALUES (?,?,?,?,?,?)`,
  ).run(
    id,
    parsed.data.scenarioId,
    parsed.data.gmModel,
    JSON.stringify(parsed.data.participants),
    JSON.stringify(state),
    now,
  );
  res.status(201).json(row2session(db.prepare("SELECT * FROM sessions WHERE id=?").get(id)));
});

sessionsRouter.get("/:id/messages", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC")
    .all(req.params.id);
  res.json(rows.map(row2message));
});

/**
 * POST a player message and get the GM's reply. v1 = synchronous.
 * Body: { characterId?: string, content: string, lang?: string }
 */
sessionsRouter.post("/:id/turn", async (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id=?").get(req.params.id) as any;
  if (!session) return res.status(404).json({ error: "session_not_found" });
  const sess = row2session(session);

  const scenarioRow = db.prepare("SELECT * FROM scenarios WHERE id=?").get(sess.scenarioId) as any;
  if (!scenarioRow) return res.status(500).json({ error: "scenario_missing" });
  const scenario = Scenario.parse({
    id: scenarioRow.id,
    worldId: scenarioRow.world_id ?? undefined,
    title: scenarioRow.title,
    hook: scenarioRow.hook,
    openingScene: scenarioRow.opening_scene,
    tags: JSON.parse(scenarioRow.tags),
    suggestedCharacterIds: JSON.parse(scenarioRow.suggested_character_ids),
    createdAt: scenarioRow.created_at,
    updatedAt: scenarioRow.updated_at,
  });

  let world: World | undefined;
  if (scenario.worldId) {
    const wRow = db.prepare("SELECT * FROM worlds WHERE id=?").get(scenario.worldId) as any;
    if (wRow) {
      world = World.parse({
        id: wRow.id,
        name: wRow.name,
        summary: wRow.summary,
        lore: JSON.parse(wRow.lore),
        createdAt: wRow.created_at,
        updatedAt: wRow.updated_at,
      });
    }
  }

  const charIds = sess.participants.map((p) => p.characterId);
  const characters: Character[] =
    charIds.length === 0
      ? []
      : (db
          .prepare(
            `SELECT * FROM characters WHERE id IN (${charIds.map(() => "?").join(",")})`,
          )
          .all(...charIds) as any[]).map((r) =>
          Character.parse({
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
          }),
        );

  const body = req.body as {
    characterId?: string;
    content: string;
    lang?: string;
    /** Optional `data:image/<type>;base64,<...>` URL attached to this turn. */
    imageDataUrl?: string;
  };
  if (!body?.content && !body?.imageDataUrl) {
    return res.status(400).json({ error: "content_or_image_required" });
  }

  let imagePath: string | undefined;
  if (body.imageDataUrl) {
    const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i.exec(body.imageDataUrl);
    const mime = m?.[1];
    const b64 = m?.[2];
    if (!mime || !b64) return res.status(400).json({ error: "bad_image_data_url" });
    const ext = mime.toLowerCase() === "jpg" ? "jpeg" : mime.toLowerCase();
    const buf = Buffer.from(b64, "base64");
    if (buf.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: "image_too_large" });
    }
    const filename = `${uuid()}.${ext}`;
    await writeFile(join(config.dataDir, filename), buf);
    imagePath = `/media/files/${filename}`;
  }

  const now = new Date().toISOString();
  const playerMsg = Message.parse({
    id: uuid(),
    sessionId: sess.id,
    characterId: body.characterId,
    role: "character",
    content: body.content ?? "",
    lang: body.lang ?? "en",
    translations: {},
    imagePath,
    createdAt: now,
  });
  insertMessage(playerMsg);

  const recent = (
    db
      .prepare(
        "SELECT * FROM messages WHERE session_id=? ORDER BY created_at DESC LIMIT 20",
      )
      .all(sess.id) as any[]
  )
    .map(row2message)
    .reverse();

  let gmText: string;
  try {
    gmText = await runGmTurn({
      session: sess,
      scenario,
      world,
      characters,
      recentMessages: recent.slice(0, -1),
      trigger: playerMsg,
      triggerImageUrl: body.imageDataUrl,
    });
  } catch (e) {
    return res.status(502).json({ error: "gm_failed", detail: String(e) });
  }

  const gmMsg = Message.parse({
    id: uuid(),
    sessionId: sess.id,
    role: "gm",
    content: gmText,
    lang: "en",
    translations: {},
    createdAt: new Date().toISOString(),
  });
  insertMessage(gmMsg);

  // Advance turn counter.
  const nextState: SessionState = { ...sess.state, turn: sess.state.turn + 1 };
  db.prepare("UPDATE sessions SET state=? WHERE id=?").run(
    JSON.stringify(nextState),
    sess.id,
  );

  res.json({ player: playerMsg, gm: gmMsg });
});

function insertMessage(m: Message) {
  db.prepare(
    `INSERT INTO messages
      (id,session_id,character_id,role,content,lang,translations,audio_path,image_path,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    m.id,
    m.sessionId,
    m.characterId ?? null,
    m.role,
    m.content,
    m.lang,
    JSON.stringify(m.translations),
    m.audioPath ?? null,
    m.imagePath ?? null,
    m.createdAt,
  );
}
