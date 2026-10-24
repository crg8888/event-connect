"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getIdentity } from "@/lib/identity";

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    const me = getIdentity();
    const slug = new URLSearchParams(window.location.search).get("e") ?? me?.event;
    if (me) {
      router.replace("/chat");
    } else if (slug) {
      router.replace(`/claim?e=${encodeURIComponent(slug)}`);
    } else {
      router.replace("/login");
    }
  }, [router]);
  return null;
}
