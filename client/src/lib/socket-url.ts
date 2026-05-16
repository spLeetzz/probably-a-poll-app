/** Origin for Socket.IO (same host as Better Auth when using VITE_AUTH_BASE_URL). */
export function getSocketBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || import.meta.env.VITE_AUTH_BASE_URL) as string | undefined
  if (raw?.trim()) {
    try {
      const normalized = raw.includes('://') ? raw : `https://${raw}`
      return new URL(normalized.replace(/\/$/, '')).origin
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
