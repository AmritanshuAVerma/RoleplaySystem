# RoleplaySystem

A local-first roleplay platform for D&D-style (and freeform) collaborative storytelling
between **one human and multiple AI characters**, with a dedicated **GM/DM AI agent**,
multi-language support, and pluggable **text / image / audio** I/O.

**SillyTavern** runs as the LLM/character engine behind the scenes. This project is the
domain layer (characters, scenarios, worlds, sessions, GM agent, translation, media)
and a custom UI built on top.

> Status: **v1 complete**. End-to-end text/image/audio multi-language roleplay works
> against locally-running models. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Stack

- **pnpm workspaces** monorepo, TypeScript everywhere
- `apps/web` — Next.js 15 (App Router) + Tailwind
- `apps/orchestrator` — Node + Express + better-sqlite3, owns all domain logic
- `packages/shared` — zod schemas + types shared by web & orchestrator
- `packages/st-client` — typed client for the SillyTavern HTTP API
- Local providers (default): **Ollama** (LLM via ST), **whisper.cpp** (STT),
  **XTTS / Piper** (TTS), **Stable Diffusion WebUI / ComfyUI** (image gen)

## Prerequisites

- Node 20+, pnpm 9+
- Git (for the SillyTavern clone)
- A local LLM backend — **Ollama** recommended (https://ollama.com/download)
- Optional: whisper.cpp server, XTTS / Piper, SD WebUI / ComfyUI

## Quick start

SillyTavern is vendored locally under `vendor/SillyTavern` (cloned by
`scripts/setup-sillytavern.ps1`, ignored by git).

```powershell
pnpm install
pnpm st:setup          # clones + npm-installs SillyTavern under vendor/ (skip if already done)
Copy-Item .env.example .env
pnpm st                # terminal 1: SillyTavern on http://127.0.0.1:8000
pnpm dev               # terminal 2: web + orchestrator
```

- SillyTavern UI:     http://127.0.0.1:8000
- Web UI:             http://localhost:3000
- Orchestrator API:   http://localhost:4000

### Pulling local models (Ollama)

SillyTavern itself ships no model weights. With Ollama installed:

```powershell
# Roleplay-tuned 8B (default GM / chat / utility model — already pulled in this repo)
ollama pull hf.co/mradermacher/Ministral-Instruct-2410-8B-DPO-RP-GGUF:Q4_K_M

# Vision-capable uncensored 4B (used for image inputs)
ollama pull huihui_ai/qwen3-vl-abliterated:4b

# Build the tuned vision alias (pins ctx for full-GPU offload on 8 GB cards)
ollama create rp-vision:4b -f models/rp-vision.Modelfile
```

In SillyTavern: **API → Text Completion → Ollama**, URL `http://127.0.0.1:11434`,
pick the model. The model names in `.env` (`LLM_DEFAULT_MODEL`, `LLM_GM_MODEL`,
`LLM_UTILITY_MODEL`, `LLM_VISION_MODEL`) must match Ollama tags exactly.

## What's in v1

- Character creation & management (sheet, persona, portrait)
- Scenario / campaign creation & management
- World / background / lorebook management
- GM/DM AI agent (separate model + system prompt from PC AIs)
- Multi-language UI + translation pipeline (utility-LLM driven)
- Single human + multiple AI in a session (multi-human deferred)
- **Multimodal play:** image attachments routed to the vision model;
  in-browser mic → STT; per-message TTS playback with auto-speak toggle

## What's deferred

- Real-time multi-human rooms (WebSocket/CRDT)
- Full D&D 5e SRD rules engine + dice
- GM tool-use loop (describe_scene / roll / update_state / npc_speak)
- SillyTavern character-card import
- Cloud deployment
