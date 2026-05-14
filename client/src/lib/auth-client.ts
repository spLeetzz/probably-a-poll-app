import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'

const baseURL = import.meta.env.VITE_AUTH_BASE_URL?.replace(/\/$/, '') ?? ''

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  basePath: '/api/auth',
  plugins: [anonymousClient()],
})

/** Where OAuth and email-reset flows should return the user (must be in server trustedOrigins if absolute). */
export function authAppOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
