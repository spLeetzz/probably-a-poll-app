import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as api from "../api/events-api";
import type {
  Analytics,
  Event,
  ItemWithOptions,
  Participant,
  OptionInput,
} from "../api/events-api";
import {
  useEventRealtime,
  type ResponseNewPayload,
  type ResponseCountPayload,
} from "../hooks/useEventRealtime";
import { authClient } from "../lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2,
  MessageSquare,
  Settings2,
  Plus,
  ArrowLeft,
  Copy,
  Wifi,
  WifiOff,
  RefreshCcw,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { ParticipateTab } from "./event-detail/ParticipateTab";
import { ResultsTab } from "./event-detail/ResultsTab";
import { ManageTab } from "./event-detail/ManageTab";
import { ParticipantsTab } from "./event-detail/ParticipantsTab";
import { QuestionsTab } from "./event-detail/QuestionsTab";

const EMPTY_ANALYTICS: Analytics = { totalResponses: 0, items: [] };

function statusBadge(s: string) {
  if (s === "running")
    return <Badge className='bg-green-500 hover:bg-green-600'>Live</Badge>;
  if (s === "completed") return <Badge variant='secondary'>Completed</Badge>;
  return <Badge variant='outline'>Draft</Badge>;
}

export function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId: rawId } = useParams();
  const eventId = rawId ? decodeURIComponent(rawId) : "";
  const { data: session } = authClient.useSession();

  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<ItemWithOptions[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [optionsByItem, setOptionsByItem] = useState<
    Record<string, OptionInput[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Participate state
  const [pick, setPick] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [hasResponded, setHasResponded] = useState(() =>
    eventId
      ? localStorage.getItem(`pollapp:responded:${eventId}`) === "1"
      : false,
  );

  const [activeTab, setActiveTab] = useState("participate");
  const [, setTabInitialized] = useState(false);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const itemTextRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const uid = session?.user?.id;
  const isAuthenticated = Boolean(session?.user);
  const isAnonymous = Boolean(session?.user?.isAnonymous);
  const isCreator = useMemo(
    () => Boolean(event && uid && uid === event.creatorId),
    [event, uid],
  );
  const canViewResults = useMemo(() => {
    if (!event) return false;
    if (isCreator) return true;
    if (event.resultsVisibility !== "public") return false;
    if (event.authOnly && (!isAuthenticated || isAnonymous)) return false;
    return true;
  }, [event, isCreator, isAuthenticated, isAnonymous]);

  // Debounced analytics refresh, avoids hammering API on rapid realtime events
  const analyticsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scheduleAnalyticsRefresh = useCallback(() => {
    if (!eventId || !canViewResults || isAnonymous) return;
    if (analyticsDebounceRef.current)
      clearTimeout(analyticsDebounceRef.current);
    analyticsDebounceRef.current = setTimeout(async () => {
      try {
        setAnalytics(await api.getAnalytics(eventId));
      } catch {
        /* ignore */
      }
    }, 800);
  }, [eventId, canViewResults, isAnonymous]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!eventId) return;

      // Yield slightly to avoid "synchronous setState in effect" lint warnings
      if (!silent) {
        await Promise.resolve();
        setLoading(true);
      }

      try {
        const [ev, its] = await Promise.all([
          api.getEvent(eventId),
          api.listItems(eventId),
        ]);

        const isEventCreator = Boolean(uid && uid === ev.creatorId);
        
        let canViewAna = false;
        if (isEventCreator) canViewAna = true;
        else if (ev.resultsVisibility === "public") {
           canViewAna = !(ev.authOnly && (!isAuthenticated || isAnonymous));
        }

        const [ana, pts] = await Promise.all([
          canViewAna ? api.getAnalytics(eventId).catch(() => EMPTY_ANALYTICS) : Promise.resolve(EMPTY_ANALYTICS),
          isEventCreator ? api.listParticipants(eventId).catch(() => []) : Promise.resolve([]),
        ]);

        setEvent(ev);
        setItems(its);
        setAnalytics(ana);
        setParticipants(pts);

        if (ev.type === 'banter' && ev.joinSlug) {
          navigate(`/room/${encodeURIComponent(ev.joinSlug)}`, { replace: true });
          return;
        }

        setTabInitialized((prev) => {
          if (!prev) {
            if (uid === ev.creatorId) setActiveTab("manage");
            return true;
          }
          return prev;
        });

        setOptionsByItem((prev) => {
          const next = { ...prev };
          for (const it of its) {
            if (!next[it.id])
              next[it.id] = it.options.map((o) => ({
                id: o.id,
                text: o.text,
                order: o.order,
              }));
          }
          return next;
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [eventId, uid],
  );

  useEffect(() => {
    const init = async () => {
      await Promise.resolve();
      void refresh();
    };
    void init();
  }, [refresh]);

  // Real-time: option vote updates
  const onResponseNew = useCallback(
    (p: ResponseNewPayload) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === p.itemId
            ? {
              ...it,
              options: it.options.map((o) =>
                o.id === p.optionId ? { ...o, voteCount: p.newVoteCount } : o,
              ),
            }
            : it,
        ),
      );
      setAnalytics((prev) => ({
        ...prev,
        totalResponses: p.totalResponses,
        items: prev.items.map((row) =>
          row.itemId === p.itemId
            ? {
              ...row,
              options: row.options.map((o) =>
                o.optionId === p.optionId
                  ? { ...o, voteCount: p.newVoteCount }
                  : o,
              ),
            }
            : row,
        ),
      }));
      scheduleAnalyticsRefresh();
    },
    [scheduleAnalyticsRefresh],
  );

  const onResponseCount = useCallback(
    (p: ResponseCountPayload) => {
      setAnalytics((prev) => ({ ...prev, totalResponses: p.totalResponses }));
      scheduleAnalyticsRefresh();
    },
    [scheduleAnalyticsRefresh],
  );

  const onParticipantStatusUpdated = useCallback(
    (p: { participantId: string; status: "approved" | "rejected" }) => {
      setParticipants((prev) =>
        prev.map((pt) =>
          pt.id === p.participantId ? { ...pt, status: p.status } : pt,
        ),
      );
    },
    [],
  );

  const liveStatus = useEventRealtime({
    eventId,
    event,
    isCreator,
    isAnonymous,
    enabled: Boolean(eventId && event),
    onResponseNew,
    onResponseCount,
    onParticipantStatusUpdated,
  });

  const act = async (fn: () => Promise<Event>, label: string) => {
    setBusy(true);
    try {
      const ev = await fn();
      setEvent(ev);
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMeta = async (
    data: Parameters<typeof api.updateEvent>[1],
  ) => {
    if (!eventId) return;
    setBusy(true);
    try {
      const ev = await api.updateEvent(eventId, data);
      setEvent(ev);
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAddItem = async (text: string, mandatory: boolean) => {
    if (!eventId) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: ItemWithOptions = {
      id: tempId,
      eventId,
      text,
      order: items.length + 1,
      isMandatory: mandatory,
      mediaUrl: null,
      correctAnswer: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: []
    };
    setItems(prev => [...prev, newItem]);

    try {
      await api.createItem(eventId, {
        text,
        order: items.length + 1,
        isMandatory: mandatory,
      });
      // Toast not needed for every background success if it's seamless
      await refresh(true);
    } catch (e) {
      setItems(prev => prev.filter(it => it.id !== tempId));
      toast.error(e instanceof Error ? e.message : "Add failed");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!eventId) return;
    setBusy(true);
    try {
      await api.deleteItem(eventId, id);
      toast.success("Deleted.");
      await refresh(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateItem = async (id: string, data: { text?: string; isMandatory?: boolean }) => {
    if (!eventId) return;
    try {
      await api.updateItem(eventId, id, data);
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...data } : it)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleSaveOptions = async (itemId: string, opts: OptionInput[]) => {
    if (!eventId) return;
    if (opts.length > 0 && opts.length < 2) {
      toast.error("Need at least 2 options.");
      return;
    }
    setBusy(true);
    try {
      await api.setItemOptions(eventId, itemId, opts);
      toast.success("Options saved.");
      await refresh(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    setBusy(true);
    try {
      await api.deleteEvent(eventId);
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !event) return;
    // Block anonymous/unauthenticated users only if the event requires authentication
    if (event.authOnly && (!isAuthenticated || isAnonymous)) {
      toast.error("Please sign in to submit a response.");
      return;
    }
    if (!isAuthenticated && !isAnonymous) {
      toast.error("Please sign in to submit a response.");
      return;
    }
    const answers: api.AnswerPayload[] = [];
    for (const it of items) {
      const opts = it.options ?? [];
      const optionId = pick[it.id];
      const text = textAnswers[it.id]?.trim();
      if (it.isMandatory) {
        if (opts.length > 0 && !optionId) {
          toast.error(`Select an option: "${it.text}"`);
          return;
        }
        if (opts.length === 0 && !text) {
          toast.error(`Answer required: "${it.text}"`);
          return;
        }
      }
      if (opts.length > 0 && optionId)
        answers.push({ itemId: it.id, optionId });
      else if (opts.length === 0 && text)
        answers.push({ itemId: it.id, textAnswer: text });
    }
    if (!answers.length) {
      toast.error("Provide at least one answer.");
      return;
    }
    setBusy(true);
    try {
      await api.submitResponse(eventId, answers);
      localStorage.setItem(`pollapp:responded:${eventId}`, "1");
      setHasResponded(true);
      toast.success("Response submitted!");
      setPick({});
      setTextAnswers({});
      await refresh(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveJoin = async (id: string) => {
    if (!eventId) return;
    try {
      await api.updateParticipantStatus(eventId, id, "approved");
      setParticipants((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleRejectJoin = async (id: string) => {
    if (!eventId) return;
    try {
      await api.updateParticipantStatus(eventId, id, "rejected");
      setParticipants((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  if (loading) {
    return (
      <div className='space-y-6 max-w-4xl mx-auto'>
        <Skeleton className='h-10 w-64' />
        <Skeleton className='h-6 w-40' />
        <Skeleton className='h-[400px] w-full rounded-xl' />
      </div>
    );
  }

  if (!event) {
    return (
      <div className='flex flex-col items-center justify-center py-24 gap-4'>
        <p className='text-xl font-semibold'>Event not found</p>
        <Button asChild variant='outline'>
          <Link to='/'>Go back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Header */}
      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' asChild className='h-8 w-8'>
            <Link to='/'>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <div className='flex items-center gap-2 flex-1 min-w-0'>
            {statusBadge(event.status)}
            <Badge variant='outline' className='text-[10px] uppercase'>
              {event.type}
            </Badge>
            {liveStatus === "live" ? (
              <span className='flex items-center gap-1 text-sm text-green-600 font-medium ml-auto'>
                <Wifi className='h-3 w-3' /> Live
              </span>
            ) : (
              <span className='flex items-center gap-1 text-sm text-muted-foreground ml-auto'>
                <WifiOff className='h-3 w-3' /> Offline
              </span>
            )}
          </div>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <div className="flex items-center gap-2">
              <h1 className='text-4xl font-bold tracking-tight truncate'>
                {event.title}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-20 hover:opacity-100 transition-opacity"
                onClick={copyLink}
              >
                <LinkIcon className="h-3 w-3" />
              </Button>
            </div>
            {event.description && (
              <p className='text-muted-foreground mt-1'>{event.description}</p>
            )}
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => void refresh()}
              title='Refresh'
            >
              <RefreshCcw className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              onClick={copyLink}
              title='Copy link'
            >
              <Copy className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className='w-full bg-transparent p-0 border-b border-white/5'>
          <TabsTrigger value='participate' className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'>
            <MessageSquare className='h-4 w-4' /> Participate
          </TabsTrigger>
          <TabsTrigger value='analytics' className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'>
            <BarChart2 className='h-4 w-4' /> Analytics
          </TabsTrigger>
          {isCreator && (
            <>
              <TabsTrigger value='questions' className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'>
                <Plus className='h-4 w-4' /> Questions
              </TabsTrigger>
              <TabsTrigger value='manage' className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'>
                <Settings2 className='h-4 w-4' /> Manage
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value='participate' className='mt-6'>
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
            onPick={(itemId, optionId) =>
              setPick((p) => ({ ...p, [itemId]: optionId }))
            }
            onText={(itemId, val) =>
              setTextAnswers((p) => ({ ...p, [itemId]: val }))
            }
            onSubmit={handleSubmitResponse}
          />
        </TabsContent>

        {/* Analytics tab always visible , content inside handles private/anon gating */}
        <TabsContent value='analytics' className='mt-6'>
          <ResultsTab
            analytics={analytics}
            totalResponses={analytics.totalResponses}
            canViewResults={canViewResults}
            isPrivate={event.resultsVisibility === "private"}
            isAuthenticated={isAuthenticated && !isAnonymous}
            eventStatus={event.status}
            itemsCount={items.length}
            busy={busy}
            onStart={() =>
              act(() => api.startEvent(eventId), "Event started!")
            }
          />
        </TabsContent>

        {isCreator && (
          <TabsContent value='questions' className='mt-6'>
            <QuestionsTab
              items={items}
              optionsByItem={optionsByItem}
              isEditable={event.status === 'pending'}
              busy={busy}
              savingItems={savingItems}
              onAddItem={() => handleAddItem("New Question", true)}
              onDeleteItem={handleDeleteItem}
              onUpdateItemText={(id, text) => {
                if (itemTextRefs.current[id]) clearTimeout(itemTextRefs.current[id]);
                setSavingItems(s => new Set(s).add(id));
                itemTextRefs.current[id] = setTimeout(async () => {
                  try { await handleUpdateItem(id, { text }); }
                  finally { setSavingItems(s => { const n = new Set(s); n.delete(id); return n; }); }
                }, 1000);
              }}
              onUpdateItemMandatory={async (id, m) => {
                setSavingItems(s => new Set(s).add(id));
                try { await handleUpdateItem(id, { isMandatory: m }); }
                finally { setSavingItems(s => { const n = new Set(s); n.delete(id); return n; }); }
              }}
              onSaveOptions={(itemId, opts) => {
                setOptionsByItem(prev => ({ ...prev, [itemId]: opts }));
                if (debounceRefs.current[itemId]) clearTimeout(debounceRefs.current[itemId]);
                setSavingItems(s => new Set(s).add(itemId));
                debounceRefs.current[itemId] = setTimeout(async () => {
                  try { if (opts.length === 0 || opts.length >= 2) await handleSaveOptions(itemId, opts); }
                  finally { setSavingItems(s => { const n = new Set(s); n.delete(itemId); return n; }); }
                }, 1500);
              }}
            />
          </TabsContent>
        )}

        {event.joinMode === "approval" && isCreator && (
          <TabsContent value='participants' className='mt-6'>
            <ParticipantsTab
              participants={participants}
              onApprove={handleApproveJoin}
              onReject={handleRejectJoin}
            />
          </TabsContent>
        )}

        {isCreator && (
          <TabsContent value='manage' className='mt-6'>
            <ManageTab
              key={event.id}
              event={event}
              busy={busy}
              onSaveMeta={handleSaveMeta}
              onStart={() =>
                act(() => api.startEvent(eventId), "Event started!")
              }
              onComplete={() =>
                act(() => api.completeEvent(eventId), "Event completed!")
              }
              onPublish={() =>
                act(() => api.publishEvent(eventId), "Event published!")
              }
              onDelete={handleDelete}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
