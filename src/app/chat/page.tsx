"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { getIdentity, Identity } from "@/lib/identity";

type Match = { id: number; name: string; why: string; icebreaker: string };
type PingOut = { recipientId: number; message: string };
type PingIn = {
  id: number;
  message: string;
  created_at: string;
  sender_id: number;
  sender_name: string;
  sender_headline: string | null;
  sender_linkedin: string | null;
  sender_wants: string | null;
};
type Msg =
  | { role: "user"; text: string }
  | { role: "agent"; text: string; matches: Match[]; pings: PingOut[] }
  | { role: "ping"; ping: PingIn };

const FALLBACK_SUGGESTIONS = [
  "Help me find interesting people",
  "Who's working on voice agents?",
  "Who should I meet for feedback?",
];

function fillTemplate(template: string, firstName: string) {
  return template.replace(/\{first_name\}/gi, firstName);
}

function ChatInner() {
  const params = useSearchParams();
  const [me, setMe] = useState<Identity | null>(null);
  const [agentName, setAgentName] = useState("Hacky");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pingHint, setPingHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenPingRef = useRef<number>(0);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [people, setPeople] = useState<
    Record<number, { linkedin_url: string | null; looking_for: string | null }>
  >({});
  const agentIdRef = useRef<string | null>(null);
  const welcomedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getIdentity();
    setMe(id);
    const slug = id?.event ?? new URLSearchParams(window.location.search).get("e");

    fetch(`/api/attendees${slug ? `?e=${encodeURIComponent(slug)}` : ""}`)
      .then((r) => r.json())
      .then(
        (rows: {
          id: number;
          linkedin_url: string | null;
          looking_for: string | null;
        }[]) => {
          const map: Record<
            number,
            { linkedin_url: string | null; looking_for: string | null }
          > = {};
          rows.forEach((r) => (map[r.id] = {
            linkedin_url: r.linkedin_url,
            looking_for: r.looking_for,
          }));
          setPeople(map);
        }
      );

    fetch(`/api/event${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`)
      .then((r) => r.json())
      .then((ev) => {
        if (!ev) return;
        if (ev.agent_name) setAgentName(ev.agent_name);
        if (params.get("welcome") === "1" && id && !welcomedRef.current) {
          welcomedRef.current = true;
          const firstName = id.name.split(" ")[0] || id.name;
          const template =
            ev.welcome_template ??
            `Hey {first_name} — I'm ${ev.agent_name ?? "Hacky"}. Ask me who to meet.`;
          setMsgs([
            {
              role: "agent",
              text: fillTemplate(template, firstName),
              matches: [],
              pings: [],
            },
          ]);
        }
      });

    if (id) {
      fetch(`/api/saves?ownerId=${id.id}`)
        .then((r) => r.json())
        .then((rows: { id: number }[]) =>
          setSavedIds(new Set(rows.map((r) => r.id)))
        );
      setSuggestionsLoading(true);
      fetch(`/api/suggestions/mine?id=${id.id}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));

      // seed lastSeenPingRef so existing unread pings surface as cards on first load
      // and poll for new ones every 7s
      const poll = async () => {
        try {
          const d = await fetch(`/api/pings/mine?id=${id.id}`).then((r) => r.json());
          const incoming: PingIn[] = Array.isArray(d.pings) ? d.pings : [];
          const fresh = incoming
            .filter((p) => p.id > lastSeenPingRef.current)
            .sort((a, b) => a.id - b.id);
          if (fresh.length) {
            lastSeenPingRef.current = fresh[fresh.length - 1].id;
            setMsgs((m) => [...m, ...fresh.map((p) => ({ role: "ping" as const, ping: p }))]);
            fetch(`/api/pings/read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipientId: id.id }),
            }).catch(() => {});
          }
        } catch {}
      };
      poll();
      const pingTimer = setInterval(poll, 7000);
      return () => clearInterval(pingTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(question: string) {
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
        {
          role: "agent",
          text: data.reply,
          matches: data.matches ?? [],
          pings: data.pings ?? [],
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "agent", text: "Hiccup on my end. Ask again.", matches: [], pings: [] },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setInput("");
    setPingHint(null);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    await send(question);
  }

  function startPing(matchName: string) {
    const prefix = `Ping ${matchName} and tell them I'm `;
    setInput(prefix);
    setPingHint(
      "Say the spot — e.g. the entrance, the dining area, the main stage, the bar"
    );
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(prefix.length, prefix.length);
      }
    });
  }

  async function toggleSave(matchId: number) {
    if (!me) return;
    const isSaved = savedIds.has(matchId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
    await fetch("/api/saves", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: me.id, savedId: matchId }),
    });
  }

  const canShowSuggestions = msgs.length <= 1 && !busy;

  return (
    <main className="max-w-md mx-auto h-screen flex flex-col pb-16">
      <header className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3 bg-black">
        <div>
          <Wordmark className="text-lg" />
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">
            with {agentName.toLowerCase()}
          </p>
        </div>
        <div className="text-right">
          {me ? (
            <span className="text-[11px] uppercase tracking-widest text-zinc-500">
              {me.name.split(" ")[0]}
            </span>
          ) : (
            <Link
              href="/claim"
              className="text-[11px] uppercase tracking-widest text-lime-300"
            >
              claim profile
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.map((m, i) =>
          m.role === "ping" ? (
            <div key={i} className="bg-lime-300/5 border border-lime-300/40 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-widest text-lime-300 font-semibold">
                    ping · {m.ping.sender_name}
                  </span>
                </div>
                {m.ping.sender_linkedin && (
                  <a
                    href={m.ping.sender_linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-lime-300"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
              {m.ping.sender_headline && (
                <p className="text-[11px] text-zinc-500 mt-0.5">{m.ping.sender_headline}</p>
              )}
              <p className="text-sm text-zinc-100 mt-2">&ldquo;{m.ping.message}&rdquo;</p>
              {m.ping.sender_wants && (
                <p className="text-[12px] text-lime-300/70 mt-1.5">
                  → {m.ping.sender_wants}
                </p>
              )}
              <button
                onClick={() => startPing(m.ping.sender_name)}
                className="text-[11px] uppercase tracking-widest text-lime-300 mt-2.5"
              >
                Ping back
              </button>
            </div>
          ) : m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="bg-lime-300 text-black rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[85%]">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-2">
              {m.text && (
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[90%] whitespace-pre-wrap">
                  {m.text}
                </div>
              )}
              {m.matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{match.name}</span>
                    <div className="flex gap-3 items-center shrink-0">
                      {people[match.id]?.linkedin_url && (
                        <a
                          href={people[match.id].linkedin_url!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-lime-300"
                        >
                          LinkedIn
                        </a>
                      )}
                      {me && (
                        <>
                          <button
                            onClick={() => startPing(match.name)}
                            className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-lime-300"
                          >
                            Ping
                          </button>
                          <button
                            onClick={() => toggleSave(match.id)}
                            className={`text-[11px] uppercase tracking-wider ${
                              savedIds.has(match.id)
                                ? "text-lime-300"
                                : "text-zinc-500"
                            }`}
                          >
                            {savedIds.has(match.id) ? "Saved" : "Save"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-zinc-400 mt-1.5">{match.why}</p>
                  {people[match.id]?.looking_for && (
                    <p className="text-[12px] text-lime-300/70 mt-1.5">
                      → {people[match.id].looking_for}
                    </p>
                  )}
                  <p className="text-[13px] text-zinc-300 mt-2 italic">
                    &ldquo;{match.icebreaker}&rdquo;
                  </p>
                </div>
              ))}
              {m.pings.length > 0 && (
                <div className="bg-lime-300/10 border border-lime-300/40 rounded-xl px-4 py-2.5 text-[12px] text-lime-300">
                  Ping sent — {m.pings.length === 1 ? "1 person" : `${m.pings.length} people`} just got notified.
                </div>
              )}
            </div>
          )
        )}

        {canShowSuggestions && (
          <div className="space-y-2 pt-2">
            {suggestionsLoading && suggestions === null && (
              <p className="text-[11px] uppercase tracking-widest text-zinc-700 animate-pulse">
                tailoring hints…
              </p>
            )}
            {(suggestions && suggestions.length > 0 ? suggestions : !suggestionsLoading ? FALLBACK_SUGGESTIONS : []).map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full text-left bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-2.5 text-[13px] text-zinc-400 hover:border-lime-300/50 hover:text-zinc-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {busy && (
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-zinc-500 w-fit animate-pulse">
            Reading the room
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="shrink-0 bg-black border-t border-zinc-900 px-4 pt-3 pb-3"
      >
        {pingHint && (
          <p className="text-[11px] text-lime-300/80 mb-2 px-1 leading-snug">
            {pingHint}
          </p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (pingHint && !/^ping /i.test(e.target.value)) setPingHint(null);
            }}
            placeholder={`Ask ${agentName.toLowerCase()}`}
            name="question"
            className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl px-4 text-sm"
          >
            Go
          </button>
        </div>
      </form>
    </main>
  );
}

export default function Chat() {
  return (
    <Suspense>
      <ChatInner />
    </Suspense>
  );
}
