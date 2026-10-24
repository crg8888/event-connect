"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Identity, resolveIdentity } from "@/lib/identity";

type Partner = {
  id: number;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  looking_for: string | null;
};
type Message = {
  id: number;
  sender_id: number;
  message: string;
  created_at: string;
};

export default function Thread() {
  const { slug: eventSlug, id: pathId, partnerId } = useParams<{
    slug: string;
    id: string;
    partnerId: string;
  }>();
  const [me, setMe] = useState<Identity | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const other = Number(partnerId);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const id = await resolveIdentity();
      setMe(id);
      if (!id || !other) return;
      const load = async () => {
        const d = await fetch(
          `/api/pings/thread?attendeeId=${id.id}&partnerId=${other}`
        ).then((r) => r.json());
        setPartner(d.partner ?? null);
        setMessages(d.messages ?? []);
      };
      await load();
      timer = setInterval(load, 2000);
    })();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [other]);

  useLayoutEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !other || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    stickRef.current = true;
    try {
      const res = await fetch("/api/pings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: me.id,
          recipientId: other,
          message: text,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages((m) => [
          ...m,
          {
            id: d.id,
            sender_id: me.id,
            message: text,
            created_at: d.created_at ?? new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
      // keep the mobile keyboard open for rapid-fire replies
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  const base =
    eventSlug && pathId ? `/e/${eventSlug}/a/${pathId}/pings` : "/";

  return (
    <main className="fixed inset-0 max-w-md mx-auto flex flex-col pb-[calc(env(safe-area-inset-bottom)+64px)]">
      <header className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3 bg-black border-b border-zinc-900/80">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={base}
            className="text-[11px] uppercase tracking-widest text-zinc-500 shrink-0"
          >
            ← back
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {partner?.name ?? "…"}
            </p>
            {partner?.headline && (
              <p className="text-[11px] text-zinc-500 truncate">
                {partner.headline}
              </p>
            )}
          </div>
        </div>
        {partner?.linkedin_url && (
          <a
            href={partner.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-lime-300 shrink-0 ml-2"
          >
            LinkedIn
          </a>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2"
      >
        {partner?.looking_for && (
          <div className="text-[12px] text-lime-300/70 bg-lime-300/5 border border-lime-300/20 rounded-xl px-3 py-2 mb-3">
            → {partner.looking_for}
          </div>
        )}
        {messages.length === 0 && (
          <p className="text-sm text-zinc-600 text-center mt-10">
            Say hi. Share where you are.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me?.id;
          const time = new Date(m.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm max-w-[85%] whitespace-pre-wrap break-words ${
                  mine
                    ? "bg-lime-300 text-black rounded-br-md"
                    : "bg-zinc-900/60 border border-zinc-800/60 rounded-bl-md"
                }`}
              >
                {m.message}
                <span
                  className={`text-[10px] ml-2 align-bottom ${
                    mine ? "text-black/50" : "text-zinc-600"
                  }`}
                >
                  {time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={send}
        className="shrink-0 bg-black border-t border-zinc-900 px-4 pt-3 pb-3"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={partner ? `Message ${partner.name.split(" ")[0]}` : "Message"}
            className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl px-4 text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
