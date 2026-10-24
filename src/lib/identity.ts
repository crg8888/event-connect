"use client";

export type Identity = { id: number; name: string; event?: string };

export function getIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ec-identity");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setIdentity(id: number, name: string, event?: string) {
  localStorage.setItem("ec-identity", JSON.stringify({ id, name, event }));
}

export function clearIdentity() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ec-identity");
}

/**
 * Resolve the attendee identity from, in order:
 *   1. ?a=<id>&e=<slug> query params (shareable, canonical)
 *   2. localStorage (previous session)
 *
 * If the URL has an identity that differs from localStorage, the URL wins and
 * localStorage gets rewritten. Fetches the name from the server when URL-based.
 */
export async function resolveIdentity(): Promise<Identity | null> {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const aParam = url.searchParams.get("a");
  const eParam = url.searchParams.get("e");
  const stored = getIdentity();

  if (aParam) {
    const id = Number(aParam);
    if (!id) return stored;
    if (stored && stored.id === id) {
      if (eParam && stored.event !== eParam) {
        setIdentity(stored.id, stored.name, eParam);
        return { id: stored.id, name: stored.name, event: eParam };
      }
      return stored;
    }
    try {
      const res = await fetch(`/api/attendees/${id}`);
      if (!res.ok) return stored;
      const row = await res.json();
      const identity: Identity = {
        id: row.id,
        name: row.name,
        event: eParam ?? row.event_slug ?? undefined,
      };
      setIdentity(identity.id, identity.name, identity.event);
      return identity;
    } catch {
      return stored;
    }
  }
  return stored;
}

/**
 * Return `?e=<slug>&a=<id>` for the given identity. Omits params we don't have.
 */
export function identityQuery(identity: Identity | null): string {
  if (!identity) return "";
  const sp = new URLSearchParams();
  if (identity.event) sp.set("e", identity.event);
  sp.set("a", String(identity.id));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
