"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";

type EventRow = { slug: string; name: string };

export default function Landing() {
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((rows: EventRow[]) => setEvents(rows))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 pt-8 flex items-center justify-between">
        <Wordmark className="text-xl" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-600">
          for hosts
        </span>
      </header>

      <section className="flex-1 flex flex-col justify-center px-6 pb-16 max-w-xl mx-auto w-full">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
          Your guest list is an asset.
          <br />
          <span className="text-zinc-500">Put an agent on it.</span>
        </h1>
        <p className="text-zinc-500 mt-5 text-sm md:text-base max-w-md">
          Envoy researches every guest before the doors open, pushes your agenda
          into every introduction, and hands you the interest graph when it&apos;s
          over.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="bg-lime-300 text-black font-semibold rounded-xl px-6 py-3.5 text-sm text-center hover:bg-lime-200"
          >
            Create your event
          </Link>
          <Link
            href="/login"
            className="bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 font-medium rounded-xl px-6 py-3.5 text-sm text-center hover:border-lime-300/50"
          >
            Log in
          </Link>
        </div>
      </section>

      {events.length > 0 && (
        <section className="border-t border-zinc-900/80 px-6 py-10 max-w-xl mx-auto w-full">
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
            Attending an event?
          </p>
          <p className="text-xs text-zinc-600 mb-4">
            You&apos;d normally scan the QR. If you lost it, pick your event:
          </p>
          <div className="space-y-2">
            {events.map((e) => (
              <Link
                key={e.slug}
                href={`/e/${e.slug}/claim`}
                className="flex items-center justify-between gap-2 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3 hover:border-lime-300/50"
              >
                <span className="text-sm font-medium">{e.name}</span>
                <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                  claim →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
