"use client";

import { createContext, useContext } from "react";
import type { EventConfig } from "@/lib/config";

// Leva a configuração resolvida (já com fallback) do servidor para os
// componentes client, sem cada um precisar buscar no banco.
const Ctx = createContext<EventConfig | null>(null);

export function EventConfigProvider({
  value,
  children,
}: {
  value: EventConfig;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEventConfig(): EventConfig {
  const c = useContext(Ctx);
  if (!c) {
    throw new Error("useEventConfig precisa estar dentro de <EventConfigProvider>.");
  }
  return c;
}
