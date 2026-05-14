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

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Profile Card */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="overflow-hidden border-primary/10 shadow-lg">
            <div className="h-24 bg-primary/5" />
            <div className="px-6 pb-6 -mt-12 text-center space-y-4">
              <Avatar className="h-24 w-24 mx-auto border-4 border-background ring-2 ring-primary/10">
                <AvatarImage src={u.image || ''} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {u.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-2xl font-black">{u.name}</h2>
                <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
                  <Mail className="h-3 w-3" /> {u.email}
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {u.emailVerified ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/20 gap-1">
                    Pending Verification
                  </Badge>
                )}
                {isAnonymous && <Badge variant="secondary">Guest</Badge>}
              </div>
              <Separator />
              <Button variant="destructive" className="w-full gap-2 border-dashed" onClick={onSignOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </Card>
        </div>

        {/* Details and Actions */}
        <div className="flex-1 space-y-8">
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account Details
            </h3>
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-widest">Full Name</Label>
                  <p className="font-medium">{u.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-widest">Email Address</Label>
                  <p className="font-medium">{u.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-widest">Account Created</Label>
                  <p className="font-medium">May 2026</p> {/* Placeholder or derived from token */}
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-widest">User ID</Label>
                  <code className="text-xs font-mono bg-muted px-1 rounded">{u.id.slice(0, 8)}...</code>
                </div>
              </CardContent>
            </Card>
          </section>

          {!isAnonymous && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Security Settings
              </h3>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Password</CardTitle>
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
            </section>
          )}

          <div className="pt-4">
            <Button variant="link" className="px-0 text-muted-foreground hover:text-primary transition-colors" asChild>
              <Link to="/login">Use another account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
