"use client";

export type Identity = { id: number; name: string };

export function getIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ec-identity");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setIdentity(id: number, name: string) {
  localStorage.setItem("ec-identity", JSON.stringify({ id, name }));
}
