import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "RoleplaySystem",
  description: "Local-first collaborative roleplay with AI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-neutral-800 px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold">RoleplaySystem</Link>
            <nav className="flex gap-4 text-sm text-neutral-300">
              <Link href="/characters">Characters</Link>
              <Link href="/worlds">Worlds</Link>
              <Link href="/scenarios">Scenarios</Link>
              <Link href="/play">Play</Link>
            </nav>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
