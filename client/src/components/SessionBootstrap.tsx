import { useEffect } from 'react'
import { ensureHiddenSession } from '../lib/ensure-hidden-session'

/** Ensures a session exists so REST + Socket.IO work without asking the user to sign in. */
export function SessionBootstrap() {
  useEffect(() => {
    void ensureHiddenSession().catch(() => {
      /* offline / misconfig — pages still work where no auth is required */
    })
  }, [])
  return null
}
