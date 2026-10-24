"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveIdentity } from "@/lib/identity";

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const me = await resolveIdentity();
      const slug =
        new URLSearchParams(window.location.search).get("e") ?? me?.event;
      if (me && me.event) {
        router.replace(`/e/${me.event}/a/${me.id}`);
      } else if (slug) {
        router.replace(`/e/${slug}/claim`);
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);
  return null;
}
