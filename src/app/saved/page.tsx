"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PersonCard, { Person } from "@/components/PersonCard";
import Wordmark from "@/components/Wordmark";
import { Identity, resolveIdentity } from "@/lib/identity";

export default function Saved() {
  const [me, setMe] = useState<Identity | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const id = await resolveIdentity();
      setMe(id);
      if (!id) {
        setLoading(false);
        return;
      }
      const url = new URL(window.location.href);
      if (url.searchParams.get("a") !== String(id.id)) {
        url.searchParams.set("a", String(id.id));
        if (id.event) url.searchParams.set("e", id.event);
        window.history.replaceState(null, "", url.toString());
      }
      fetch(`/api/saves?ownerId=${id.id}`)
        .then((r) => r.json())
        .then(setPeople)
        .finally(() => setLoading(false));
    })();
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
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="flex items-center justify-between mb-5">
        <Wordmark className="text-lg" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-600">
          shortlist
        </span>
      </header>

      {!me && (
        <Link
          href="/claim"
          className="block bg-lime-300 text-black font-semibold rounded-xl px-4 py-3.5 text-center text-sm"
        >
          Claim your profile first
        </Link>
      )}
      {loading && me && <p className="text-zinc-600 text-sm">Loading…</p>}
      {me && !loading && people.length === 0 && (
        <p className="text-zinc-500 text-sm">
          Empty. Ask the{" "}
          <Link href="/chat" className="text-lime-300 underline">
            concierge
          </Link>{" "}
          who&apos;s worth your time.
        </p>
      )}
      <div className="space-y-2.5">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} saved onToggleSave={unsave} />
        ))}
      </div>
    </main>
  );
}
