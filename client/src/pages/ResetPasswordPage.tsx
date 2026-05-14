import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authClient } from '../lib/auth-client'
import { authErrorMessage } from '../lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart, Lock, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token') ?? '', [params])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error('Missing reset token. Open the link from your email again.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (err) {
        toast.error(authErrorMessage(err))
        return
      }
      setSuccess(true)
      toast.success('Password updated successfully!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (caught) {
      toast.error(authErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  if (params.get('error') === 'INVALID_TOKEN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild><Link to="/forgot-password">Request New Link</Link></Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
          <BarChart className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">POLL.IO</h1>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-primary/5">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
          <CardDescription>Secure your account with a new password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>No token found in the URL. Please check your email link.</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="h-16 w-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-bold">Password Updated</p>
                <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!token}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirm" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    disabled={!token}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold h-11" disabled={loading || !token}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
        {!success && (
          <CardFooter className="flex justify-center border-t pt-6 bg-muted/5">
            <Link to="/login" className="text-sm flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to sign in
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
