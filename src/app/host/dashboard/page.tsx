"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import Wordmark from "@/components/Wordmark";

type Claimed = {
  id: number;
  name: string;
  headline: string | null;
  looking_for: string | null;
  claimed_at: string;
  linkedin_url: string | null;
};
type Interest = {
  created_at: string;
  owner_name: string;
  owner_wants: string | null;
  saved_name: string;
  saved_headline: string | null;
  saved_linkedin: string | null;
};

export default function HostDashboard() {
  const [event, setEvent] = useState<{ name: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [claimed, setClaimed] = useState<Claimed[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/claim`);
    fetch("/api/event").then((r) => r.json()).then(setEvent);
    const load = () =>
      fetch("/api/host/leads")
        .then((r) => r.json())
        .then((d) => {
          setTotal(d.total);
          setClaimed(d.claimed);
          setInterests(d.interests);
        });
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Wordmark className="text-xl" />
          <p className="text-[11px] uppercase tracking-widest text-zinc-600 mt-1">
            {event?.name ?? ""}
          </p>
        </div>
        <Link
          href="/qr"
          className="bg-lime-300 text-black font-semibold rounded-xl px-5 py-2.5 text-sm"
        >
          Present QR
        </Link>
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
              [claimed.length, "joined"],
              [interests.length, "intros"],
            ].map(([n, label]) => (
              <div key={label as string} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl py-4">
                <div className="text-2xl font-semibold">{n as number}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">
                  {label as string}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
              Live — what the room wants
            </h2>
            <div className="space-y-2">
              {claimed.length === 0 && (
                <p className="text-sm text-zinc-600">No one has joined yet. Put the QR up.</p>
              )}
              {claimed.map((c) => (
                <div key={c.id} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-lime-300"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                  {c.headline && <p className="text-xs text-zinc-500 mt-0.5">{c.headline}</p>}
                  {c.looking_for && (
                    <p className="text-[13px] text-lime-300/80 mt-1.5">→ {c.looking_for}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
              Interest graph — your post-event leads
            </h2>
            <div className="space-y-2">
              {interests.length === 0 && (
                <p className="text-sm text-zinc-600">
                  Shortlists show up here the moment guests start saving each other.
                </p>
              )}
              {interests.map((i, idx) => (
                <div key={idx} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3">
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
