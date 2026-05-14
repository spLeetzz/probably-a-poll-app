import type { Participant } from '../../api/events-api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Users, Clock } from 'lucide-react'

interface Props {
  participants: Participant[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function ParticipantsTab({ participants, onApprove, onReject }: Props) {
  const pending = participants.filter((p) => p.status === 'pending')
  const others = participants.filter((p) => p.status !== 'pending')

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Participant Approvals</h2>
        <p className="text-muted-foreground">
          Manage users who have submitted responses. Their votes are hidden until approved.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Needs Approval ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Card className="border-dashed py-8">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-2 text-muted-foreground">
              <Users className="h-8 w-8 opacity-20" />
              <p>No pending responses.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pending.map((p) => (
              <Card key={p.id} className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{p.userName || 'Anonymous User'}</p>
                    {p.userEmail && <p className="text-xs text-muted-foreground">{p.userEmail}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Submitted at {new Date(p.joinedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onReject(p.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20">
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => onApprove(p.id)} className="bg-amber-500 hover:bg-amber-600 text-white">
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold text-muted-foreground">Reviewed Participants ({others.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {others.map((p) => (
              <Card key={p.id} className="bg-muted/30 opacity-70">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-sm text-foreground">{p.userName || 'Anonymous User'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(p.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={p.status === 'approved' ? 'default' : 'destructive'} className="text-[10px] uppercase">
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
