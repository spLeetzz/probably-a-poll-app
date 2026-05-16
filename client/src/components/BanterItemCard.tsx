import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, MessageSquare, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import * as api from '@/api/events-api'

interface BanterItemCardProps {
  item: api.ItemWithOptions
  eventId: string
  sessionToken?: string
  liveVoteCounts: Record<string, number>
  onTextReply?: (itemId: string, text: string) => Promise<void>
  textReplies?: string[]
  isArchived?: boolean
}

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
];

export function BanterItemCard({
  item,
  eventId,
  sessionToken,
  liveVoteCounts,
  onTextReply,
  textReplies = [],
  isArchived = false,
}: BanterItemCardProps) {
  const storageKey = `banter_vote_${eventId}_${item.id}`
  const [picked, setPicked] = useState<string | null>(() => localStorage.getItem(storageKey))
  const [voted, setVoted] = useState(() => !!localStorage.getItem(storageKey))
  const [submitting, setSubmitting] = useState(false)
  
  const [textReply, setTextReply] = useState('')
  const [textReplied, setTextReplied] = useState(false)

  const isMCQ = item.options.length > 0

  // Merge initial option counts with live socket updates
  const getCount = (optionId: string) =>
    liveVoteCounts[optionId] ?? item.options.find(o => o.id === optionId)?.voteCount ?? 0

  const totalVotes = item.options.reduce((sum, o) => sum + getCount(o.id), 0)

  const handleVote = async (optionId: string) => {
    if (voted || submitting || isArchived) return
    setPicked(optionId)
    setSubmitting(true)
    try {
      await api.banterVote(eventId, item.id, optionId, sessionToken)
      setVoted(true)
      localStorage.setItem(storageKey, optionId)
      toast.success('Vote cast!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Vote failed')
      setPicked(localStorage.getItem(storageKey))
    } finally {
      setSubmitting(false)
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textReply.trim() || submitting || !onTextReply || isArchived) return
    setSubmitting(true)
    try {
      await onTextReply(item.id, textReply.trim())
      setTextReplied(true)
      toast.success('Reply sent!')
    } catch (e) {
      toast.error('Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-snug">{item.text}</p>
          <Badge variant="outline" className="shrink-0 text-[8px] h-5 px-1.5">
            {isMCQ ? <><BarChart2 className="h-3 w-3 mr-1" />Poll</> : <><MessageSquare className="h-3 w-3 mr-1" />Open</>}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {isMCQ ? (
          <>
            <div className="space-y-2">
              {item.options.map((opt, index) => {
                const count = getCount(opt.id)
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                const isSelected = picked === opt.id
                const barColor = COLORS[index % COLORS.length]

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={voted || submitting || isArchived}
                    className={`
                      w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all relative overflow-hidden
                      ${voted ? 'cursor-default' : 'cursor-pointer hover:border-foreground/40'}
                      ${isSelected ? 'border-foreground bg-foreground/5' : 'border-border'}
                    `}
                  >
                    <div
                      className="absolute inset-0 transition-all duration-500 opacity-20"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                    <div className="relative flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {voted && isSelected && !submitting && (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-foreground" />
                        )}
                        {submitting && isSelected && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" />
                        )}
                        <span>{opt.text}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {pct}% · {count}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-[8px] text-muted-foreground mt-2">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
            </p>
          </>
        ) : (
          /* Open-ended text reply form */
          <div className="space-y-3">
            {textReplied ? (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary flex items-center justify-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Reply sent to chat!
              </div>
            ) : isArchived ? (
              <div className="rounded-lg bg-muted/40 border px-3 py-3 text-sm text-muted-foreground flex items-center justify-center gap-2 font-medium">
                Room archived. Replies are closed.
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your reply..."
                  value={textReply}
                  onChange={(e) => setTextReply(e.target.value)}
                  disabled={submitting || isArchived}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={submitting || !textReply.trim() || !onTextReply || isArchived}
                  className="rounded-lg bg-primary px-3 py-2 text-primary-foreground text-xs font-medium uppercase tracking-wider disabled:opacity-50 flex items-center justify-center min-w-[70px]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reply'}
                </button>
              </form>
            )}

            {textReplies.length > 0 && (
              <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto pr-2">
                {textReplies.map((reply, i) => (
                  <div key={i} className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm border">
                    {reply}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
