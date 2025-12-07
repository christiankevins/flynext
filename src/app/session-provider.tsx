"use client";

import { createContext, useContext, useEffect } from "react";
import { getSession } from "~/server/session/index";

const SessionContext = createContext<Awaited<
  ReturnType<typeof getSession>
> | null>(null);

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Awaited<ReturnType<typeof getSession>> | null;
}) {
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(
      async () => {
        await fetch("/api/account/refresh", {
          method: "POST",
        });
      },
      1000 * 60 * 5,
    ); // Every 5 minutes

    return () => clearInterval(interval);
  }, [session]);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
