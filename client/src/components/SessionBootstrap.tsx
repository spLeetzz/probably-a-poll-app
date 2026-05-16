import { useEffect } from "react";
import { ensureHiddenSession } from "../lib/ensure-hidden-session";

export function SessionBootstrap() {
  useEffect(() => {
    void ensureHiddenSession().catch(() => {
      //  offline / misconfig , pages still work where no auth is required 
    });
  }, []);
  return null;
}
