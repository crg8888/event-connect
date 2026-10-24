"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";

type FeedItem = {
  id: number;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  looking_for: string | null;
  score: number;
  why: string;
};
type Interest = {
  created_at: string;
  owner_name: string;
  owner_wants: string | null;
  saved_name: string;
  saved_headline: string | null;
  saved_linkedin: string | null;
};
type Match = { id: number; name: string; why: string; icebreaker: string };
type ChatMsg =
  | { role: "user"; text: string }
  | { role: "agent"; text: string; matches: Match[] };

const SUGGESTIONS = [
  "Find me a potential Omnara customer",
  "Who should the founding team meet first?",
  "Any builders adjacent to our stack?",
];

export default function HostDashboard() {
  const router = useRouter();
  const [event, setEvent] = useState<{ name: string; slug: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [joined, setJoined] = useState(0);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const chatAgentRef = useRef<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const feedById = Object.fromEntries(feed.map((f) => [f.id, f]));

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const res = await fetch("/api/host/event");
      if (res.status === 401) return router.replace("/login");
      const ev = await res.json();
      if (!ev) return router.replace("/host");
      setEvent(ev);

      const loadLeads = () =>
        fetch("/api/host/leads")
          .then((r) => r.json())
          .then((d) => {
            setTotal(d.total);
            setJoined(d.claimed.length);
            setInterests(d.interests);
          });
      const loadFeed = () =>
        fetch("/api/host/backchannel")
          .then((r) => r.json())
          .then((d) => {
            setFeed(d.items ?? []);
            setFeedLoading(false);
          });

      loadLeads();
      loadFeed();
      timer = setInterval(() => {
        loadLeads();
        loadFeed();
      }, 20000);
    })();
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs, chatBusy]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function askBackchannel(q: string) {
    if (!q.trim() || chatBusy) return;
    setChatInput("");
    setChatMsgs((m) => [...m, { role: "user", text: q }]);
    setChatBusy(true);
    try {
      const res = await fetch("/api/host/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, agentId: chatAgentRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      chatAgentRef.current = data.agentId;
      setChatMsgs((m) => [
        ...m,
        { role: "agent", text: data.reply, matches: data.matches ?? [] },
      ]);
    } catch {
      setChatMsgs((m) => [
        ...m,
        { role: "agent", text: "Concierge hiccup. Try again.", matches: [] },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/80">
        <div className="flex items-center gap-6">
          <div>
            <Wordmark className="text-lg" />
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">
              {event?.name ?? ""}
            </p>
          </div>
          <div className="flex gap-5 text-[11px] uppercase tracking-widest text-zinc-500">
            <span>
              <span className="text-zinc-200 font-semibold">{total}</span> guests
            </span>
            <span>
              <span className="text-lime-300 font-semibold">{joined}</span> joined
            </span>
            <span>
              <span className="text-zinc-200 font-semibold">{interests.length}</span> intros
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={logout}
            className="text-[11px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
          >
            Log out
          </button>
          <Link
            href="/qr"
            className="bg-lime-300 text-black font-semibold rounded-xl px-5 py-2 text-sm"
            target="_blank"
          >
            Present QR
          </Link>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_380px] overflow-hidden">
        {/* MAIN: chat */}
        <section className="flex flex-col overflow-hidden border-r border-zinc-900/80">
          <div className="px-6 py-4 border-b border-zinc-900/60">
            <h2 className="text-[11px] uppercase tracking-widest text-zinc-500">
              Ask Backchannel
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              The concierge for the host — ranked for your agenda.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {chatMsgs.length === 0 && !chatBusy && (
              <div className="space-y-2 max-w-xl">
                <p className="text-sm text-zinc-500 mb-3">
                  Try one of these, or type anything.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => askBackchannel(s)}
                    className="block w-full text-left bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm text-zinc-300 hover:border-lime-300/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3 max-w-2xl">
              {chatMsgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="bg-lime-300 text-black rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[85%]">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="space-y-2">
                    {m.text && (
                      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[90%]">
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
                          {feedById[match.id]?.linkedin_url && (
                            <a
                              href={feedById[match.id].linkedin_url!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-lime-300"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                        <p className="text-[13px] text-zinc-400 mt-1.5">{match.why}</p>
                        <p className="text-[13px] text-zinc-300 mt-1.5 italic">
                          &ldquo;{match.icebreaker}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
              {chatBusy && (
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-zinc-500 w-fit animate-pulse">
                  Reading the room
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              askBackchannel(chatInput);
            }}
            className="px-6 py-4 border-t border-zinc-900/80 bg-black"
          >
            <div className="flex gap-2 max-w-2xl">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Find me a potential customer in this room"
                className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={chatBusy || !chatInput.trim()}
                className="bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl px-5 text-sm"
              >
                Ask
              </button>
            </div>
          </form>
        </section>

        {/* SIDE: live feed */}
        <aside className="flex flex-col overflow-hidden bg-black">
          <div className="px-5 py-4 border-b border-zinc-900/60">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-widest text-zinc-500">
                Live feed
              </h2>
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse" />
                live
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Who&apos;s here · ranked by your agenda
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {feedLoading && (
              <p className="text-sm text-zinc-600">Reading the room…</p>
            )}
            {!feedLoading && feed.length === 0 && (
              <div className="text-sm text-zinc-600">
                <p className="mb-2">No one has claimed yet.</p>
                <p className="text-xs text-zinc-700">
                  Hit <span className="text-lime-300">Present QR</span> and put it on screen.
                </p>
              </div>
            )}
            {feed.map((f) => (
              <div
                key={f.id}
                className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] uppercase tracking-widest font-semibold w-7 text-center py-0.5 rounded ${
                        f.score >= 8
                          ? "text-black bg-lime-300"
                          : f.score >= 6
                            ? "text-lime-300 border border-lime-300/60"
                            : "text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {f.score}
                    </span>
                    <span className="text-sm font-medium truncate">{f.name}</span>
                  </div>
                  {f.linkedin_url && (
                    <a
                      href={f.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-lime-300 shrink-0"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
                {f.headline && (
                  <p className="text-[11px] text-zinc-500 mt-0.5 ml-9 truncate">
                    {f.headline}
                  </p>
                )}
                {f.why && (
                  <p className="text-[12px] text-lime-300/80 mt-2 ml-9 leading-snug">
                    {f.why}
                  </p>
                )}
                {f.looking_for && (
                  <p className="text-[11px] text-zinc-400 mt-1 ml-9 leading-snug">
                    → {f.looking_for}
                  </p>
                )}
              </div>
            ))}

            {interests.length > 0 && (
              <div className="pt-6">
                <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
                  Shortlists
                </h3>
                <div className="space-y-2">
                  {interests.map((i, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-3.5 py-2.5"
                    >
                      <p className="text-xs">
                        <span className="font-medium">{i.owner_name}</span>
                        <span className="text-zinc-600"> → </span>
                        <span className="font-medium">{i.saved_name}</span>
                      </p>
                      {i.owner_wants && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          wants: {i.owner_wants}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
