import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import * as api from "../api/events-api";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Ghost,
  Loader2,
  MessageSquare,
  BarChart2,
  Settings2,
  Send,
  Plus,
  RefreshCcw,
  Wifi,
  ArrowRight,
  ArrowLeft,
  WifiOff,
  LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BanterItemCard } from "@/components/BanterItemCard";
import { ManageTab } from "./event-detail/ManageTab";
import { InlinePollCreator } from "@/components/inline-poll-creator";

const statusBadge = (s: string) => {
  switch (s) {
    case "pending":
      return (
        <Badge variant='secondary' className='text-[10px] uppercase'>
          Pending
        </Badge>
      );
    case "running":
      return (
        <Badge className='bg-green-600 text-[10px] uppercase hover:bg-green-600'>
          Live
        </Badge>
      );
    case "completed":
      return (
        <Badge className='bg-blue-600 text-[10px] uppercase hover:bg-blue-600'>
          Completed
        </Badge>
      );
    default:
      return (
        <Badge variant='outline' className='text-[10px] uppercase'>
          {s}
        </Badge>
      );
  }
};

interface BanterServerToClient {
  new_message: (msg: api.BanterMessage) => void;
  participant_joined: (payload: {
    displayName: string;
    participantId: string;
  }) => void;
  room_joined: (payload: { eventId: string }) => void;
  new_item: (item: api.ItemWithOptions) => void;
  new_text_reply: (payload: { itemId: string; text: string }) => void;
  answer_recorded: (payload: {
    itemId: string;
    optionId: string;
    newVoteCount: number;
    totalResponses: number;
  }) => void;
  presence_update: (payload: { count: number }) => void;
  error: (payload: { message: string }) => void;
}

interface BanterClientToServer {
  join_room: (payload: { joinSlug: string; sessionToken: string }) => void;
  send_message: (payload: { content: string }) => void;
  broadcast_item: (payload: { item: Record<string, unknown> }) => void;
  broadcast_text_reply: (payload: { itemId: string; text: string }) => void;
}

export function BanterRoomPage() {
  const { joinSlug } = useParams<{ joinSlug: string }>();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const [event, setEvent] = useState<
    (api.Event & { participantCount: number }) | null
  >(null);
  const [messages, setMessages] = useState<api.BanterMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [displayName, setDisplayName] = useState(session?.user?.name || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket<
    BanterServerToClient,
    BanterClientToServer
  > | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [participant, setParticipant] = useState<api.BanterJoinResponse | null>(
    null,
  );
  const [items, setItems] = useState<api.ItemWithOptions[]>([]);
  const [liveVoteCounts, setLiveVoteCounts] = useState<Record<string, number>>(
    {},
  );
  const [textReplies, setTextReplies] = useState<Record<string, string[]>>({});

  const isCreator = session?.user?.id && event?.creatorId === session.user.id;

  const initRoom = useCallback(async () => {
    if (!joinSlug) return;
    setLoading(true);
    setMessages([]);
    setLiveVoteCounts({});
    try {
      const data = await api.getBanterRoom(joinSlug);
      setEvent(data);

      const loadExtras = async () => {
        try {
          const msgsData = await api.listBanterMessages(data.id, { limit: 50 });
          setMessages(msgsData.messages.reverse());
        } catch {
          /* silence */
        }

        try {
          const itsData = await api.listItems(data.id);
          setItems(itsData.reverse());
        } catch {
          /* silence */
        }
      };
      void loadExtras();

      if (data.participant) {
        const p = {
          participantId: data.participant.id,
          sessionToken: data.participant.sessionToken || "",
          displayName: data.participant.displayName || "",
          alreadyJoined: true,
        };
        setParticipant(p);
        if (p.sessionToken) {
          localStorage.setItem(`banter_token_${joinSlug}`, p.sessionToken);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load room");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [joinSlug, navigate]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  useEffect(() => {
    void initRoom();
  }, [initRoom]);

  useEffect(() => {
    if (!participant || !joinSlug) return;

    const socket: Socket<BanterServerToClient, BanterClientToServer> = io(
      "/banter",
      {
        path: "/socket.io",
        withCredentials: true,
        transports: ["websocket", "polling"],
      },
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join_room", {
        joinSlug,
        sessionToken: participant.sessionToken,
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        if (scrollRef.current)
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });

    socket.on("participant_joined", ({ displayName }) => {
      toast.info(`${displayName} joined`);
      setEvent((prev) =>
        prev ? { ...prev, participantCount: prev.participantCount + 1 } : null,
      );
    });

    socket.on("new_item", (item) => {
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [item, ...prev];
      });
      toast.info("New banter question added!");
    });

    socket.on("answer_recorded", (p) => {
      setLiveVoteCounts((prev) => ({
        ...prev,
        [p.optionId]: p.newVoteCount as number,
      }));
    });

    socket.on("new_text_reply", ({ itemId, text }) => {
      setTextReplies((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), text],
      }));
    });

    socket.on("presence_update", ({ count }) => {
      setEvent((prev) => (prev ? { ...prev, participantCount: count } : null));
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [participant, joinSlug]);

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setJoining(true);
    try {
      const res = await api.joinBanterRoom(event.id, displayName);
      setParticipant(res);
      localStorage.setItem(`banter_token_${joinSlug}`, res.sessionToken);
      toast.success("Joined");
    } catch (ex) {
      toast.error("Join failed");
    } finally {
      setJoining(false);
    }
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !participant) return;
    setSending(true);
    try {
      socketRef.current?.emit("send_message", { content: message.trim() });
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleTextReply = async (itemId: string, replyText: string) => {
    if (!participant) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setTextReplies((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), replyText],
    }));

    socketRef.current?.emit("broadcast_text_reply", {
      itemId,
      text: replyText,
    });
  };

  const onAddBanterItem = async (
    text: string,
    mandatory: boolean,
    options: string[],
  ) => {
    if (!event || !participant) return;
    setBusy(true);
    try {
      const newItem = await api.createItem(
        event.id,
        {
          text,
          order: items.length + 1,
          isMandatory: mandatory,
        },
        participant.sessionToken,
      );

      let finalItem: api.ItemWithOptions = { ...newItem, options: [] };

      if (options.length > 0) {
        const optionInputs = options.map((opt, i) => ({
          text: opt,
          order: i + 1,
        }));
        const savedOptions = await api.setItemOptions(
          event.id,
          newItem.id,
          optionInputs,
          participant.sessionToken,
        );
        finalItem.options = savedOptions;
      }

      setItems((prev) => {
        if (prev.some((i) => i.id === newItem.id)) return prev;
        return [finalItem, ...prev];
      });

      socketRef.current?.emit("broadcast_item", {
        item: finalItem as unknown as Record<string, unknown>,
      });

      toast.success("Banter added");
    } catch (e) {
      toast.error("Failed to add banter");
    } finally {
      setBusy(false);
    }
  };

  const handleResetLink = async () => {
    if (!event) return;
    setBusy(true);
    try {
      const { joinSlug } = await api.resetBanterLink(event.id);
      setEvent((prev) => (prev ? { ...prev, joinSlug } : null));
      toast.success("Invite link has been reset!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset link");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMeta = async (data: any) => {
    if (!event) return;
    setBusy(true);
    try {
      const ev = await api.updateEvent(event.id, data);
      setEvent({ ...ev, participantCount: event.participantCount });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
        <p className='text-muted-foreground animate-pulse'>
          Entering the banter room...
        </p>
      </div>
    );
  }

  if (!event) return null;

  if (!participant) {
    return (
      <div className='max-w-md mx-auto py-10'>
        <Card className='shadow-xl border-primary/20 overflow-hidden'>
          <div className='h-2 bg-primary w-full' />
          <CardHeader className='text-center space-y-4'>
            <div className='mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center'>
              <MessageSquare className='h-8 w-8 text-primary' />
            </div>
            <div>
              <CardTitle className='text-2xl font-bold'>
                {event.title}
              </CardTitle>
              <CardDescription>
                {event.description || "Welcome to the banter room!"}
              </CardDescription>
            </div>
            <div className='flex items-center justify-center gap-4 text-sm text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <Users className='h-4 w-4' />
                {event.participantCount} online
              </div>
              {event.isAnonymous && (
                <div className='flex items-center gap-1 text-orange-500 font-medium'>
                  <Ghost className='h-4 w-4' /> Anonymous
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onJoin} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='displayName'>How should we call you?</Label>
                <Input
                  id='displayName'
                  placeholder='Enter a display name'
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className='text-center text-lg h-12'
                />
              </div>
              <Button
                type='submit'
                className='w-full h-14 text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] group'
                disabled={joining || !displayName.trim()}
              >
                {joining ? (
                  <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                ) : (
                  <span className='flex items-center gap-2'>
                    Join Banter{" "}
                    <ArrowRight className='h-4 w-4 group-hover:translate-x-1 transition-transform' />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate("/")}
            className='h-8 w-8'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2 flex-1 min-w-0'>
            {statusBadge(event.status)}
            <Badge variant='outline' className='text-[10px] uppercase'>
              {event.type}
            </Badge>
            {isConnected ? (
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
            <div className='flex items-center gap-3'>
              <h1 className='text-4xl font-bold tracking-tight truncate'>
                {event.title}
              </h1>
              <div className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-1 rounded-md'>
                <Users className='h-3 w-3' /> {event.participantCount} online
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 opacity-40 hover:opacity-100 transition-opacity'
                onClick={copyLink}
              >
                <LinkIcon className='h-4 w-4' />
              </Button>
            </div>
            {event.description && (
              <p className='text-muted-foreground mt-2'>{event.description}</p>
            )}
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => void initRoom()}
              title='Refresh'
            >
              <RefreshCcw className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              onClick={copyLink}
              title='Copy Link'
            >
              <LinkIcon className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue='chat' className='mt-6'>
        <TabsList className='w-full bg-transparent p-0 border-b border-white/5'>
          <TabsTrigger
            value='chat'
            className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'
          >
            <MessageSquare className='h-4 w-4' /> Chat
          </TabsTrigger>
          <TabsTrigger
            value='polls'
            className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'
          >
            <BarChart2 className='h-4 w-4' /> Questions
          </TabsTrigger>
          {isCreator && (
            <TabsTrigger
              value='manage'
              className='flex-1 gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-white/20 rounded-none shadow-none opacity-50 data-[state=active]:opacity-100 transition-all'
            >
              <Settings2 className='h-4 w-4' /> Manage
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value='chat'
          className='mt-6 flex flex-col h-[calc(100vh-18rem)] min-h-[500px]'
        >
          <div className='flex-1 bg-card/10 rounded-3xl border border-white/5 shadow-inner p-4 pb-6 flex flex-col min-h-0'>
            <ScrollArea className='flex-1 pr-4' ref={scrollRef}>
              <div className='space-y-6'>
                {messages.length === 0 && (
                  <div className='py-20 flex flex-col items-center justify-center text-center gap-4 opacity-20'>
                    <MessageSquare className='h-12 w-12' />
                    <p className='text-sm font-medium'>
                      No messages yet. Start the banter!
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.participantId === participant.participantId;
                  const showHeader =
                    i === 0 ||
                    messages[i - 1].participantId !== msg.participantId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col gap-1",
                        isMe ? "items-end" : "items-start",
                        !showHeader && "-mt-4",
                      )}
                    >
                      {showHeader && (
                        <div
                          className={cn(
                            "flex items-center gap-2 px-1",
                            isMe && "flex-row-reverse",
                          )}
                        >
                          <Avatar className='h-6 w-6 border shadow-sm'>
                            <AvatarFallback className='text-[8px] font-semibold bg-primary/10 text-primary'>
                              {msg.displayName.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              "text-[8px] font-semibold uppercase tracking-widest",
                              isMe
                                ? "text-primary"
                                : "text-muted-foreground/60",
                            )}
                          >
                            {isMe ? "You" : msg.displayName}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm max-w-[85%] font-medium transition-all shadow-sm border flex flex-col",
                          isMe
                            ? "bg-zinc-200 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900 border-transparent rounded-tr-none"
                            : "bg-zinc-700 text-zinc-50 border-transparent rounded-tl-none backdrop-blur-sm",
                        )}
                      >
                        <span>{msg.content}</span>
                        <span
                          className={cn(
                            "text-xs mt-1 self-end font-semibold",
                            isMe
                              ? "text-zinc-400 dark:text-zinc-500"
                              : "text-muted-foreground opacity-60",
                          )}
                        >
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <form onSubmit={onSend} className='mt-4 flex gap-2'>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  event.status === "completed"
                    ? "Room archived. Chat is closed."
                    : "Send a message..."
                }
                className='h-12 bg-background border-[0.5px] border-foreground/20 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20'
                disabled={sending || event.status === "completed"}
              />
              <Button
                type='submit'
                size='icon'
                variant='ghost'
                className='h-12 w-12 shrink-0 rounded-xl border-[0.5px] border-foreground/20 bg-background hover:bg-muted'
                disabled={
                  sending || !message.trim() || event.status === "completed"
                }
              >
                <Send className='h-5 w-5' />
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value='polls' className='mt-6 outline-none'>
          <div className='space-y-8 pb-20'>
            {event.status !== "completed" && (
              <Card className='border-dashed bg-muted/10 shadow-none'>
                <CardContent className='pt-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <Plus className='h-4 w-4 text-primary' />
                      <span className='text-xs font-semibold uppercase tracking-widest'>
                        New Question
                      </span>
                    </div>
                    <InlinePollCreator onAdd={onAddBanterItem} busy={busy} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className='space-y-6'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xs font-semibold uppercase tracking-widest text-muted-foreground/60'>
                  Questions
                </h3>
                <Badge variant='outline' className='text-[8px] font-medium'>
                  {items.length}
                </Badge>
              </div>
              <div className='grid gap-4'>
                {items.map((item) => (
                  <BanterItemCard
                    key={item.id}
                    item={item}
                    eventId={event.id}
                    sessionToken={participant.sessionToken}
                    liveVoteCounts={liveVoteCounts}
                    onTextReply={handleTextReply}
                    textReplies={textReplies[item.id] || []}
                    isArchived={event.status === "completed"}
                  />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {isCreator && (
          <TabsContent value='manage' className='mt-6 outline-none pb-20'>
            <ManageTab
              event={event}
              busy={busy}
              onSaveMeta={handleSaveMeta}
              onResetLink={handleResetLink}
              onStart={() =>
                api.startEvent(event.id).then((ev) =>
                  setEvent({
                    ...ev,
                    participantCount: event.participantCount,
                  }),
                )
              }
              onComplete={() =>
                api.completeEvent(event.id).then((ev) =>
                  setEvent({
                    ...ev,
                    participantCount: event.participantCount,
                  }),
                )
              }
              onPublish={() =>
                api.publishEvent(event.id).then((ev) =>
                  setEvent({
                    ...ev,
                    participantCount: event.participantCount,
                  }),
                )
              }
              onDelete={() =>
                api.deleteEvent(event.id).then(() => navigate("/"))
              }
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
