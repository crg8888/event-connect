"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QR() {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.origin), []);

  return (
    <main className="px-4 pt-10 flex flex-col items-center text-center">
      <h1 className="text-3xl font-bold">
        Event<span className="text-emerald-400">Connect</span>
      </h1>
      <p className="text-zinc-400 mt-2 mb-8 max-w-xs">
        Scan to see who&apos;s here and find the people you should actually meet.
      </p>
      {url && (
        <div className="bg-white p-5 rounded-3xl">
          <QRCodeSVG value={url} size={240} />
        </div>
      )}
      <p className="text-zinc-600 text-xs mt-6">{url}</p>
    </main>
  );
}
