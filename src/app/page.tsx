"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { resolveIdentity } from "@/lib/identity";

export default function Landing() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      // If an attendee happens to land here, send them to their room.
      const me = await resolveIdentity();
      if (me && me.event) {
        router.replace(`/e/${me.event}/a/${me.id}`);
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  if (checking) return null;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 pt-8 flex items-center justify-between">
        <Wordmark className="text-xl" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-600">
          for hosts
        </span>
      </header>

      <section className="flex-1 flex flex-col justify-center px-6 pb-20 max-w-xl mx-auto w-full">
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

        <p className="text-xs text-zinc-700 mt-10 max-w-md">
          Attendees get in by scanning the event QR — no app, no signup.
          Hosts register once and run the room from the dashboard.
        </p>
      </section>
    </main>
  );
}
