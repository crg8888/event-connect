"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Wordmark from "@/components/Wordmark";

export default function QR() {
  const [url, setUrl] = useState("");
  const [eventName, setEventName] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/claim`);
    fetch("/api/event")
      .then((r) => r.json())
      .then((e) => setEventName(e?.name ?? ""));
  }, []);

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
