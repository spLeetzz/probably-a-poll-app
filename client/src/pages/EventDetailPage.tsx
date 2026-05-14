import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/events-api'
import type { Analytics, Event, ItemWithOptions, Participant, OptionInput } from '../api/events-api'
import { useEventRealtime, type ResponseNewPayload, type ResponseCountPayload } from '../hooks/useEventRealtime'
import { authClient } from '../lib/auth-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart2, MessageSquare, Settings2, ArrowLeft, Copy, Wifi, WifiOff, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ParticipateTab } from './event-detail/ParticipateTab'
import { ResultsTab } from './event-detail/ResultsTab'
import { ManageTab } from './event-detail/ManageTab'
import { ParticipantsTab } from './event-detail/ParticipantsTab'


const EMPTY_ANALYTICS: Analytics = { totalResponses: 0, items: [] }

function statusBadge(s: string) {
  if (s === 'running') return <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>
  if (s === 'completed') return <Badge variant="secondary">Completed</Badge>
  return <Badge variant="outline">Draft</Badge>
}

export function EventDetailPage() {
  const navigate = useNavigate()
  const { eventId: rawId } = useParams()
  const eventId = rawId ? decodeURIComponent(rawId) : ''
  const { data: session } = authClient.useSession()

  const [event, setEvent] = useState<Event | null>(null)
  const [items, setItems] = useState<ItemWithOptions[]>([])
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [optionsByItem, setOptionsByItem] = useState<Record<string, OptionInput[]>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Participate state
  const [pick, setPick] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [hasResponded, setHasResponded] = useState(() =>
    eventId ? localStorage.getItem(`pollapp:responded:${eventId}`) === '1' : false
  )

  const [activeTab, setActiveTab] = useState('participate')
  const [tabInitialized, setTabInitialized] = useState(false)

  const uid = session?.user?.id
  const isAuthenticated = Boolean(session?.user)
  const isAnonymous = Boolean(session?.user?.isAnonymous)
  const isCreator = useMemo(() => Boolean(event && uid && uid === event.creatorId), [event, uid])
  const canViewResults = useMemo(() => {
    if (!event) return false
    if (isCreator) return true
    if (event.resultsVisibility !== 'public') return false
    if (event.authOnly && (!isAuthenticated || isAnonymous)) return false
    return true
  }, [event, isCreator, isAuthenticated, isAnonymous])

  // Default creator to manage tab initially
  useEffect(() => {
    if (event && !loading && !tabInitialized) {
      if (isCreator) setActiveTab('manage')
      setTabInitialized(true)
    }
  }, [event, loading, isCreator, tabInitialized])

  // Debounced analytics refresh, avoids hammering API on rapid realtime events
  const analyticsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleAnalyticsRefresh = useCallback(() => {
    if (!eventId || !canViewResults || isAnonymous) return
    if (analyticsDebounceRef.current) clearTimeout(analyticsDebounceRef.current)
    analyticsDebounceRef.current = setTimeout(async () => {
      try { setAnalytics(await api.getAnalytics(eventId)) } catch { /* ignore */ }
    }, 800)
  }, [eventId, canViewResults, isAnonymous])

  const refresh = useCallback(async (silent = false) => {
    if (!eventId) return
    if (!silent) setLoading(true)
    try {
      const [ev, its] = await Promise.all([api.getEvent(eventId), api.listItems(eventId)])
      setEvent(ev)
      setItems(its)
      setOptionsByItem(prev => {
        const next = { ...prev }
        for (const it of its) {
          if (!next[it.id]) next[it.id] = it.options.map(o => ({ id: o.id, text: o.text, order: o.order }))
        }
        return next
      })

      const canSeeResults = ev.resultsVisibility === 'public' || uid === ev.creatorId
      if (canSeeResults) {
        try { setAnalytics(await api.getAnalytics(eventId)) } catch { /* ignore */ }
      }

      if (ev.joinMode === 'approval' && uid === ev.creatorId) {
        try { setParticipants(await api.listParticipants(eventId)) } catch { /* ignore */ }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [eventId, uid])

  useEffect(() => { void refresh() }, [refresh])

  // Real-time: option vote updates
  const onResponseNew = useCallback((p: ResponseNewPayload) => {
    setItems(prev => prev.map(it =>
      it.id === p.itemId
        ? { ...it, options: it.options.map(o => o.id === p.optionId ? { ...o, voteCount: p.newVoteCount } : o) }
        : it
    ))
    setAnalytics(prev => ({
      ...prev,
      totalResponses: p.totalResponses,
      items: prev.items.map(row =>
        row.itemId === p.itemId
          ? { ...row, options: row.options.map(o => o.optionId === p.optionId ? { ...o, voteCount: p.newVoteCount } : o) }
          : row
      )
    }))
    scheduleAnalyticsRefresh()
  }, [scheduleAnalyticsRefresh])

  const onResponseCount = useCallback((p: ResponseCountPayload) => {
    setAnalytics(prev => ({ ...prev, totalResponses: p.totalResponses }))
    scheduleAnalyticsRefresh()
  }, [scheduleAnalyticsRefresh])

  const onParticipantStatusUpdated = useCallback((p: { participantId: string, status: 'approved' | 'rejected' }) => {
    setParticipants(prev => prev.map(pt => pt.id === p.participantId ? { ...pt, status: p.status } : pt))
  }, [])

  const liveStatus = useEventRealtime({
    eventId, event, isCreator, isAnonymous,
    enabled: Boolean(eventId && event),
    onResponseNew,
    onResponseCount,
    onParticipantStatusUpdated,
  })

  const act = async (fn: () => Promise<Event>, label: string) => {
    setBusy(true)
    try { const ev = await fn(); setEvent(ev); toast.success(label) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy(false) }
  }

  const handleSaveMeta = async (data: Parameters<typeof api.updateEvent>[1]) => {
    if (!eventId) return
    setBusy(true)
    try { const ev = await api.updateEvent(eventId, data); setEvent(ev); toast.success('Settings saved.') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') }
    finally { setBusy(false) }
  }

  const handleAddItem = async (text: string, mandatory: boolean) => {
    if (!eventId) return
    setBusy(true)
    try {
      await api.createItem(eventId, { text, order: items.length + 1, isMandatory: mandatory })
      toast.success('Question added.')
      await refresh(true)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Add failed') }
    finally { setBusy(false) }
  }

  const handleDeleteItem = async (id: string) => {
    if (!eventId) return
    setBusy(true)
    try { await api.deleteItem(eventId, id); toast.success('Deleted.'); await refresh(true) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed') }
    finally { setBusy(false) }
  }

  const handleSaveOptions = async (itemId: string, opts: OptionInput[]) => {
    if (!eventId) return
    if (opts.length > 0 && opts.length < 2) { toast.error('Need at least 2 options.'); return }
    setBusy(true)
    try { await api.setItemOptions(eventId, itemId, opts); toast.success('Options saved.'); await refresh(true) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') }
    finally { setBusy(false) }
  }

  const handleDelete = async () => {
    if (!eventId) return
    setBusy(true)
    try { await api.deleteEvent(eventId); navigate('/') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); setBusy(false) }
  }

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId) return
    // Block anonymous/unauthenticated users only if the event requires authentication
    if (event.authOnly && (!isAuthenticated || isAnonymous)) {
      toast.error('Please sign in to submit a response.')
      return
    }
    if (!isAuthenticated && !isAnonymous) {
      toast.error('Please sign in to submit a response.')
      return
    }
    const answers: api.AnswerPayload[] = []
    for (const it of items) {
      const opts = it.options ?? []
      const optionId = pick[it.id]
      const text = textAnswers[it.id]?.trim()
      if (it.isMandatory) {
        if (opts.length > 0 && !optionId) { toast.error(`Select an option: "${it.text}"`); return }
        if (opts.length === 0 && !text) { toast.error(`Answer required: "${it.text}"`); return }
      }
      if (opts.length > 0 && optionId) answers.push({ itemId: it.id, optionId })
      else if (opts.length === 0 && text) answers.push({ itemId: it.id, textAnswer: text })
    }
    if (!answers.length) { toast.error('Provide at least one answer.'); return }
    setBusy(true)
    try {
      await api.submitResponse(eventId, answers)
      localStorage.setItem(`pollapp:responded:${eventId}`, '1')
      setHasResponded(true)
      toast.success('Response submitted!')
      setPick({})
      setTextAnswers({})
      await refresh(true)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Submit failed') }
    finally { setBusy(false) }
  }

  const handleApproveJoin = async (id: string) => {
    if (!eventId) return
    try { await api.updateParticipantStatus(eventId, id, 'approved'); setParticipants(p => p.map(r => r.id === id ? { ...r, status: 'approved' } : r)) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleRejectJoin = async (id: string) => {
    if (!eventId) return
    try { await api.updateParticipantStatus(eventId, id, 'rejected'); setParticipants(p => p.map(r => r.id === id ? { ...r, status: 'rejected' } : r)) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied!')
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-xl font-semibold">Event not found</p>
        <Button asChild variant="outline"><Link to="/">Go back</Link></Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {statusBadge(event.status)}
            <Badge variant="outline" className="text-[10px] uppercase">{event.type}</Badge>
            {liveStatus === 'live'
              ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium ml-auto"><Wifi className="h-3 w-3" /> Live</span>
              : <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto"><WifiOff className="h-3 w-3" /> Offline</span>}
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight truncate">{event.title}</h1>
            {event.description && <p className="text-muted-foreground mt-1">{event.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="icon" onClick={() => void refresh()} title="Refresh">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={copyLink} title="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="participate" className="flex-1 gap-1.5">
            <MessageSquare className="h-4 w-4" /> Participate
          </TabsTrigger>
          <TabsTrigger value="results" className="flex-1 gap-1.5">
            <BarChart2 className="h-4 w-4" /> Results
          </TabsTrigger>
          {isCreator && (
            <TabsTrigger value="manage" className="flex-1 gap-1.5">
              <Settings2 className="h-4 w-4" /> Manage
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="participate" className="mt-6">
          <ParticipateTab
            eventStatus={event.status}
            authOnly={event.authOnly}
            isAuthenticated={isAuthenticated}
            isAnonymous={isAnonymous}
            hasResponded={hasResponded}
            participantStatus={event.participant?.status}
            items={items}
            pick={pick}
            textAnswers={textAnswers}
            busy={busy}
            onPick={(itemId, optionId) => setPick(p => ({ ...p, [itemId]: optionId }))}
            onText={(itemId, val) => setTextAnswers(p => ({ ...p, [itemId]: val }))}
            onSubmit={handleSubmitResponse}
          />
        </TabsContent>

        {/* Results tab always visible — content inside handles private/anon gating */}
        <TabsContent value="results" className="mt-6">
          <ResultsTab
            analytics={analytics}
            totalResponses={analytics.totalResponses}
            canViewResults={canViewResults}
            isPrivate={event.resultsVisibility === 'private'}
            isAuthenticated={isAuthenticated && !isAnonymous}
          />
        </TabsContent>

        {event.joinMode === 'approval' && isCreator && (
          <TabsContent value="participants" className="mt-6">
            <ParticipantsTab
              participants={participants}
              onApprove={handleApproveJoin}
              onReject={handleRejectJoin}
            />
          </TabsContent>
        )}

        {isCreator && (
          <TabsContent value="manage" className="mt-6">
            <ManageTab
              event={event}
              items={items}
              optionsByItem={optionsByItem}
              busy={busy}
              onSaveMeta={handleSaveMeta}
              onStart={() => act(() => api.startEvent(eventId), 'Event started!')}
              onComplete={() => act(() => api.completeEvent(eventId), 'Event completed!')}
              onPublish={() => act(() => api.publishEvent(eventId), 'Event published!')}
              onDelete={handleDelete}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onSaveOptions={handleSaveOptions}
              onOptionsByItemChange={setOptionsByItem}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
