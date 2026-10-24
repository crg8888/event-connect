"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
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

export default function HostDashboard() {
  const router = useRouter();
  const [event, setEvent] = useState<{ name: string; slug: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [joined, setJoined] = useState(0);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [url, setUrl] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const chatAgentRef = useRef<string | null>(null);
  const feedById = Object.fromEntries(feed.map((f) => [f.id, f]));

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const res = await fetch("/api/host/event");
      if (res.status === 401) return router.replace("/login");
      const ev = await res.json();
      if (!ev) return router.replace("/host");
      setEvent(ev);
      setUrl(`${window.location.origin}/claim?e=${ev.slug}`);

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

  const chatSuggestions = [
    "Find me potential customers for our platform",
    "Who's building something adjacent to our agenda?",
    "Which attendees should the founding team meet first?",
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 pt-10 pb-20">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Wordmark className="text-xl" />
          <p className="text-[11px] uppercase tracking-widest text-zinc-600 mt-1">
            {event?.name ?? ""}
          </p>
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
            className="bg-lime-300 text-black font-semibold rounded-xl px-5 py-2.5 text-sm"
          >
            Present QR
          </Link>
        </div>
      </header>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl">
              {url && <QRCodeSVG value={url} size={200} />}
            </div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 mt-4">
              scan to join the room
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              [total, "guests"],
              [joined, "joined"],
              [interests.length, "intros"],
            ].map(([n, label]) => (
              <div
                key={label as string}
                className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl py-4"
              >
                <div className="text-2xl font-semibold">{n as number}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">
                  {label as string}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] uppercase tracking-widest text-zinc-500">
                Ask Backchannel
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-zinc-700">
                your room, re-ranked
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                askBackchannel(chatInput);
              }}
              className="flex gap-2 mb-3"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Find me a potential Omnara customer in this room"
                className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={chatBusy || !chatInput.trim()}
                className="bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl px-5 text-sm"
              >
                Ask
              </button>
            </form>

            {chatMsgs.length === 0 && !chatBusy && (
              <div className="flex flex-wrap gap-2">
                {chatSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => askBackchannel(s)}
                    className="text-[11px] text-zinc-500 bg-zinc-900/40 border border-zinc-800/60 rounded-full px-3 py-1.5 hover:border-lime-300/50 hover:text-zinc-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {chatMsgs.length > 0 && (
              <div className="space-y-3 mt-2">
                {chatMsgs.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="text-right">
                      <span className="inline-block bg-lime-300 text-black rounded-2xl rounded-br-md px-4 py-2 text-sm">
                        {m.text}
                      </span>
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
                          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3"
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
              </div>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] uppercase tracking-widest text-zinc-500">
                Backchannel feed
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-zinc-700">
                ranked by your agenda · auto-refresh
              </span>
            </div>
            <div className="space-y-2">
              {feedLoading && (
                <p className="text-sm text-zinc-600">Reading the room…</p>
              )}
              {!feedLoading && feed.length === 0 && (
                <p className="text-sm text-zinc-600">
                  No one has joined yet. Put the QR up.
                </p>
              )}
              {feed.map((f) => (
                <div
                  key={f.id}
                  className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-widest font-semibold w-7 text-center rounded ${
                          f.score >= 8
                            ? "text-black bg-lime-300"
                            : f.score >= 6
                              ? "text-lime-300 border border-lime-300/60"
                              : "text-zinc-500 border border-zinc-700"
                        }`}
                      >
                        {f.score}
                      </span>
                      <span className="text-sm font-medium">{f.name}</span>
                    </div>
                    {f.linkedin_url && (
                      <a
                        href={f.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-lime-300"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                  {f.headline && (
                    <p className="text-xs text-zinc-500 mt-0.5 ml-9">{f.headline}</p>
                  )}
                  {f.why && (
                    <p className="text-[13px] text-lime-300/80 mt-2 ml-9">
                      {f.why}
                    </p>
                  )}
                  {f.looking_for && (
                    <p className="text-[12px] text-zinc-400 mt-1 ml-9">
                      → {f.looking_for}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
              Interest graph — post-event leads
            </h2>
            <div className="space-y-2">
              {interests.length === 0 && (
                <p className="text-sm text-zinc-600">
                  Shortlists show up here the moment guests start saving each other.
                </p>
              )}
              {interests.map((i, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3"
                >
                  <p className="text-sm">
                    <span className="font-medium">{i.owner_name}</span>
                    <span className="text-zinc-600"> shortlisted </span>
                    <span className="font-medium">{i.saved_name}</span>
                  </p>
                  {i.owner_wants && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {i.owner_name.split(" ")[0]} wants: {i.owner_wants}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
