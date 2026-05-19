export default function HomePage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">RoleplaySystem</h1>
      <p className="text-neutral-300">
        Local-first collaborative roleplay. One human + multiple AI characters,
        with a dedicated GM agent. SillyTavern is the model backend.
      </p>
      <ol className="list-decimal pl-6 space-y-1 text-neutral-300 text-sm">
        <li>Create a <a className="underline" href="/worlds">world</a> (setting + lorebook).</li>
        <li>Create <a className="underline" href="/characters">characters</a> (PCs and AIs).</li>
        <li>Create a <a className="underline" href="/scenarios">scenario</a>.</li>
        <li>Start a session in <a className="underline" href="/play">Play</a>.</li>
      </ol>
    </div>
  );
}
