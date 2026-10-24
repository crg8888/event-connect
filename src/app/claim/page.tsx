"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Person } from "@/components/PersonCard";
import Wordmark from "@/components/Wordmark";
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
      router.push("/chat?welcome=1");
    }
    setBusy(false);
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Wordmark className="text-lg block mb-6" />
      <h1 className="text-xl font-semibold mb-1">Find yourself</h1>
      <p className="text-sm text-zinc-500 mb-5">
        One line about what you want today. The concierge handles the rest.
      </p>

      {!selected ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Your name"
            autoFocus
            name="name"
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <div className="space-y-2">
            {query &&
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="w-full text-left bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 hover:border-lime-300/50"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.headline && (
                    <span className="block text-xs text-zinc-500 mt-0.5">{p.headline}</span>
                  )}
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="bg-zinc-900/60 border border-lime-300/30 rounded-xl px-4 py-3 mb-4">
            <span className="text-sm font-medium">{selected.name}</span>
            {selected.headline && (
              <span className="block text-xs text-zinc-500 mt-0.5">{selected.headline}</span>
            )}
            <button
              onClick={() => setSelected(null)}
              className="text-[11px] text-zinc-600 underline mt-1.5"
            >
              not you?
            </button>
          </div>
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="What do you want today? e.g. two teammates who can ship frontend"
            rows={3}
            name="lookingFor"
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <button
            onClick={submit}
            disabled={busy || !lookingFor.trim()}
            className="w-full mt-4 bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl py-3.5 text-sm"
          >
            {busy ? "One sec" : "Enter the room"}
          </button>
        </>
      )}
    </main>
  );
}
