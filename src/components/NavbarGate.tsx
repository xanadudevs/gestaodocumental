"use client";

import { usePathname } from "next/navigation";

// A página partilhada do estado dos sistemas (/estado-publico) não mostra o
// menu da app, mesmo a quem tem sessão iniciada.
export default function NavbarGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/estado-publico")) return null;
  return <>{children}</>;
}
