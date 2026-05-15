import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api/events-api'
import type { CreateEventBody, Event } from '../api/events-api'
import { authClient } from '../lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCcw, LayoutGrid, ListFilter, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function WorkspacePage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const sessionUserId = session?.user?.id

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [publicList, userList] = await Promise.all([
        api.listEvents({ limit: 50, offset: 0 }),
        sessionUserId ? api.listEvents({ limit: 50, offset: 0, creatorId: sessionUserId }) : Promise.resolve([])
      ])
      setEvents(publicList)
      setMyEvents(userList)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [sessionUserId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)
    try {
      const body: CreateEventBody = { title: title.trim(), type: 'poll' }
      const ev = await api.createEvent(body)
      setTitle('')
      toast.success('Event created successfully!')
      navigate(`/events/${encodeURIComponent(ev.id)}`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Live</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Your Dashboard</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Manage your polls and live events. Create interactive experiences and track results in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Column */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-md border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create New
              </CardTitle>
              <CardDescription>Launch a new poll in seconds.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Weekly Team Feedback"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Poll'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Events */}
          {sessionUserId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <LayoutGrid className="h-5 w-5" />
                  My Events
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{myEvents.length} total</span>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {loading && myEvents.length === 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    <Card className="animate-pulse h-24 bg-muted/50 rounded-xl" />
                  </div>
                ) : myEvents.length === 0 ? (
                  <Card className="border-dashed py-8">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-2">
                      <p className="text-sm text-muted-foreground">You haven't created any events yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myEvents.map((ev) => (
                      <Card key={ev.id} className="group hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer overflow-hidden border-primary/20 bg-primary/5 flex flex-col h-full">
                        <Link to={`/events/${encodeURIComponent(ev.id)}`} className="flex flex-col flex-1">
                          <CardHeader className="flex-1 pb-5">
                            <div className="flex justify-between items-start mb-2">
                              {getStatusBadge(ev.status)}
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{ev.type}</Badge>
                            </div>
                            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors leading-snug text-base">
                              {ev.title}
                            </CardTitle>
                          </CardHeader>
                          <CardFooter className="pt-3 pb-3 border-t border-primary/10 bg-primary/5 text-[11px] text-muted-foreground flex justify-between mt-auto">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {new Date(ev.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ev.itemCount} items
                            </div>
                          </CardFooter>
                        </Link>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-green-500" />
                Active Events
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListFilter className="h-4 w-4" />
                <span>{events.filter(e => e.status === 'running').length} running</span>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {loading && events.length === 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse h-32 bg-muted/50 rounded-xl" />
                  ))}
                </div>
              ) : events.filter(e => e.status === 'running').length === 0 ? (
                <Card className="border-dashed py-8">
                  <CardContent className="flex flex-col items-center justify-center text-center space-y-2">
                    <p className="text-sm text-muted-foreground">No active events found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {events.filter(e => e.status === 'running').map((ev) => (
                    <Card key={ev.id} className="group hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer overflow-hidden border-muted flex flex-col h-full">
                      <Link to={`/events/${encodeURIComponent(ev.id)}`} className="flex flex-col flex-1">
                        <CardHeader className="flex-1 pb-5">
                          <div className="flex justify-between items-start mb-2">
                            {getStatusBadge(ev.status)}
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{ev.type}</Badge>
                          </div>
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors leading-snug text-base">
                            {ev.title}
                          </CardTitle>
                        </CardHeader>
                        <CardFooter className="pt-3 pb-3 border-t bg-muted/5 text-[11px] text-muted-foreground flex justify-between mt-auto">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(ev.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ev.itemCount} items
                          </div>
                        </CardFooter>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Completed Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5" />
                Recently Completed
              </h2>
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {events.filter(e => e.status === 'completed').length === 0 ? (
                <Card className="border-dashed py-8">
                  <CardContent className="flex flex-col items-center justify-center text-center space-y-2">
                    <p className="text-sm text-muted-foreground">No completed events found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {events.filter(e => e.status === 'completed').map((ev) => (
                    <Card key={ev.id} className="group hover:shadow-md transition-all cursor-pointer overflow-hidden border-muted opacity-80 hover:opacity-100 flex flex-col h-full">
                      <Link to={`/events/${encodeURIComponent(ev.id)}`} className="flex flex-col flex-1">
                        <CardHeader className="flex-1 pb-5">
                          <div className="flex justify-between items-start mb-2">
                            {getStatusBadge(ev.status)}
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{ev.type}</Badge>
                          </div>
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors leading-snug text-base">
                            {ev.title}
                          </CardTitle>
                        </CardHeader>
                        <CardFooter className="pt-3 pb-3 border-t bg-muted/5 text-[11px] text-muted-foreground flex justify-between mt-auto">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(ev.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ev.itemCount} items
                          </div>
                        </CardFooter>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
