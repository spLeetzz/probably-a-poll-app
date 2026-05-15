import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import * as api from '../api/events-api'
import { authClient } from '../lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Users, 
  Ghost, 
  MoreVertical, 
  Link as LinkIcon, 
  RotateCcw,
  ChevronLeft,
  Loader2,
  MessageSquare,
  Settings2,
  BarChart
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { ManageTab } from './event-detail/ManageTab'
import { BanterItemCard } from '@/components/BanterItemCard'

interface BanterServerToClient {
  new_message: (msg: api.BanterMessage) => void
  participant_joined: (payload: { displayName: string; participantId: string }) => void
  room_joined: (payload: { eventId: string }) => void
  new_item: (item: api.ItemWithOptions) => void
  answer_recorded: (payload: { itemId: string; optionId: string; newVoteCount: number; totalResponses: number }) => void
  presence_update: (payload: { count: number }) => void
  error: (payload: { message: string }) => void
}

interface BanterClientToServer {
  join_room: (payload: { joinSlug: string; sessionToken: string }) => void
  send_message: (payload: { content: string }) => void
}

function EmptyPollsState() {
  return (
    <Card className="border-dashed py-12">
      <CardContent className="flex flex-col items-center text-center text-muted-foreground">
        <BarChart className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-sm">No polls have been added yet.</p>
      </CardContent>
    </Card>
  )
}

interface ChatViewProps {
  messages: api.BanterMessage[]
  participant: api.BanterJoinResponse | null
  event: api.Event
  scrollRef: React.RefObject<HTMLDivElement | null>
  nextCursor: string | null
  loadingMore: boolean
  loadMore: () => Promise<void>
  message: string
  setMessage: (val: string) => void
  onSend: (e: React.FormEvent) => Promise<void>
  sending: boolean
}

function ChatView({ 
  messages, participant, event, scrollRef, nextCursor, 
  loadingMore, loadMore, message, setMessage, onSend, sending 
}: ChatViewProps) {
  return (
    <Card className="flex-1 overflow-hidden flex flex-col border-none shadow-xl bg-muted/20 h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {nextCursor && (
          <div className="flex justify-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadMore} 
              disabled={loadingMore}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {loadingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : 'Load older messages'}
            </Button>
          </div>
        )}
        
        <div className="space-y-6">
          {messages.map((msg, i) => {
            const isMe = msg.participantId === participant?.participantId
            const showName = i === 0 || messages[i-1].participantId !== msg.participantId
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-[10px] font-bold text-muted-foreground mb-1 px-1 flex items-center gap-1">
                    {msg.displayName}
                    {msg.participantId === event.creatorId && <Badge variant="outline" className="text-[8px] h-3 px-1 py-0">HOST</Badge>}
                  </span>
                )}
                <div className={`
                  max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm
                  ${isMe 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-card border rounded-tl-none'}
                `}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 px-1">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </span>
              </div>
            )
          })}
          <div className="h-2" />
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t">
        <form onSubmit={onSend} className="flex gap-2">
          <Input
            placeholder="Say something nice..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 rounded-full px-4 h-11 border-primary/20 focus-visible:ring-primary"
            maxLength={2000}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full h-11 w-11 flex-shrink-0 transition-transform active:scale-95" 
            disabled={sending || !message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

export function BanterRoomPage() {
  const { joinSlug } = useParams<{ joinSlug: string }>()
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  
  const [event, setEvent] = useState<(api.Event & { participantCount: number }) | null>(null)
  const [messages, setMessages] = useState<api.BanterMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [sending, setSending] = useState(false)
  const [displayName, setDisplayName] = useState(session?.user?.name || '')
  const [message, setMessage] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  
  const socketRef = useRef<Socket<BanterServerToClient, BanterClientToServer> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [participant, setParticipant] = useState<api.BanterJoinResponse | null>(null)
  const [items, setItems] = useState<api.ItemWithOptions[]>([])
  const [activeTab, setActiveTab] = useState('chat')
  const [liveVoteCounts, setLiveVoteCounts] = useState<Record<string, number>>({})

  const isCreator = session?.user?.id && event?.creatorId === session.user.id


  // Initialize room data
  const initRoom = useCallback(async () => {
    if (!joinSlug) return
    setLoading(true)
    setMessages([])
    setLiveVoteCounts({})
    try {
      // ── Critical: fetch room metadata ──────────────────────────────────
      const data = await api.getBanterRoom(joinSlug)
      setEvent(data)

      // ── Non-critical: messages, items, analytics (failures don't block entry) ──
      const loadExtras = async () => {
        // Messages
        try {
          const msgsData = await api.listBanterMessages(data.id, { limit: 50 })
          setMessages(msgsData.messages.reverse())
          setNextCursor(msgsData.nextCursor)
        } catch { toast.error('Could not load message history') }

        // Items
        try {
          const itsData = await api.listItems(data.id)
          setItems(itsData)
        } catch { /* polls tab will just show empty */ }
      }
      void loadExtras()

      // ── Participant state ──────────────────────────────────────────────
      if (data.participant) {
        const p = {
          participantId: data.participant.id,
          sessionToken: data.participant.sessionToken || '',
          displayName: data.participant.displayName || '',
          alreadyJoined: true,
        }
        setParticipant(p)
        if (p.sessionToken) {
          localStorage.setItem(`banter_token_${joinSlug}`, p.sessionToken)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load room'
      toast.error(msg)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [joinSlug, navigate])

  useEffect(() => {
    void initRoom()
  }, [initRoom])

  // Socket setup
  useEffect(() => {
    if (!participant || !joinSlug) return

    const socket: Socket<BanterServerToClient, BanterClientToServer> = io('/banter', {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_room', {
        joinSlug,
        sessionToken: participant.sessionToken
      })
    })

    socket.on('room_joined', () => {
      console.log('Successfully joined WebSocket room')
    })

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg])
      // Scroll to bottom if we're near the bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    })

    socket.on('participant_joined', ({ displayName }) => {
      toast.info(`${displayName} joined the room`)
      setEvent(prev => prev ? { ...prev, participantCount: prev.participantCount + 1 } : null)
    })

    socket.on('new_item', (item) => {
      setItems(prev => [...prev, item])
      toast.info('New poll question added!')
    })

    socket.on('answer_recorded', (p) => {
      setLiveVoteCounts(prev => ({
        ...prev,
        [p.optionId]: p.newVoteCount as number
      }))
    })

    socket.on('presence_update', ({ count }) => {
      setEvent(prev => prev ? { ...prev, participantCount: count } : null)
    })
    
    socket.on('error', ({ message }) => {
      toast.error(message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [participant, joinSlug])

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinSlug) return
    
    // Auth check if needed
    if (event?.authOnly && !session) {
      toast.error('Authentication required to join this room')
      return
    }

    if (!event) return

    setJoining(true)
    try {
      const res = await api.joinBanterRoom(event.id, displayName)
      setParticipant(res)
      setEvent(prev => prev ? { ...prev, participantCount: prev.participantCount + 1 } : null)
      localStorage.setItem(`banter_token_${joinSlug}`, res.sessionToken)
      toast.success('Joined successfully')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : 'Join failed')
    } finally {
      setJoining(false)
    }
  }

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !participant || !joinSlug) return

    setSending(true)
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { content: message.trim() })
      } else {
        // Fallback to REST
        await api.sendBanterMessage(event!.id, message.trim(), participant.sessionToken)
      }
      setMessage('')
    } catch (ex) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const loadMore = async () => {
    if (!nextCursor || loadingMore || !event) return
    setLoadingMore(true)
    try {
      const data = await api.listBanterMessages(event.id, { cursor: nextCursor, limit: 50 })
      setMessages(prev => [...data.messages.reverse(), ...prev])
      setNextCursor(data.nextCursor)
    } catch (e) {
      toast.error('Failed to load older messages')
    } finally {
      setLoadingMore(false)
    }
  }



  const [busy, setBusy] = useState(false)

  const handleSaveMeta = async (data: any) => {
    if (!event || !joinSlug) return
    setBusy(true)
    try {
      const ev = await api.updateEvent(event.id, data)
      setEvent({ ...ev, participantCount: event.participantCount })
      toast.success('Settings saved')
    } catch (e) {
      toast.error('Save failed')
    } finally {
      setBusy(false)
    }
  }


  const resetLink = async () => {
    if (!event) return
    try {
      const res = await api.resetBanterLink(event.id)
      toast.success('Link reset — share the new URL')
      navigate(`/room/${res.joinSlug}`, { replace: true })
    } catch (e) {
      toast.error('Failed to reset link')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Entering the banter room...</p>
      </div>
    )
  }

  if (!event) return null

  // Join View
  if (!participant) {
    return (
      <div className="max-w-md mx-auto py-10">
        <Card className="shadow-xl border-primary/20 overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">{event.title}</CardTitle>
              <CardDescription>{event.description || 'Welcome to the banter room!'}</CardDescription>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {event.participantCount} online
              </div>
              {event.isAnonymous && (
                <div className="flex items-center gap-1 text-orange-500 font-medium">
                  <Ghost className="h-4 w-4" />
                  Anonymous
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">How should we call you?</Label>
                <Input
                  id="displayName"
                  placeholder="Enter a display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className="text-center text-lg h-12"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-medium text-primary-foreground/80" disabled={joining}>
                {joining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Join Banter'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/50 py-3 text-center justify-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {event.authOnly ? 'Authentication Required' : 'Public Access'}
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Chat View
  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-bold text-lg leading-none">{event.title}</h1>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-30 hover:opacity-100 transition-opacity"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied!')
                }}
              >
                <LinkIcon className="h-3 w-3" />
              </Button>
            </div>
            {event.description && <p className="text-xs text-muted-foreground mb-1">{event.description}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.participantCount} participants
              </span>
              {event.isAnonymous && (
                <span className="flex items-center gap-1 text-orange-500">
                  <Ghost className="h-3 w-3" />
                  Anonymous Room
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session?.user?.id === event.creatorId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied!')
                }}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Copy Invite Link
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={resetLink}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Invite Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Layout: Split on LG, Tabs on Mobile */}
      <div className="flex-1 min-h-0">
        {/* Desktop: Side-by-Side */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 h-full">
          {/* Chat Column */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
             <ChatView 
                messages={messages} 
                participant={participant} 
                event={event} 
                scrollRef={scrollRef} 
                nextCursor={nextCursor} 
                loadingMore={loadingMore} 
                loadMore={loadMore} 
                message={message} 
                setMessage={setMessage} 
                onSend={onSend} 
                sending={sending} 
              />
          </div>

          {/* Polls Column */}
          <div className="lg:col-span-5 flex flex-col min-h-0 overflow-auto">
              <div className="space-y-6 pb-6">
                <div className="space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Questions</h2>
                  {items.length === 0 ? (
                    <EmptyPollsState />
                  ) : (
                    <div className="space-y-4">
                      {items.map(item => (
                        <BanterItemCard
                          key={item.id}
                          item={item}
                          eventId={event.id}
                          sessionToken={participant?.sessionToken}
                          liveVoteCounts={liveVoteCounts}
                        />
                      ))}
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Mobile/Tablet: Tabs */}
        <div className="lg:hidden h-full flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className={`grid w-full ${isCreator ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="polls" className="gap-2">
                <BarChart className="h-4 w-4" /> Polls
                {items.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{items.length}</Badge>}
              </TabsTrigger>
              {isCreator && (
                <TabsTrigger value="manage" className="gap-2">
                  <Settings2 className="h-4 w-4" /> Manage
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-2">
              <ChatView 
                messages={messages} 
                participant={participant} 
                event={event} 
                scrollRef={scrollRef} 
                nextCursor={nextCursor} 
                loadingMore={loadingMore} 
                loadMore={loadMore} 
                message={message} 
                setMessage={setMessage} 
                onSend={onSend} 
                sending={sending} 
              />
            </TabsContent>

            <TabsContent value="polls" className="flex-1 overflow-auto mt-2 px-1">
              <div className="space-y-6 pb-20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Poll Items</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <EmptyPollsState />
                ) : (
                  <div className="space-y-4">
                    {items.map(item => (
                      <BanterItemCard
                        key={item.id}
                        item={item}
                        eventId={event.id}
                        sessionToken={participant?.sessionToken}
                        liveVoteCounts={liveVoteCounts}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {isCreator && (
              <TabsContent value="manage" className="flex-1 overflow-auto mt-2 px-1">
                <ManageTab
                  event={event}
                  busy={busy}
                  onSaveMeta={handleSaveMeta}
                  onStart={() => api.startEvent(event.id).then(ev => setEvent({ ...ev, participantCount: event.participantCount }))}
                  onComplete={() => api.completeEvent(event.id).then(ev => setEvent({ ...ev, participantCount: event.participantCount }))}
                  onPublish={() => api.publishEvent(event.id).then(ev => setEvent({ ...ev, participantCount: event.participantCount }))}
                  onDelete={() => api.deleteEvent(event.id).then(() => navigate('/'))}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
