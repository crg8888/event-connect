"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "People", icon: "👥" },
  { href: "/chat", label: "Concierge", icon: "✨" },
  { href: "/saved", label: "Saved", icon: "📌" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-zinc-950/90 backdrop-blur border-t border-zinc-800">
      <div className="max-w-md mx-auto flex">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 py-3 text-center text-xs font-medium ${
              pathname === t.href ? "text-emerald-400" : "text-zinc-500"
            }`}
          >
            <div className="text-lg leading-none mb-0.5">{t.icon}</div>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
