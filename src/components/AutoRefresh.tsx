"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Volta a pedir os dados ao servidor de tempos a tempos (ecrãs de acompanhamento).
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
