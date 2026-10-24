"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Room",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto mb-1">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M16 14.7c2 .3 3.6 1.5 4.3 3.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Concierge",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto mb-1">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Shortlist",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto mb-1">
        <path d="M6.5 4h11v16l-5.5-3.5L6.5 20V4z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Nav() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/host") ||
    pathname === "/qr" ||
    pathname === "/login" ||
    pathname === "/signup"
  )
    return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-t border-zinc-800/60">
      <div className="max-w-md mx-auto flex">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 pt-2.5 pb-3 text-center text-[10px] font-medium uppercase tracking-widest ${
              pathname === t.href ? "text-lime-300" : "text-zinc-600"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
