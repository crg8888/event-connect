"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getIdentity } from "@/lib/identity";

const tabs = [
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto mb-1">
        <path d="M4 6h16v10H8l-4 4V6z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Pings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto mb-1">
        <path d="M6 16V10a6 6 0 0 1 12 0v6l1.5 2H4.5L6 16z" strokeLinejoin="round" />
        <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Saved",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto mb-1">
        <path d="M6.5 4h11v16l-5.5-3.5L6.5 20V4z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Nav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const id = getIdentity();
    if (!id) return;
    const load = () =>
      fetch(`/api/pings/mine?id=${id.id}`)
        .then((r) => r.json())
        .then((d) => setUnread(d.unread ?? 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [pathname]);

  const hide =
    pathname.startsWith("/host") ||
    pathname === "/qr" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/claim" ||
    pathname === "/";
  if (hide) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-t border-zinc-800/60">
      <div className="max-w-md mx-auto flex">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 pt-2.5 pb-3 text-center text-[10px] font-medium uppercase tracking-widest relative ${
                active ? "text-lime-300" : "text-zinc-600"
              }`}
            >
              <div className="relative inline-block">
                {t.icon}
                {t.href === "/notifications" && unread > 0 && (
                  <span className="absolute -top-0.5 -right-2 min-w-[16px] h-[16px] text-[9px] rounded-full bg-lime-300 text-black font-semibold flex items-center justify-center px-1">
                    {unread}
                  </span>
                )}
              </div>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
