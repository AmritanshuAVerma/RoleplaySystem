# RoleplaySystem — User Guide

A practical walkthrough for actually using the system. For architecture & internals see
[ARCHITECTURE.md](ARCHITECTURE.md); for setup-only details see [README.md](README.md).

---

## 1. What this is

A local-first roleplay platform where **you (one human)** play alongside one or more
**AI characters** with a dedicated **AI Game Master** running the scene. Everything
runs on your machine: SillyTavern + Ollama for the LLMs, optional whisper.cpp/XTTS for
voice, optional Stable Diffusion WebUI for images.

The custom web UI on top of SillyTavern gives you:

- **Worlds** — setting, lore, factions, rules
- **Characters** — playable PCs + NPCs, with sheet/persona/portrait
- **Scenarios** — the campaign hook (premise, characters in scene, opening narration)
- **Sessions** — actual play, with text + images + voice in any language

---

## 2. First-time setup

### Install once

1. Install [Node.js 20+](https://nodejs.org) and [Ollama](https://ollama.com/download).
2. Pull the three models the project expects:

   ```powershell
   ollama pull hf.co/mradermacher/Ministral-Instruct-2410-8B-DPO-RP-GGUF:Q4_K_M
   ollama pull huihui_ai/qwen3-vl-abliterated:4b
   ollama create rp-vision:4b -f models/rp-vision.Modelfile
   ```

3. (Optional) Install voice/image backends if you want STT, TTS or image generation:
   - **STT**: [whisper.cpp server](https://github.com/ggerganov/whisper.cpp) on port 8081
   - **TTS**: [XTTS server](https://github.com/coqui-ai/TTS) on port 8020, or swap to Piper
   - **Image gen**: [SD WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) on port 7860 with `--api`

   These are all optional — text + image-understanding works without them.

### Start the stack

Double-click [start.bat](start.bat). On first run it will:

- install pnpm if missing
- run `pnpm install`
- clone & install SillyTavern under `vendor/SillyTavern`
- copy `.env.example` → `.env`
- launch the Ollama daemon (if not already running)
- open three windows: **SillyTavern** (8000), **Orchestrator** (4000), **Web** (3000)

Open http://localhost:3000 once all three windows say they're ready.

### One-time SillyTavern wiring

Go to http://127.0.0.1:8000 → **API connections** (plug icon, top bar):

- API: **Text Completion**
- Type: **Ollama**
- Server URL: `http://127.0.0.1:11434`
- Click **Connect**, pick `hf.co/mradermacher/Ministral-Instruct-2410-8B-DPO-RP-GGUF:Q4_K_M`

You only do this once — SillyTavern remembers it.

---

## 3. Daily use

### Start everything

Double-click [start.bat](start.bat). Three windows pop up; wait until each prints
its "ready"/"listening" line, then open http://localhost:3000.

### Stop everything

Close each of the three windows (and the minimized Ollama window if you want to free
VRAM).

---

## 4. Building your game

Recommended order: **World → Characters → Scenario → Session**.

### 4.1 Create a World — `/worlds`

The world is the shared lore that every character and scenario sits inside.

| Field | What to put |
|---|---|
| Name | "The Sundered Reach", "Neo-Bombay 2087", "Generic Fantasy" |
| Summary | 1–2 sentence elevator pitch the GM reads first |
| Lore | Long-form background, factions, regions, technology, magic rules |
| Tags | Free-form, used for filtering |

The lore field is sent to the GM as system context, so put anything the GM should treat
as ground truth here.

### 4.2 Create Characters — `/characters`

Make at least:

- **One PC for yourself** (mark as player-controlled)
- **One or more NPCs** the GM can speak as

| Field | Notes |
|---|---|
| Name | Display name |
| Persona | First-person voice + personality. This is what the AI uses to "be" the character. |
| Sheet | Stats / class / inventory — freeform JSON or text |
| Portrait | Optional image URL or upload |
| Controlled by | `player` for your PC, `ai` for NPCs |

### 4.3 Create a Scenario — `/scenarios`

The scenario binds a world + a roster of characters into a runnable adventure.

| Field | Notes |
|---|---|
| Title | "The Caravan Job" |
| World | Pick one of the worlds you made |
| Premise | The setup the GM uses to open the scene |
| Opening narration | Optional — exact text the GM speaks first |
| Cast | Characters in the scene (your PC + the NPCs) |

### 4.4 Start a Session — `/play`

From the scenario page, click **Start session** (or go to `/play` and pick one).

---

## 5. The Play screen

Top of the screen:

- **Scenario / model dropdown** — pick the GM model. Default is the Ministral-RP model
  configured in `.env`.
- **Language** — language code (`en`, `hi`, `es`, `ja`, …). Used by STT and TTS;
  the GM is also nudged to reply in that language.
- **Auto-speak GM replies** — if checked, every GM reply is sent to the TTS adapter
  and played back automatically. Requires a TTS backend running.

Message list:

- Player and GM messages alternate. Any image you attach shows inline.
- Each GM message has a 🔊 **speak** button to TTS that single reply on demand.

Composer (bottom):

- **📎** — attach an image (PNG/JPEG/WebP/GIF, max 8 MB). It shows as a removable
  thumbnail. When you send, the orchestrator routes the image to the **vision model**
  (`rp-vision:4b`) to get a caption, and injects that caption as system context for
  the GM. So even though the GM model is text-only, it "sees" what you sent.
- **🎤** — start/stop browser recording. On stop, the clip is POSTed to `/media/stt`
  and the transcript drops into the text box (you can edit before sending).
- **🎨** — toggle the image-gen panel. Type a prompt, press **Generate**, and the
  orchestrator asks SD WebUI Forge to produce an image, which appears inline as a
  GM-side message. Requires Forge running (see §9). Pony-style score tags work
  best.
- **Text box** — what your character says or does. Out-of-character notes in `(parens)`
  are a convention the GM is told to respect.
- **Send** — posts the turn. The GM call streams back as one message.

### Typical turn

1. Type "*I push open the tavern door and scan the room.*"
2. Attach a reference image of the tavern (optional).
3. Send.
4. GM replies with what you see, what NPCs do, and any prompts back to you.
5. If auto-speak is on, you hear it spoken; otherwise click 🔊.

---

## 6. Configuration cheat sheet

Edit `.env` (created from `.env.example` on first run):

| Key | Purpose |
|---|---|
| `PORT` | Orchestrator port (default 4000) |
| `DATA_DIR` | Where uploads + SQLite live (default `./data`) |
| `ST_BASE_URL` | SillyTavern address (default `http://127.0.0.1:8000`) |
| `LLM_DEFAULT_MODEL` | Fallback chat model |
| `LLM_GM_MODEL` | Model the GM agent uses |
| `LLM_UTILITY_MODEL` | Used for translation / summarisation |
| `LLM_VISION_MODEL` | Used for image understanding (default `rp-vision:4b`) |
| `STT_PROVIDER` / `WHISPER_CPP_URL` | Voice → text backend |
| `TTS_PROVIDER` / `XTTS_URL` | Text → voice backend |
| `IMAGE_PROVIDER` / `SDWEBUI_URL` | Image generation backend |
| `NEXT_PUBLIC_ORCHESTRATOR_URL` | Where the web UI calls the orchestrator |

Restart the orchestrator window after changing `.env`.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **GM replies are empty or 500s** | SillyTavern isn't connected to Ollama — redo §2 "One-time SillyTavern wiring". |
| **`ECONNREFUSED 127.0.0.1:11434`** | Ollama daemon isn't running. Open a terminal and run `ollama serve`, or re-run [start.bat](start.bat). |
| **Image upload returns 413** | File over 8 MB. Resize it. |
| **Image upload returns 400 "invalid imageDataUrl"** | The browser didn't produce a `data:image/...;base64,...` URL — try a different file. |
| **Mic button does nothing** | Browser blocked microphone access. Click the lock icon in the address bar and allow mic. |
| **TTS doesn't play** | No TTS backend running on `XTTS_URL`. Either start XTTS or uncheck auto-speak. |
| **Vision answers feel generic** | Model is loaded CPU-only because something else is using VRAM. Close other GPU apps; the `rp-vision:4b` alias is tuned for an 8 GB card. |
| **Web UI shows "Failed to fetch"** | Orchestrator window crashed. Check that window for the stack trace; usually `.env` or DB path. |
| **`start.bat` says pnpm not found** | Let it install pnpm (allow the npm prompt), or `npm i -g pnpm@9` once manually. |
| **Port already in use (3000/4000/8000)** | Something else is bound. Either kill that process or change the port in `.env` (orchestrator) / `apps/web/package.json` (web). |

---

## 8. What's deferred (not in this build)

These are intentional gaps — the system is built to grow into them later:

- Real-time multi-human rooms (only single human + multiple AI today)
- Full D&D 5e SRD rules engine + dice automation
- GM **tool-use loop** (`describe_scene` / `roll` / `update_state` / `npc_speak`) —
  current GM is a single-shot chat completion
- SillyTavern character-card import
- Cloud / multi-user deployment

If you want one of these next, open a GitHub-style issue locally or just ask.

---

## 9. Image generation (Pony Realism on SD WebUI Forge)

The `🎨` button on the Play screen calls the orchestrator's `/media/image` endpoint,
which talks to **Stable Diffusion WebUI Forge** on `http://127.0.0.1:7860`. Forge is
vendored locally under `vendor/sd-webui-forge` and started automatically by
[start.bat](start.bat) (after one-time setup below).

### 9.1 Install Forge (one time)

```powershell
pnpm sd:setup    # clones Forge into vendor/sd-webui-forge
```

The first time `pnpm sd` (or [start.bat](start.bat)) launches Forge, it downloads
its own Python venv + PyTorch (~5 GB). Subsequent launches are fast.

> **Python note:** Forge needs Python **3.10 or 3.11** (torch 2.3.1 has no wheels
> for 3.12+). `pnpm sd:setup` auto-detects an installed 3.10/3.11 via the `py`
> launcher and pins `vendor/sd-webui-forge/webui-user.bat` to it. If neither is
> installed, grab [Python 3.10.11](https://www.python.org/downloads/release/python-31011/)
> (tick "Add to PATH" or just install the py launcher), re-run `pnpm sd:setup`,
> and delete `vendor/sd-webui-forge/venv/` if it was already created with the
> wrong Python.

### 9.2 Download Pony Realism + LoRAs

Go to each link below, click **Download** (you need a free Civitai login, and an
API key for some files), and drop the resulting `.safetensors` into the indicated
folder under `vendor/sd-webui-forge/`.

**Checkpoint** — put into `models/Stable-diffusion/`:

| Model | URL | Size |
|---|---|---|
| **Pony Realism v2.2** (default, most stable) | https://civitai.com/models/372465?modelVersionId=914390 | 6.62 GB |
| Pony Realism v2.3 (latest, optional) | https://civitai.com/models/372465 → pick v2.3 | 6.62 GB |

**Recommended LoRAs** (all by the same author) — put into `models/Lora/`:

| LoRA | URL | Purpose |
|---|---|---|
| Pony Realism Enhancer | https://civitai.com/models/927305/pony-realism-enhancer | Sharpens detail, recommended weight 0.6–0.9 |
| Pony Skin Enhancer | https://civitai.com/models/1371405/pony-skin-enhancer | Photoreal skin texture, weight ~0.6 |
| Pony Amateur | https://civitai.com/models/480835/pony-amateur | Casual / amateur-photo aesthetic, weight ~0.7 |
| Background Detail Enhancer | https://civitai.com/models/633524/background-detail-enhancer | Richer environments, weight ~0.5 |
| Cinematic Shot | https://civitai.com/models/432586/cinematic-shot | Filmic composition + lighting, weight ~0.6 |

Forge picks them up on next launch (no restart needed if it's already running — use
the 🔄 refresh icon next to the checkpoint/LoRA dropdowns).

### 9.3 Configure SillyTavern to use Forge

In the SillyTavern UI (http://127.0.0.1:8000) → **Extensions → Image Generation**:

- Source: **Stable Diffusion WebUI (AUTOMATIC1111)** — Forge speaks the same API
- URL: `http://127.0.0.1:7860`
- Click **Connect** → the checkpoint dropdown should list Pony Realism
- Pick it. Default sampler **Euler A** or **DPM++ 2M SDE Karras**, steps **30**,
  CFG **6–7**, resolution **1024×1024** or **832×1216**.

### 9.4 Prompting (Pony-style)

The orchestrator **auto-prepends** the Pony score tags and **auto-appends** the
default LoRA stack to every generation, driven by three `.env` keys:

| Env var | Default |
|---|---|
| `IMAGE_DEFAULT_POSITIVE` | `score_9, score_8_up, score_7_up, BREAK` |
| `IMAGE_DEFAULT_NEGATIVE` | `score_4, score_5, score_6, (worst quality, low quality:1.3), bad anatomy, deformed, extra fingers, blurry` |
| `IMAGE_DEFAULT_LORAS` | `pony_realism_enhancer:0.7,pony_skin_enhancer:0.6` |

So you only need to type the actual subject:

```
a tired ranger in a rain-soaked tavern doorway, lantern light, cinematic
```

…and the final prompt sent to Forge becomes:

```
score_9, score_8_up, score_7_up, BREAK, a tired ranger in a rain-soaked tavern doorway, lantern light, cinematic, <lora:pony_realism_enhancer:0.7> <lora:pony_skin_enhancer:0.6>
```

To add/remove a LoRA project-wide, edit `IMAGE_DEFAULT_LORAS` (format
`name:weight,name:weight,...`; weight defaults to 0.7 if omitted) and restart
the orchestrator. The LoRA file must exist at
`vendor/sd-webui-forge/models/Lora/<name>.safetensors`.

Use "female" / "male" rather than "woman" / "man" (Pony's tagging convention).

### 9.5 Using image gen in a session

1. Click 🎨 on the Play toolbar
2. Type a prompt (Pony tags work best, see 9.4)
3. Press **Generate** — the image is requested from Forge via the orchestrator and
   shows up inline as a GM-side message, captioned `(generated) <your prompt>`
4. The vision model can then react to it in subsequent turns if you reference it

If Forge isn't running, the request returns a 502 and you'll see the error under
the composer.

### 9.6 Keeping a character's face consistent across images

By default Pony will roll a new face every time. To lock identity to one of your
characters, install **ReActor** (face swap) + **ADetailer** (face inpaint) — both
are auto-installed by [scripts/setup-forge-extensions.ps1](scripts/setup-forge-extensions.ps1),
which runs as part of `pnpm sd:setup` and on first [start.bat](start.bat).

To install or re-install them manually:

```powershell
pnpm sd:ext
```

On Forge's next launch it will pip-install `onnxruntime-gpu` + `insightface` (~2 min)
and the first generation downloads `inswapper_128.onnx` (~530 MB) automatically.

**Per-character setup:** open the character on `/characters` and make sure it has a
**portrait** (front-facing, well-lit, single face). This is the reference image
ReActor will use.

**In the 🎨 panel on `/play`:**
- ✅ Tick **"Use portrait as face reference"**
- Pick the character from the dropdown
- Hit **Generate**

Behind the scenes the orchestrator forwards the portrait as base64 to Forge under
`alwayson_scripts.reactor.args`, then `ADetailer` inpaints the face region at
denoise 0.4 with `face_yolov8n.pt` to clean up the swap.

**Quality tips:**
- Front-facing reference works far better than profile shots
- Match the reference resolution to the generation (1024² is the sweet spot)
- For 100% identity, train a **LoRA** of the character (~30 min on a 5060 with
  `kohya_ss`) and add `<lora:my_character:0.8>` to the prompt — that's the highest
  fidelity option but only worth the effort for recurring main characters

> **Consent reminder:** ReActor uses InsightFace. Use it only on faces you own,
> have explicit consent for, or that are clearly fictional. Don't generate
> deepfakes of real people.
