"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PersonCard, { Person } from "@/components/PersonCard";
import { getIdentity, Identity } from "@/lib/identity";

export default function Saved() {
  const [me, setMe] = useState<Identity | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getIdentity();
    setMe(id);
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/saves?ownerId=${id.id}`)
      .then((r) => r.json())
      .then(setPeople)
      .finally(() => setLoading(false));
  }, []);

  async function unsave(p: Person) {
    if (!me) return;
    setPeople((prev) => prev.filter((x) => x.id !== p.id));
    await fetch("/api/saves", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: me.id, savedId: p.id }),
    });
  }

  return (
    <main className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-1">Saved people</h1>
      <p className="text-sm text-zinc-500 mb-4">
        Your shortlist for today — go say hi before they leave.
      </p>

      {!me && (
        <Link
          href="/claim"
          className="block bg-emerald-500 text-zinc-950 font-semibold rounded-2xl p-4 text-center"
        >
          Claim your profile to start saving people
        </Link>
      )}
      {loading && me && <p className="text-zinc-500 text-sm">Loading…</p>}
      {me && !loading && people.length === 0 && (
        <p className="text-zinc-500 text-sm">
          Nothing saved yet. Ask the{" "}
          <Link href="/chat" className="text-emerald-400 underline">
            concierge
          </Link>{" "}
          who you should meet.
        </p>
      )}
      <div className="space-y-3">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} saved onToggleSave={unsave} />
        ))}
      </div>
    </main>
  );
}
