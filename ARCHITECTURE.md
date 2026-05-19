# Architecture

## High-level

```
+-----------------------+        HTTP/JSON        +----------------------------+
|  apps/web (Next.js)   | <---------------------> |  apps/orchestrator (Node)  |
|  - Character UI       |                         |  - REST API                |
|  - Scenario UI        |                         |  - SQLite (better-sqlite3) |
|  - World UI           |                         |  - GM agent loop           |
|  - Play view (chat)   |                         |  - Translation pipeline    |
+-----------------------+                         +-------------+--------------+
                                                                |
                          +-------------------------+-----------+-------+---------------------+
                          |                         |                   |                     |
                  +-------v-------+        +--------v--------+   +------v------+      +-------v-------+
                  | st-client     |        | adapters/stt    |   | adapters/tts|      | adapters/image|
                  | -> SillyTavern|        | (whisper.cpp)   |   | (XTTS/Piper)|      | (SD WebUI)    |
                  +-------+-------+        +-----------------+   +-------------+      +---------------+
                          |
                  +-------v-------+
                  | SillyTavern   |
                  |  -> Ollama /  |
                  |     KoboldCpp |
                  +---------------+
```

## Why this split

- **SillyTavern** already solves: character card format, lorebooks, prompt
  formatting, model backend abstraction, group chats. We reuse it via its HTTP
  API instead of reimplementing.
- The **orchestrator** owns *our* domain: a relational view of
  characters/scenarios/worlds/sessions, the **GM agent loop** (which is *not*
  just "another character" — it has world-state tools), translation, and media.
- The **web app** is a clean, modern UI focused on the roleplay workflow
  (sheet → scenario → session → play), not a generic chat UI.

## Data model (SQLite, v1)

- `characters` — id, name, kind ('pc'|'npc'|'ai'), persona, sheet (JSON), portrait_path, lang
- `worlds` — id, name, summary, lore (JSON: list of lorebook entries)
- `scenarios` — id, world_id, title, hook, opening_scene, tags
- `sessions` — id, scenario_id, gm_model, started_at, state (JSON: turn, scene, flags)
- `session_participants` — session_id, character_id, controller ('human'|'ai'), model
- `messages` — id, session_id, character_id, role, content, lang, audio_path, image_path, created_at

All JSON columns are validated by zod schemas in `packages/shared`.

## GM agent

Runs as a loop in the orchestrator. On each player turn it:
1. Loads recent messages + active scenario/world lore + session state.
2. Calls the GM model (via `st-client`) with a tool-use system prompt
   (`describe_scene`, `roll`, `update_state`, `npc_speak`, `advance_time`).
3. Applies state changes to SQLite and emits messages back to the session.

PC AIs (other characters) are simpler: persona + recent context → reply.

## Adapters

Every external dependency is behind an interface in
`apps/orchestrator/src/adapters/*/index.ts` with one default implementation.
Swap by changing `.env` — no call-site changes.

- **STT**: `WhisperCppAdapter` (POSTs WAV to a local whisper.cpp server)
- **TTS**: `XttsAdapter` (Coqui XTTS HTTP) — Piper/ElevenLabs/Azure later
- **Image**: `SdWebUiAdapter` (AUTOMATIC1111 `/sdapi/v1/txt2img`)
- **LLM**: always goes through `st-client` → SillyTavern → configured backend

## Translation pipeline

`services/translation.ts` exposes `translate(text, from, to)`.
Default impl asks the GM/utility model via `st-client` with a strict prompt.
A message has both `content` (original) and a cached `translations` map so
each participant sees it in their preferred `lang`.

## Out of scope for v1

- Real-time multiplayer transport (Socket.IO/Yjs)
- Full 5e SRD rules engine, character-sheet calculators
- Auth / multi-tenant (local single-user only)
- Cloud deployment, telemetry
