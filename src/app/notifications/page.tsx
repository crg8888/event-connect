"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { getIdentity, Identity } from "@/lib/identity";

type Ping = {
  id: number;
  message: string;
  created_at: string;
  read_at: string | null;
  sender_id: number;
  sender_name: string;
  sender_headline: string | null;
  sender_linkedin: string | null;
  sender_wants: string | null;
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function Notifications() {
  const [me, setMe] = useState<Identity | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getIdentity();
    setMe(id);
    if (!id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const d = await fetch(`/api/pings/mine?id=${id.id}`).then((r) => r.json());
      setPings(d.pings ?? []);
      setLoading(false);
    };
    load();
    const t = setInterval(load, 10000);
    // mark all read on view
    fetch(`/api/pings/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: id.id }),
    }).catch(() => {});
    return () => clearInterval(t);
  }, []);

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="flex items-center justify-between mb-5">
        <div>
          <Wordmark className="text-lg" />
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">
            pings
          </p>
        </div>
        {me && (
          <span className="text-[11px] uppercase tracking-widest text-zinc-500">
            {me.name.split(" ")[0]}
          </span>
        )}
      </header>

      {!me ? (
        <p className="text-sm text-zinc-500">
          <Link href="/claim" className="text-lime-300">
            Claim your profile
          </Link>{" "}
          to receive pings.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : pings.length === 0 ? (
        <div className="text-sm text-zinc-500 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-6 text-center">
          <p>No pings yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            When someone asks Hacky to meet you, it shows up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pings.map((p) => (
            <div
              key={p.id}
              className={`border rounded-xl px-4 py-3 ${
                p.read_at
                  ? "bg-zinc-900/40 border-zinc-800/60"
                  : "bg-lime-300/5 border-lime-300/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{p.sender_name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {p.sender_linkedin && (
                    <a
                      href={p.sender_linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-lime-300"
                    >
                      LinkedIn
                    </a>
                  )}
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                    {timeAgo(p.created_at)}
                  </span>
                </div>
              </div>
              {p.sender_headline && (
                <p className="text-xs text-zinc-500 mt-0.5">{p.sender_headline}</p>
              )}
              <p className="text-sm text-zinc-200 mt-2">
                &ldquo;{p.message}&rdquo;
              </p>
              {p.sender_wants && (
                <p className="text-[12px] text-lime-300/70 mt-2">
                  → {p.sender_wants}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
