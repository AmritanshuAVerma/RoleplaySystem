"use client";
import { useEffect, useState } from "react";
import type { Scenario, World } from "@rp/shared";
import { api } from "../../lib/api";

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [opening, setOpening] = useState("");
  const [worldId, setWorldId] = useState<string>("");

  async function refresh() {
    const [s, w] = await Promise.all([
      api<Scenario[]>("/scenarios"),
      api<World[]>("/worlds"),
    ]);
    setScenarios(s);
    setWorlds(w);
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    await api("/scenarios", {
      method: "POST",
      body: JSON.stringify({
        title,
        hook,
        openingScene: opening,
        worldId: worldId || undefined,
        tags: [],
        suggestedCharacterIds: [],
      }),
    });
    setTitle("");
    setHook("");
    setOpening("");
    refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">New scenario</h2>
        <input
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          value={worldId}
          onChange={(e) => setWorldId(e.target.value)}
        >
          <option value="">(no world)</option>
          {worlds.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <textarea
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 min-h-24"
          placeholder="One-line hook"
          value={hook}
          onChange={(e) => setHook(e.target.value)}
        />
        <textarea
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 min-h-32"
          placeholder="Opening scene narration"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 disabled:opacity-50"
          onClick={create}
          disabled={!title.trim()}
        >
          Create
        </button>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Scenarios</h2>
        <ul className="space-y-2">
          {scenarios.map((s) => (
            <li key={s.id} className="border border-neutral-800 rounded p-3">
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-neutral-400">{s.hook}</div>
            </li>
          ))}
          {scenarios.length === 0 && (
            <p className="text-neutral-500 text-sm">No scenarios yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
