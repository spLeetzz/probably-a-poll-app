import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAppOrigin, authClient } from '../lib/auth-client'
import { authErrorMessage } from '../lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart, Mail, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const redirectTo = `${authAppOrigin()}/reset-password`
      const { error: err } = await authClient.requestPasswordReset({
        email,
        redirectTo,
      })
      if (err) {
        toast.error(authErrorMessage(err))
        return
      }
      setDone(true)
      toast.success('Reset link sent!')
    } catch (caught) {
      toast.error(authErrorMessage(caught))
    } finally {
      setLoading(false)
    }
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
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-bold">Check your email</p>
                <p className="text-sm text-muted-foreground">If an account exists for {email}, you will receive a reset link shortly.</p>
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/login">Return to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="m@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold h-11" disabled={loading}>
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
        {!done && (
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
