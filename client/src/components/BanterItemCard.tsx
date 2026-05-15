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
  /** Live vote count updates from socket: { optionId -> newCount } */
  liveVoteCounts: Record<string, number>
}

export function BanterItemCard({
  item,
  eventId,
  sessionToken,
  liveVoteCounts,
}: BanterItemCardProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const [voted, setVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isMCQ = item.options.length > 0

  // Merge initial option counts with live socket updates
  const getCount = (optionId: string) =>
    liveVoteCounts[optionId] ?? item.options.find(o => o.id === optionId)?.voteCount ?? 0

  const totalVotes = item.options.reduce((sum, o) => sum + getCount(o.id), 0)

  const handleVote = async (optionId: string) => {
    if (voted || submitting) return
    setPicked(optionId)
    setSubmitting(true)
    try {
      await api.banterVote(eventId, item.id, optionId, sessionToken)
      setVoted(true)
      toast.success('Vote cast!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Vote failed')
      setPicked(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-snug">{item.text}</p>
          <Badge variant="outline" className="shrink-0 text-[10px] h-5 px-1.5">
            {isMCQ ? <><BarChart2 className="h-3 w-3 mr-1" />Poll</> : <><MessageSquare className="h-3 w-3 mr-1" />Open</>}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {isMCQ ? (
          <>
            {/* Options */}
            <div className="space-y-2">
              {item.options.map(opt => {
                const count = getCount(opt.id)
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                const isSelected = picked === opt.id

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={voted || submitting}
                    className={`
                      w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all relative overflow-hidden
                      ${voted ? 'cursor-default' : 'cursor-pointer hover:border-foreground/40'}
                      ${isSelected ? 'border-foreground bg-foreground/5' : 'border-border'}
                    `}
                  >
                    {/* Vote bar background when revealed */}
                    {voted && (
                      <div
                        className="absolute inset-0 bg-foreground/8 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
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
                      {voted && (
                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {pct}% · {count}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {voted && (
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
              </p>
            )}
          </>
        ) : (
          /* Open-ended — discussion happens in chat */
          <div className="rounded-lg bg-muted/50 border border-dashed px-3 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0" />
            Share your thoughts in the chat ↓
          </div>
        )}
      </CardContent>
    </Card>
  )
}
