"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Wordmark from "@/components/Wordmark";

export default function QR() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [eventName, setEventName] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/host/event");
      if (res.status === 401) return router.replace("/login");
      const ev = await res.json();
      if (!ev) return router.replace("/host");
      setEventName(ev.name);
      setUrl(`${window.location.origin}/claim?e=${ev.slug}`);
    })();
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[12px] uppercase tracking-[0.3em] text-zinc-500 mb-2">{eventName}</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-1">
        Don&apos;t work the room blind.
      </h1>
      <p className="text-zinc-500 mb-10">
        Scan. Say what you want. Meet the right people.
      </p>
      {url && (
        <div className="bg-white p-6 rounded-3xl">
          <QRCodeSVG value={url} size={280} />
        </div>
      )}
      <div className="mt-10">
        <Wordmark className="text-lg" />
      </div>
    </main>
  );
}
