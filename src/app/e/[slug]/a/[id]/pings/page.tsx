"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { Identity, resolveIdentity } from "@/lib/identity";

type Thread = {
  id: number;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  looking_for: string | null;
  last_message: string;
  last_at: string;
  from_me: boolean;
  unread: number;
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function Pings() {
  const { slug: eventSlug, id: pathId } = useParams<{ slug: string; id: string }>();
  const [me, setMe] = useState<Identity | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const id = await resolveIdentity();
      setMe(id);
      if (!id) {
        setLoading(false);
        return;
      }
      const load = async () => {
        const d = await fetch(`/api/pings/threads?attendeeId=${id.id}`).then((r) =>
          r.json()
        );
        setThreads(d.threads ?? []);
        setLoading(false);
      };
      await load();
      timer = setInterval(load, 3000);
    })();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const base = eventSlug && pathId ? `/e/${eventSlug}/a/${pathId}` : "";

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

      {!me && eventSlug ? (
        <p className="text-sm text-zinc-500">
          <Link href={`/e/${eventSlug}/claim`} className="text-lime-300">
            Claim your profile
          </Link>{" "}
          to receive pings.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : threads.length === 0 ? (
        <div className="text-sm text-zinc-500 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-6 text-center">
          <p>No pings yet.</p>
          <p className="text-xs text-zinc-600 mt-2">
            Ask{" "}
            <Link href={base} className="text-lime-300">
              your concierge
            </Link>{" "}
            to find people, then ping them.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`${base}/pings/${t.id}`}
              className={`block border rounded-xl px-4 py-3 ${
                t.unread > 0
                  ? "bg-lime-300/5 border-lime-300/30"
                  : "bg-zinc-900/40 border-zinc-800/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{t.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {t.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] text-[10px] rounded-full bg-lime-300 text-black font-semibold flex items-center justify-center px-1.5">
                      {t.unread}
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                    {timeAgo(t.last_at)}
                  </span>
                </div>
              </div>
              {t.headline && (
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{t.headline}</p>
              )}
              <p className="text-[13px] text-zinc-300 mt-1.5 line-clamp-1">
                {t.from_me ? (
                  <span className="text-zinc-500">You: </span>
                ) : null}
                {t.last_message}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
