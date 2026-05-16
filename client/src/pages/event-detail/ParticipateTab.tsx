import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Clock, LockKeyhole, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ItemWithOptions } from '../../api/events-api'

interface Props {
  eventStatus: string
  authOnly: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  hasResponded: boolean
  participantStatus?: string
  items: ItemWithOptions[]
  pick: Record<string, string>
  textAnswers: Record<string, string>
  busy: boolean
  onPick: (itemId: string, optionId: string) => void
  onText: (itemId: string, val: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function ParticipateTab({
  eventStatus, authOnly, isAuthenticated, isAnonymous, hasResponded, participantStatus,
  items, pick, textAnswers, busy, onPick, onText, onSubmit
}: Props) {
  // If event is authOnly, block anonymous and unauthenticated users
  // If not authOnly, only block if completely unauthenticated (which shouldn't happen with Better Auth anon plugin, but safe fallback)
  const isBlocked = (authOnly && (!isAuthenticated || isAnonymous)) || (!isAuthenticated && !isAnonymous)

  if (isBlocked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <LogIn className="h-10 w-10 text-muted-foreground" />
          <div className="text-center space-y-1">
            <p className="font-semibold text-lg">Sign in to participate</p>
            <p className="text-sm text-muted-foreground">
              This event requires a verified account.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/login"><LogIn className="h-4 w-4" /> Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Event not running
  if (eventStatus === 'completed') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold text-lg">Responses closed</p>
          <p className="text-sm text-muted-foreground">This event has ended and is no longer accepting responses.</p>
        </CardContent>
      </Card>
    )
  }

  if (eventStatus !== 'running') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold text-lg">Not yet started</p>
          <p className="text-sm text-muted-foreground capitalize">This event hasn't started yet. Check back soon.</p>
        </CardContent>
      </Card>
    )
  }

  // Already responded
  if (hasResponded || participantStatus) {
    if (participantStatus === 'pending') {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock className="h-10 w-10 text-amber-500" />
            <p className="font-semibold text-lg">Waiting for approval</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your response has been saved, but the event creator must approve it before your votes are counted.
            </p>
          </CardContent>
        </Card>
      )
    }

    if (participantStatus === 'rejected') {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <LockKeyhole className="h-10 w-10 text-destructive" />
            <p className="font-semibold text-lg text-destructive">Response rejected</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              The event creator has declined your participation in this event.
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-semibold text-lg">Response submitted</p>
          <p className="text-sm text-muted-foreground">You've successfully responded to this event!</p>
        </CardContent>
      </Card>
    )
  }

  // No questions yet
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No questions have been added yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {items.map((item, idx) => {
        const options = item.options ?? []
        const hasOptions = options.length > 0
        return (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-bold leading-snug">
                  {items.length > 1 && `${idx + 1}. `}{item.text}
                </CardTitle>
                {item.isMandatory && (
                  <Badge variant="outline" className="text-[8px] shrink-0">Required</Badge>
                )}
              </div>
              <CardDescription>
                {hasOptions ? 'Select one option' : 'Type your answer below'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasOptions ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map((opt) => {
                    const selected = pick[item.id] === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onPick(item.id, opt.id)}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border-2 text-left w-full transition-all',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-muted hover:border-muted-foreground/40 hover:bg-muted/30'
                        )}
                      >
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 flex-none flex items-center justify-center',
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        )}>
                          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-medium">{opt.text}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <Textarea
                  placeholder="Write your answer (max 500 characters)…"
                  maxLength={500}
                  rows={3}
                  value={textAnswers[item.id] ?? ''}
                  onChange={(e) => onText(item.id, e.target.value)}
                  className="resize-none"
                />
              )}
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={busy} className="gap-2 px-10">
          <CheckCircle2 className="h-4 w-4" />
          {busy ? 'Submitting…' : 'Submit Response'}
        </Button>
      </div>
    </form>
  )
}
