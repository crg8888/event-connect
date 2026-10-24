"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/host");
    } else {
      setError((await res.json()).error ?? "Login failed.");
      setBusy(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-6 pt-20 pb-20">
      <Wordmark className="text-xl block mb-10" />
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Host login</h1>
      <p className="text-sm text-zinc-500 mb-8">Back to your room.</p>

      <form onSubmit={submit} className="space-y-3">
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
          placeholder="Password"
          autoComplete="current-password"
          className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-lime-300/50 placeholder:text-zinc-600"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full bg-lime-300 disabled:opacity-30 text-black font-semibold rounded-xl py-3.5 text-sm"
        >
          {busy ? "One sec" : "Log in"}
        </button>
      </form>

      <p className="text-xs text-zinc-600 mt-6">
        New here?{" "}
        <Link href="/signup" className="text-lime-300">
          Create a host account
        </Link>
      </p>
    </main>
  );
}
