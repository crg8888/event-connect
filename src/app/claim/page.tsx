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
  const [email, setEmail] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [eventSlug, setEventSlug] = useState<string | undefined>(undefined);
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    const slug =
      new URLSearchParams(window.location.search).get("e") ??
      getIdentity()?.event ??
      undefined;
    setEventSlug(slug);
    fetch(`/api/attendees${slug ? `?e=${encodeURIComponent(slug)}` : ""}`)
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
    if (!selected || !email.trim() || !lookingFor.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: selected.id,
        email: email.trim(),
        lookingFor: lookingFor.trim(),
      }),
    });
    if (res.ok) {
      setIdentity(selected.id, selected.name, eventSlug);
      const q = new URLSearchParams();
      if (eventSlug) q.set("e", eventSlug);
      q.set("a", String(selected.id));
      q.set("welcome", "1");
      router.push(`/chat?${q.toString()}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not claim this profile.");
      setBusy(false);
    }
  }

  async function submitGuest() {
    if (!guestName.trim() || !email.trim() || !lookingFor.trim() || !eventSlug) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/claim/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: guestName.trim(),
        email: email.trim(),
        eventSlug,
        lookingFor: lookingFor.trim(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setIdentity(data.id, data.name, eventSlug);
      const q = new URLSearchParams();
      if (eventSlug) q.set("e", eventSlug);
      q.set("a", String(data.id));
      q.set("welcome", "1");
      router.push(`/chat?${q.toString()}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not join as guest.");
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Wordmark className="text-lg block mb-6" />
      <h1 className="text-xl font-semibold mb-1">Find yourself</h1>
      <p className="text-sm text-zinc-500 mb-5">
        One line about what you want today. The concierge handles the rest.
      </p>

      {guestMode ? (
        <>
          <button
            onClick={() => {
              setGuestMode(false);
              setError("");
            }}
            className="text-[11px] text-zinc-600 underline mb-4"
          >
            ← back to the guest list
          </button>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="What do you want today?"
            rows={3}
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <button
            onClick={submitGuest}
            disabled={busy || !guestName.trim() || !email.trim() || !lookingFor.trim()}
            className="w-full mt-4 bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl py-3.5 text-sm"
          >
            {busy ? "One sec" : "Join as guest"}
          </button>
        </>
      ) : !selected ? (
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
          <button
            onClick={() => setGuestMode(true)}
            className="w-full text-left mt-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3 hover:border-lime-300/50"
          >
            <span className="text-sm font-medium text-zinc-300">Not on the list?</span>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Join as a guest with your name and email.
            </span>
          </button>
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
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="The email you RSVP'd with"
            autoComplete="email"
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="What do you want today? e.g. two teammates who can ship frontend"
            rows={3}
            name="lookingFor"
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !email.trim() || !lookingFor.trim()}
            className="w-full mt-4 bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl py-3.5 text-sm"
          >
            {busy ? "One sec" : "Enter the room"}
          </button>
        </>
      )}
    </main>
  );
}
