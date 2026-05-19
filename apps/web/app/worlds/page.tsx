"use client";
import { useEffect, useState } from "react";
import type { World } from "@rp/shared";
import { api } from "../../lib/api";

export default function WorldsPage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");

  async function refresh() {
    setWorlds(await api<World[]>("/worlds"));
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    await api("/worlds", {
      method: "POST",
      body: JSON.stringify({ name, summary, lore: [] }),
    });
    setName("");
    setSummary("");
    refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">New world</h2>
        <input
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Name (e.g. Faerûn-lite)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 min-h-40"
          placeholder="One-paragraph summary of the setting"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 disabled:opacity-50"
          onClick={create}
          disabled={!name.trim()}
        >
          Create
        </button>
        <p className="text-xs text-neutral-500">
          Lorebook entries can be added via PATCH /worlds/:id once the editor UI lands.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Worlds</h2>
        <ul className="space-y-2">
          {worlds.map((w) => (
            <li key={w.id} className="border border-neutral-800 rounded p-3">
              <div className="font-medium">{w.name}</div>
              <div className="text-sm text-neutral-400">{w.summary}</div>
            </li>
          ))}
          {worlds.length === 0 && (
            <p className="text-neutral-500 text-sm">No worlds yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
