"use client";
import { useEffect, useRef, useState } from "react";
import type { Character, Message, Scenario, Session } from "@rp/shared";
import { api } from "../../lib/api";

const ORCH = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:4000";

const DEFAULT_GM_MODEL =
  "hf.co/mradermacher/Ministral-Instruct-2410-8B-DPO-RP-GGUF:Q4_K_M";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

export default function PlayPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [chars, setChars] = useState<Character[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [pcId, setPcId] = useState("");
  const [gmModel, setGmModel] = useState(DEFAULT_GM_MODEL);
  const [lang, setLang] = useState("en");
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [autoTts, setAutoTts] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgOpen, setImgOpen] = useState(false);
  const [imgFaceCharId, setImgFaceCharId] = useState("");
  const [imgUseFace, setImgUseFace] = useState(true);
  const [loras, setLoras] = useState<string[]>([]);
  const [pickedLoras, setPickedLoras] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    api<Scenario[]>("/scenarios").then(setScenarios).catch((e) => setErr(String(e)));
    api<Character[]>("/characters").then(setChars).catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function start() {
    if (!scenarioId || !pcId) return;
    setErr(null);
    try {
      const s = await api<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          scenarioId,
          gmModel,
          participants: [{ characterId: pcId, controller: "human", lang }],
        }),
      });
      setSession(s);
      setMessages([]);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr("Only image files");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setErr("Image too large (max 8 MB)");
      return;
    }
    setAttachment({ name: f.name, dataUrl: await fileToDataUrl(f) });
    e.target.value = "";
  }

  async function startRecording() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await transcribeAndFill(blob);
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      setErr("Mic error: " + String(e));
    }
  }

  function stopRecording() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }

  async function transcribeAndFill(blob: Blob) {
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      if (lang) fd.append("lang", lang);
      const res = await fetch(`${ORCH}/media/stt`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`stt ${res.status}: ${await res.text()}`);
      const j = (await res.json()) as { text?: string };
      if (j.text) setDraft((d) => (d ? d + " " + j.text : j.text!));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function speak(text: string) {
    try {
      const res = await fetch(`${ORCH}/media/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) return;
      const j = (await res.json()) as { path?: string };
      if (j.path) new Audio(`${ORCH}${j.path}`).play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!imgOpen || loras.length > 0) return;
    fetch(`${ORCH}/media/loras`)
      .then((r) => r.json())
      .then((j: { loras?: string[] }) => setLoras(j.loras ?? []))
      .catch(() => {
        /* picker is optional */
      });
  }, [imgOpen, loras.length]);

  async function generateImage() {
    const subject = imgPrompt.trim();
    if (!subject) return;
    const loraTags = Object.entries(pickedLoras)
      .map(([name, w]) => `<lora:${name}:${Number.isFinite(w) ? w : 0.7}>`)
      .join(" ");
    const prompt = loraTags ? `${subject}, ${loraTags}` : subject;
    setBusy(true);
    setErr(null);
    try {
      // Optionally fetch the chosen character's portrait and pass it as a face
      // reference so ReActor (if installed in Forge) can lock the identity.
      let faceImageDataUrl: string | undefined;
      if (imgUseFace && imgFaceCharId) {
        const ch = chars.find((c) => c.id === imgFaceCharId);
        if (ch?.portraitPath) {
          try {
            const r = await fetch(`${ORCH}${ch.portraitPath}`);
            if (r.ok) {
              const blob = await r.blob();
              faceImageDataUrl = await new Promise<string>((resolve, reject) => {
                const fr = new FileReader();
                fr.onerror = () => reject(fr.error);
                fr.onload = () => resolve(String(fr.result));
                fr.readAsDataURL(blob);
              });
            }
          } catch {
            /* face-ref is best-effort; fall through to plain gen */
          }
        }
      }
      const res = await fetch(`${ORCH}/media/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          width: 1024,
          height: 1024,
          faceImageDataUrl,
        }),
      });
      if (!res.ok) throw new Error(`image ${res.status}: ${await res.text()}`);
      const j = (await res.json()) as { path?: string };
      if (!j.path) throw new Error("no image returned");
      // Inject as a synthetic GM-side message so it shows inline in the log.
      const synthetic: Message = {
        id: `local-${Date.now()}`,
        sessionId: session?.id ?? "",
        role: "gm",
        content: `(generated) ${prompt}`,
        lang,
        translations: {},
        imagePath: j.path,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, synthetic]);
      setImgPrompt("");
      setImgOpen(false);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!session) return;
    if (!draft.trim() && !attachment) return;
    setBusy(true);
    setErr(null);
    try {
      const out = await api<{ player: Message; gm: Message }>(
        `/sessions/${session.id}/turn`,
        {
          method: "POST",
          body: JSON.stringify({
            characterId: pcId,
            content: draft,
            lang,
            imageDataUrl: attachment?.dataUrl,
          }),
        },
      );
      setMessages((m) => [...m, out.player, out.gm]);
      setDraft("");
      setAttachment(null);
      if (autoTts) void speak(out.gm.content);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="max-w-xl space-y-3">
        <h2 className="text-lg font-semibold">Start a session</h2>
        <select
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
        >
          <option value="">Pick scenario…</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <select
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          value={pcId}
          onChange={(e) => setPcId(e.target.value)}
        >
          <option value="">Pick your character…</option>
          {chars
            .filter((c) => c.kind === "pc")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <input
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="GM model name (must be loadable via SillyTavern/Ollama)"
          value={gmModel}
          onChange={(e) => setGmModel(e.target.value)}
        />
        <input
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Language code (e.g. en, hi, ja)"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 disabled:opacity-50"
          disabled={!scenarioId || !pcId}
          onClick={start}
        >
          Start
        </button>
        {err && <p className="text-red-400 text-sm">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "gm"
                ? "border-l-4 border-amber-500 pl-3"
                : "border-l-4 border-indigo-500 pl-3"
            }
          >
            <div className="text-xs text-neutral-500 uppercase flex items-center gap-2">
              <span>{m.role}</span>
              {m.role === "gm" && (
                <button
                  onClick={() => speak(m.content)}
                  className="text-[10px] underline text-neutral-400 hover:text-neutral-200"
                >
                  speak
                </button>
              )}
            </div>
            {m.imagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${ORCH}${m.imagePath}`}
                alt=""
                className="my-2 max-h-64 rounded border border-neutral-700"
              />
            )}
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {attachment && (
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.dataUrl} alt="" className="h-12 w-12 object-cover rounded" />
          <span className="truncate flex-1">{attachment.name}</span>
          <button
            onClick={() => setAttachment(null)}
            className="text-red-400 hover:text-red-300"
          >
            remove
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <label className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-2 cursor-pointer text-sm">
          📎
          <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        </label>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={
            (recording ? "bg-red-600 hover:bg-red-500" : "bg-neutral-800 hover:bg-neutral-700") +
            " rounded px-3 py-2 text-sm"
          }
          title="Record voice (uses STT)"
        >
          {recording ? "■" : "🎤"}
        </button>
        <button
          onClick={() => setImgOpen((v) => !v)}
          className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-2 text-sm"
          title="Generate an image (requires SD WebUI Forge running)"
        >
          🎨
        </button>
        <input
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Say or do something…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={busy}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 disabled:opacity-50"
          onClick={send}
          disabled={busy || (!draft.trim() && !attachment)}
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
      <label className="mt-2 text-xs text-neutral-400 flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoTts}
          onChange={(e) => setAutoTts(e.target.checked)}
        />
        Auto-speak GM replies
      </label>
      {imgOpen && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
              placeholder="Image prompt (Pony tags work best: score_9, score_8_up, …)"
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateImage();
                }
              }}
              disabled={busy}
            />
            <button
              onClick={generateImage}
              disabled={busy || !imgPrompt.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 rounded px-3 py-2 text-sm disabled:opacity-50"
            >
              Generate
            </button>
          </div>
          <div className="flex gap-2 items-center text-xs text-neutral-400">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={imgUseFace}
                onChange={(e) => setImgUseFace(e.target.checked)}
              />
              Use portrait as face reference
            </label>
            <select
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
              value={imgFaceCharId}
              onChange={(e) => setImgFaceCharId(e.target.value)}
              disabled={!imgUseFace}
            >
              <option value="">— pick character —</option>
              {chars
                .filter((c) => c.portraitPath)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <p className="text-[10px] text-neutral-500">
            Face reference requires ReActor + ADetailer installed in Forge (run
            <code className="px-1">pnpm sd:ext</code>).
          </p>
          {loras.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">Add LoRAs to this image:</p>
              <div className="flex flex-wrap gap-1">
                {loras.map((name) => {
                  const on = name in pickedLoras;
                  const weight = pickedLoras[name] ?? 0.7;
                  return (
                    <span
                      key={name}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${
                        on
                          ? "border-emerald-600 bg-emerald-900/30"
                          : "border-neutral-700 bg-neutral-900"
                      }`}
                    >
                      <button
                        type="button"
                        className="truncate max-w-[14rem]"
                        onClick={() =>
                          setPickedLoras((p) => {
                            const next = { ...p };
                            if (on) delete next[name];
                            else next[name] = 0.7;
                            return next;
                          })
                        }
                        title={name}
                      >
                        {on ? "✓ " : "+ "}
                        {name}
                      </button>
                      {on && (
                        <input
                          type="number"
                          step={0.05}
                          min={-2}
                          max={2}
                          value={weight}
                          onChange={(e) =>
                            setPickedLoras((p) => ({
                              ...p,
                              [name]: Number(e.target.value),
                            }))
                          }
                          className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1 text-[11px]"
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {loras.length === 0 && imgOpen && (
            <p className="text-[10px] text-neutral-500">
              No LoRAs found in <code>{`models/Lora/`}</code>. Drop
              <code className="px-1">.safetensors</code> files there and reopen this panel.
            </p>
          )}
        </div>
      )}
      {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
    </div>
  );
}
