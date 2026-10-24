"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getIdentity, Identity } from "@/lib/identity";

type Match = { id: number; name: string; why: string; icebreaker: string };
type Msg =
  | { role: "user"; text: string }
  | { role: "agent"; text: string; matches: Match[] };

const SUGGESTIONS = [
  "Who should I meet right now?",
  "Who could give feedback on my project?",
  "Who's working on AI agents like me?",
  "Find me a potential co-founder",
];

export default function Chat() {
  const [me, setMe] = useState<Identity | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<Record<number, { linkedin_url: string | null }>>({});
  const agentIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMe(getIdentity());
    fetch("/api/attendees")
      .then((r) => r.json())
      .then((rows: { id: number; linkedin_url: string | null }[]) => {
        const map: Record<number, { linkedin_url: string | null }> = {};
        rows.forEach((r) => (map[r.id] = { linkedin_url: r.linkedin_url }));
        setPeople(map);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          attendeeId: me?.id ?? null,
          agentId: agentIdRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      agentIdRef.current = data.agentId;
      setMsgs((m) => [
        ...m,
        { role: "agent", text: data.reply, matches: data.matches ?? [] },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "agent",
          text: "Hmm, I hit a snag. Give it another shot.",
          matches: [],
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function save(matchId: number) {
    if (!me) return;
    await fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: me.id, savedId: matchId }),
    });
  }

  return (
    <main className="px-4 pt-6 flex flex-col min-h-[calc(100vh-5rem)]">
      <h1 className="text-2xl font-bold mb-1">Concierge</h1>
      <p className="text-sm text-zinc-500 mb-4">
        {me ? (
          <>Matching for {me.name}</>
        ) : (
          <>
            <Link href="/claim" className="text-emerald-400 underline">
              Claim your profile
            </Link>{" "}
            for personalized matches
          </>
        )}
      </p>

      <div className="flex-1 space-y-4">
        {msgs.length === 0 && (
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 hover:border-emerald-500"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="bg-emerald-500 text-zinc-950 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%]">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-2">
              {m.text && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[90%]">
                  {m.text}
                </div>
              )}
              {m.matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{match.name}</span>
                    <div className="flex gap-3 items-center">
                      {people[match.id]?.linkedin_url && (
                        <a
                          href={people[match.id].linkedin_url!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-400"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                      {me && (
                        <button
                          onClick={() => save(match.id)}
                          className="text-xs bg-zinc-800 rounded-full px-2.5 py-1"
                        >
                          📌 Save
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1.5">{match.why}</p>
                  <p className="text-sm text-emerald-400/90 mt-2 italic">
                    &ldquo;{match.icebreaker}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {busy && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-zinc-500 w-fit animate-pulse">
            Scanning the room…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-16 bg-zinc-950 pt-3 pb-2"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Who should I meet?"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="bg-emerald-500 disabled:opacity-40 text-zinc-950 font-semibold rounded-xl px-4"
          >
            →
          </button>
        </div>
      </form>
    </main>
  );
}
