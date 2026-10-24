"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Person } from "@/components/PersonCard";
import { getIdentity, setIdentity } from "@/lib/identity";

export default function Claim() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [lookingFor, setLookingFor] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/attendees")
      .then((r) => r.json())
      .then((data: Person[]) => {
        setPeople(data);
        const me = getIdentity();
        if (me) {
          const p = data.find((x) => x.id === me.id);
          if (p) {
            setSelected(p);
            setLookingFor(p.looking_for ?? "");
          }
        }
      });
  }, []);

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  async function submit() {
    if (!selected || !lookingFor.trim()) return;
    setBusy(true);
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeId: selected.id, lookingFor: lookingFor.trim() }),
    });
    if (res.ok) {
      setIdentity(selected.id, selected.name);
      router.push("/chat");
    }
    setBusy(false);
  }

  return (
    <main className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-1">Claim your profile</h1>
      <p className="text-sm text-zinc-500 mb-4">
        Pick yourself, say what you&apos;re after today, and the concierge starts
        matching you with the right people.
      </p>

      {!selected ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your name…"
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-emerald-500"
          />
          <div className="space-y-2">
            {query &&
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-emerald-500"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.headline && (
                    <span className="block text-xs text-zinc-500">{p.headline}</span>
                  )}
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="bg-zinc-900 border border-emerald-500/50 rounded-xl px-4 py-3 mb-4">
            <span className="font-medium">{selected.name}</span>
            {selected.headline && (
              <span className="block text-xs text-zinc-500">{selected.headline}</span>
            )}
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-zinc-500 underline mt-1"
            >
              not you?
            </button>
          </div>
          <label className="block text-sm font-medium mb-2">
            What are you looking for today?
          </label>
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="e.g. a technical co-founder who knows voice agents, or feedback on my devtool idea"
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={submit}
            disabled={busy || !lookingFor.trim()}
            className="w-full mt-4 bg-emerald-500 disabled:opacity-40 text-zinc-950 font-semibold rounded-2xl py-3.5"
          >
            {busy ? "Saving…" : "Start matching →"}
          </button>
        </>
      )}
    </main>
  );
}
