"use client";
import { useEffect, useState } from "react";
import type { Character } from "@rp/shared";
import { api } from "../../lib/api";

export default function CharactersPage() {
  const [chars, setChars] = useState<Character[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"pc" | "npc" | "ai">("pc");
  const [persona, setPersona] = useState("");
  const [lang, setLang] = useState("en");
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      setChars(await api<Character[]>("/characters"));
    } catch (e) {
      setErr(String(e));
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    setErr(null);
    try {
      await api("/characters", {
        method: "POST",
        body: JSON.stringify({ name, kind, persona, lang, sheet: {} }),
      });
      setName("");
      setPersona("");
      refresh();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function remove(id: string) {
    await api(`/characters/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">New character</h2>
        <input
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as "pc" | "npc" | "ai")}
        >
          <option value="pc">Player Character (human)</option>
          <option value="ai">AI character</option>
          <option value="npc">NPC (GM-controlled)</option>
        </select>
        <textarea
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 min-h-32"
          placeholder="Persona / description"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
        />
        <input
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Language tag (en, hi, ja, ...)"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 disabled:opacity-50"
          onClick={create}
          disabled={!name.trim()}
        >
          Create
        </button>
        {err && <p className="text-red-400 text-sm">{err}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Characters</h2>
        <ul className="space-y-2">
          {chars.map((c) => (
            <li
              key={c.id}
              className="border border-neutral-800 rounded p-3 flex justify-between"
            >
              <div>
                <div className="font-medium">
                  {c.name}{" "}
                  <span className="text-xs text-neutral-400">[{c.kind}]</span>
                </div>
                <div className="text-sm text-neutral-400 line-clamp-2">{c.persona}</div>
              </div>
              <button
                className="text-xs text-red-400 hover:underline"
                onClick={() => remove(c.id)}
              >
                delete
              </button>
            </li>
          ))}
          {chars.length === 0 && (
            <p className="text-neutral-500 text-sm">No characters yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
