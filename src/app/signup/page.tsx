"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      router.push("/host");
    } else {
      setError((await res.json()).error ?? "Signup failed.");
      setBusy(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-6 pt-20 pb-20">
      <Wordmark className="text-xl block mb-10" />
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Host account</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Register your event. Put an agent on your guest list.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          autoComplete="new-password"
          className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name || !email || password.length < 8}
          className="w-full bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl py-3.5 text-sm"
        >
          {busy ? "One sec" : "Create account"}
        </button>
      </form>

      <p className="text-xs text-zinc-600 mt-6">
        Already hosting?{" "}
        <Link href="/login" className="text-lime-300">
          Log in
        </Link>
      </p>
    </main>
  );
}
