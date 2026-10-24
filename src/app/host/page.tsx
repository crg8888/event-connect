"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";

type Guest = { name: string; email: string; linkedin_url?: string | null };

const DEFAULT_WELCOME = `Hey {first_name} — I'm Hacky.

Omnara's giving everyone here $500 in model credits and the AgentDemos repo:
  gh.io/agent-demos

Ask me about who's in the room and interesting connections to make. Try: "who should I meet?" or "find people building voice agents."`;
type Enriched = {
  id: number;
  name: string;
  email: string;
  linkedin_url: string | null;
  headline: string | null;
  description: string | null;
  avatar_url: string | null;
};

function parseCsv(text: string): Guest[] {
  const emailRe = /[^\s,;"]+@[^\s,;"]+\.[^\s,;"]+/;
  const linkedinRe = /(?:linkedin\.com|lnkd\.in)\/[a-zA-Z0-9\-/_%?=&.]+/i;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const email = cells.find((c) => emailRe.test(c)) ?? "";
      const linkedinCell = cells.find((c) => linkedinRe.test(c));
      const match = linkedinCell?.match(linkedinRe)?.[0] ?? null;
      const name =
        cells.find((c) => c && !emailRe.test(c) && !linkedinRe.test(c)) ?? "";
      return {
        name,
        email,
        linkedin_url: match
          ? /^https?:\/\//i.test(match)
            ? match
            : `https://${match}`
          : null,
      };
    })
    .filter((g) => g.email && !/^e-?mail$/i.test(g.email));
}

export default function Host() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [eventName, setEventName] = useState("");
  const [lumaUrl, setLumaUrl] = useState("");
  const [agenda, setAgenda] = useState("");
  const [agentName, setAgentName] = useState("Hacky");
  const [welcomeTemplate, setWelcomeTemplate] = useState(DEFAULT_WELCOME);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [csvName, setCsvName] = useState("");

  const [phase, setPhase] = useState<"form" | "enriching" | "done">("form");
  const [enriched, setEnriched] = useState<Enriched[]>([]);
  const [progress, setProgress] = useState(0);
  const [linkedinCount, setLinkedinCount] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) return router.replace("/login");
      const event = await fetch("/api/host/event").then((r) => r.json());
      if (event) return router.replace("/host/dashboard");
      setChecking(false);
    })();
  }, [router]);

  function connectLuma() {
    if (!apiKey.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1800);
  }

  async function onCsv(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setGuests(parsed);
    setCsvName(file.name);
  }

  const hasGuests = guests.length > 0 || connected;
  const ready = eventName.trim() && agenda.trim() && hasGuests;

  async function launch() {
    if (!ready) return;
    await fetch("/api/host/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: eventName.trim(),
        lumaUrl: lumaUrl.trim(),
        agenda: agenda.trim(),
        agentName: agentName.trim(),
        welcomeTemplate: welcomeTemplate.trim(),
      }),
    });
    // fire-and-forget — regen under the research-theater animation
    void fetch("/api/host/suggestions", { method: "POST" }).catch(() => {});
    const res = await fetch("/api/host/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guests }),
    });
    const data = await res.json();
    setEnriched(data.enriched ?? []);
    setLinkedinCount(data.linkedinCount ?? 0);
    setPhase("enriching");

    const rows: Enriched[] = data.enriched ?? [];
    let i = 0;
    const tick = () => {
      i += 1;
      setProgress(i);
      if (i < rows.length) setTimeout(tick, 110 + Math.random() * 160);
      else setTimeout(() => setPhase("done"), 600);
    };
    setTimeout(tick, 400);
  }

  return (
    <main className="max-w-2xl mx-auto px-6 pt-10 pb-20">
      <header className="flex items-center justify-between mb-10">
        <Wordmark className="text-xl" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-600">for hosts</span>
      </header>

      {checking && <p className="text-sm text-zinc-600">Loading…</p>}

      {!checking && phase === "form" && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Your guest list is an asset.
            <br />
            <span className="text-zinc-500">Put an agent on it.</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-3 mb-10 max-w-md">
            Backchannel researches every guest before the doors open, pushes your
            agenda through every introduction, and hands you the interest graph
            when it&apos;s over.
          </p>

          <section className="space-y-8">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2">
                01 — Event
              </label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event name"
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600 mb-2"
              />
              <input
                value={lumaUrl}
                onChange={(e) => setLumaUrl(e.target.value)}
                placeholder="Luma event link (optional)"
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2">
                02 — Guests
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`text-left border rounded-xl p-4 ${
                    guests.length
                      ? "border-lime-300/50 bg-lime-300/5"
                      : "border-zinc-800/60 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-sm font-medium block">Upload guest CSV</span>
                  <span className="text-xs text-zinc-500 mt-1 block">
                    {guests.length
                      ? `${csvName} — ${guests.length} guests`
                      : "Export from Luma, Eventbrite, anywhere"}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
                />
                <div
                  className={`border rounded-xl p-4 ${
                    connected ? "border-lime-300/50 bg-lime-300/5" : "border-zinc-800/60 bg-zinc-900/60"
                  }`}
                >
                  <span className="text-sm font-medium block">Connect Luma API</span>
                  {connected ? (
                    <span className="text-xs text-lime-300 mt-1 block">
                      Calendar connected — guests sync live
                    </span>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="luma-api-key"
                        className="flex-1 min-w-0 bg-black/40 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-lime-300/50 placeholder:text-zinc-700"
                      />
                      <button
                        onClick={connectLuma}
                        disabled={connecting || !apiKey.trim()}
                        className="text-xs bg-zinc-800 disabled:opacity-40 rounded-lg px-3"
                      >
                        {connecting ? "…" : "Link"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2">
                03 — Your agenda
              </label>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={4}
                placeholder="What do you want out of this room? e.g. We're launching our platform — get builders to try it, form teams, and meet our founding engineers."
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
              />
              <p className="text-xs text-zinc-600 mt-1.5">
                The concierge weaves this into every introduction it makes. Guests never see it raw.
              </p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2">
                04 — Your agent
              </label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent name (e.g. Hacky)"
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600 mb-2"
              />
              <textarea
                value={welcomeTemplate}
                onChange={(e) => setWelcomeTemplate(e.target.value)}
                rows={6}
                placeholder="First message every attendee sees. Use {first_name} to personalize."
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600 font-mono"
              />
              <p className="text-xs text-zinc-600 mt-1.5">
                Sent instantly when they claim their profile. {"{first_name}"} gets filled in.
              </p>
            </div>

            <button
              onClick={launch}
              disabled={!ready}
              className="w-full bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl py-4 text-sm"
            >
              Research my guests
            </button>
          </section>
        </>
      )}

      {phase === "enriching" && (
        <section>
          <h2 className="text-xl font-semibold mb-1">Agent researching the room</h2>
          <p className="text-sm text-zinc-500 mb-6">
            LinkedIn, bios, what they&apos;re building — assembled before anyone walks in.
          </p>
          <div className="space-y-1.5 font-mono text-[13px]">
            {enriched.slice(0, progress).map((g) => (
              <div key={g.id} className="flex items-center gap-2.5">
                {g.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-zinc-800 inline-block" />
                )}
                <span className="text-zinc-300">{g.name}</span>
                <span className="text-zinc-600 truncate flex-1">
                  {g.linkedin_url ? "linkedin ✓" : "no linkedin"}
                  {g.description ? " · profile written" : ""}
                </span>
              </div>
            ))}
            {progress < enriched.length && (
              <div className="text-lime-300 animate-pulse">researching…</div>
            )}
          </div>
        </section>
      )}

      {phase === "done" && (
        <section className="pt-10 text-center">
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
            room intelligence ready
          </p>
          <h2 className="text-4xl font-semibold tracking-tight">
            {enriched.length} guests researched
          </h2>
          <p className="text-zinc-500 mt-2 text-sm">
            {linkedinCount} LinkedIn profiles · {enriched.filter((e) => e.description).length} bios written
          </p>
          <button
            onClick={() => router.push("/host/dashboard")}
            className="mt-10 bg-lime-300 text-black font-semibold rounded-xl px-8 py-4 text-sm"
          >
            Open event dashboard
          </button>
        </section>
      )}
    </main>
  );
}
