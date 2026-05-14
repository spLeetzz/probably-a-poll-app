import { authClient } from './auth-client'
import { authErrorMessage } from './auth-errors'

let anonymousInflight: Promise<void> | null = null

/** Single-flight anonymous sign-in (used by API 401 retry and realtime). */
export async function runAnonymousSignIn(): Promise<void> {
  if (!anonymousInflight) {
    anonymousInflight = (async () => {
      const { error } = await authClient.signIn.anonymous()
      if (error) throw new Error(authErrorMessage(error))
    })().finally(() => {
      anonymousInflight = null
    })
  }
  await anonymousInflight
}

/** Ensures a Better Auth session exists (anonymous if needed). Never shown in the UI. */
export async function ensureHiddenSession(): Promise<void> {
  const res = await authClient.getSession()
  const user = res.data?.user
  if (user) return
  await runAnonymousSignIn()
}
