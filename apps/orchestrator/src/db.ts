import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

mkdirSync(dirname(config.dbFile), { recursive: true });
mkdirSync(config.dataDir, { recursive: true });

export const db: DatabaseType = new Database(config.dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  persona TEXT NOT NULL DEFAULT '',
  sheet TEXT NOT NULL DEFAULT '{}',
  portrait_path TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  st_character_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  lore TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  world_id TEXT REFERENCES worlds(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  hook TEXT NOT NULL DEFAULT '',
  opening_scene TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  suggested_character_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  gm_model TEXT NOT NULL,
  participants TEXT NOT NULL DEFAULT '[]',
  state TEXT NOT NULL DEFAULT '{"turn":0,"scene":"","flags":{}}',
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  translations TEXT NOT NULL DEFAULT '{}',
  audio_path TEXT,
  image_path TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
`);
