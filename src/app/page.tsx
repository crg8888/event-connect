"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PersonCard, { Person } from "@/components/PersonCard";
import Wordmark from "@/components/Wordmark";
import { getIdentity, Identity } from "@/lib/identity";

export default function Directory() {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<Identity | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getIdentity();
    setMe(id);
    fetch("/api/attendees")
      .then((r) => r.json())
      .then(setPeople)
      .finally(() => setLoading(false));
    if (id) {
      fetch(`/api/saves?ownerId=${id.id}`)
        .then((r) => r.json())
        .then((rows: Person[]) => setSavedIds(new Set(rows.map((r) => r.id))));
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return people.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.headline ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [people, query]);

  async function toggleSave(p: Person) {
    if (!me) return;
    const isSaved = savedIds.has(p.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    await fetch("/api/saves", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: me.id, savedId: p.id }),
    });
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="flex items-center justify-between mb-5">
        <Wordmark className="text-lg" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-600">
          {people.length} in the room
        </span>
      </header>

      {!me ? (
        <Link
          href="/claim"
          className="block bg-lime-300 text-black font-semibold rounded-xl px-4 py-3.5 mb-4 text-center text-sm"
        >
          You&apos;re on this list — claim your profile
        </Link>
      ) : (
        <p className="text-xs text-zinc-500 mb-4">
          In as <span className="text-lime-300">{me.name}</span>
          <Link href="/claim" className="ml-2 text-zinc-600 underline">
            edit
          </Link>
        </p>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the room"
        className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
      />

      {loading && <p className="text-zinc-600 text-sm">Loading…</p>}
      <div className="space-y-2.5">
        {filtered.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            saved={savedIds.has(p.id)}
            onToggleSave={me ? toggleSave : undefined}
          />
        ))}
      </div>
    </main>
  );
}
