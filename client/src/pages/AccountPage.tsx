import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authClient } from '../lib/auth-client'
import { authErrorMessage } from '../lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { KeyRound, Mail, User, ShieldCheck, LogOut, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

export function AccountPage() {
  const { data: session, isPending, error, refetch } = authClient.useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [cpLoading, setCpLoading] = useState(false)

  async function onSignOut() {
    await authClient.signOut()
    void refetch()
    toast.success('Signed out successfully')
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setCpLoading(true)
    try {
      const { error: err } = await authClient.changePassword({
        currentPassword,
        newPassword,
      })
      if (err) {
        toast.error(authErrorMessage(err))
        return
      }
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      void refetch()
    } catch (caught) {
      toast.error(authErrorMessage(caught))
    } finally {
      setCpLoading(false)
    }
  }

  if (isPending) {
    return <div className="flex justify-center py-20 animate-pulse text-muted-foreground">Loading account details...</div>
  }

  if (error || !session?.user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
          {error ? authErrorMessage(error) : "You are not signed in."}
        </div>
        <p className="text-muted-foreground">Sign in to manage your account and view your personalized dashboard.</p>
        <div className="flex justify-center gap-3">
          <Button asChild><Link to="/login">Sign in</Link></Button>
          <Button variant="outline" asChild><Link to="/register">Register</Link></Button>
        </div>
      </div>
    )
  }

  const u = session.user
  const isAnonymous = 'isAnonymous' in u && (u as { isAnonymous?: boolean }).isAnonymous

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ChevronLeft className="h-4 w-4 mr-2" /> Back to Events</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-8 max-w-3xl mx-auto">
        {/* Profile Header Banner */}
        <Card className="p-8 flex flex-col md:flex-row items-center justify-between border-primary/10 shadow-lg relative overflow-hidden gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
          
          <div className="space-y-6 relative z-10 text-center md:text-left flex-1">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight">{u.name}</h2>
              <p className="text-muted-foreground text-lg flex items-center justify-center md:justify-start gap-2">
                <Mail className="h-4 w-4" /> {u.email}
              </p>
              {isAnonymous && <Badge variant="secondary" className="mt-2 uppercase tracking-widest text-[10px]">Guest User</Badge>}
            </div>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <Button variant="destructive" className="gap-2 border-dashed" onClick={onSignOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
          
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background ring-2 ring-primary/10 relative z-10 shadow-xl shrink-0">
            <AvatarImage src={u.image || ''} />
            <AvatarFallback className="text-4xl md:text-5xl font-black bg-primary/10 text-primary">
              {u.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Card>

        {/* Security Settings */}
        {!isAnonymous && (
          <Card className="border-primary/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Update Password
              </CardTitle>
              <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <Input
                    id="current"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input
                    id="new"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={cpLoading} className="w-full sm:w-auto">
                  {cpLoading ? "Updating..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
