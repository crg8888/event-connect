"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PersonCard, { Person } from "@/components/PersonCard";
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
      .then((data) => setPeople(data))
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
    <main className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">
          Who&apos;s here <span className="text-emerald-400">right now</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {people.length} builders checked in at Agent Builders Hackathon
        </p>
      </header>

      {!me && (
        <Link
          href="/claim"
          className="block bg-emerald-500 text-zinc-950 font-semibold rounded-2xl p-4 mb-4 text-center"
        >
          👋 That&apos;s you in the list — claim your profile
        </Link>
      )}
      {me && (
        <p className="text-sm text-zinc-400 mb-4">
          You&apos;re in as <span className="text-emerald-400">{me.name}</span> ·{" "}
          <Link href="/claim" className="underline">
            edit
          </Link>
        </p>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people, skills, companies…"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-emerald-500"
      />

      {loading && <p className="text-zinc-500 text-sm">Loading attendees…</p>}
      <div className="space-y-3">
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
