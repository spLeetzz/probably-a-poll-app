import { BetterFetchError } from '@better-fetch/fetch'

function messageFromObject(err: object): string | null {
  if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return null
}

export function authErrorMessage(err: unknown): string {
  if (err instanceof BetterFetchError) {
    const body = err.error
    if (body && typeof body === 'object') {
      const m = messageFromObject(body as object)
      if (m) return m
    }
    return err.message || `${err.status} ${err.statusText}`
  }
  if (err && typeof err === 'object') {
    const m = messageFromObject(err)
    if (m) return m
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
