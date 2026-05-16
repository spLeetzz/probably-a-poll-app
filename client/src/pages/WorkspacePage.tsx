import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api/events-api";
import type { CreateEventBody, Event } from "../api/events-api";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  BarChart2,
  MessageSquare,
  ArrowRight,
  Zap,
  Globe,
  Users,
  Calendar as CalendarIcon,
  LogOut,
  Settings,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CreateMode = "poll" | "banter" | null;

function HeroText() {
  return (
    <div className='space-y-6 select-none py-4'>
      <p
        className='text-sm font-medium uppercase tracking-[0.4em] text-primary/40'
        style={{ animation: "fadeUp 0.5s ease both", animationDelay: "0ms" }}
      >
        probably a poll app
      </p>
      <div className='space-y-4'>
        <h1
          className='text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9]'
          style={{ animation: "fadeUp 0.5s ease both", animationDelay: "80ms" }}
        >
          Create banter
          <br />
          rooms.
        </h1>
        <p
          className='text-3xl sm:text-4xl font-light tracking-tight text-muted-foreground leading-relaxed'
          style={{
            animation: "fadeUp 0.5s ease both",
            animationDelay: "160ms",
          }}
        >
          No sign up required.
        </p>
        <p
          className='text-4xl sm:text-5xl font-black italic tracking-tight text-primary/80'
          style={{
            animation: "fadeUp 0.5s ease both",
            animationDelay: "240ms",
          }}
        >
          Just fight.
        </p>
      </div>
    </div>
  );
}

interface QuickCreateFormProps {
  mode: CreateMode;
  onClose: () => void;
  onCreate: (body: CreateEventBody) => Promise<void>;
  creating: boolean;
}

function QuickCreateForm({
  mode,
  onClose,
  onCreate,
  creating,
}: QuickCreateFormProps) {
  const [title, setTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [requireLogin] = useState(false);
  const [privateResults, setPrivateResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!mode) return null;

  const isBanter = mode === "banter";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate({
      title: title.trim(),
      type: mode,
      isAnonymous: isBanter ? isAnonymous : undefined,
      authOnly: requireLogin,
      resultsVisibility: privateResults ? "private" : "public",
    });
  };

  return (
    <div
      className='border rounded-xl overflow-hidden bg-card shadow-lg'
      style={{ animation: "expandDown 0.2s ease both" }}
    >
      <div className='flex items-center justify-between px-4 pt-4 pb-2'>
        <div className='flex items-center gap-2'>
          {isBanter ? (
            <MessageSquare className='h-4 w-4' />
          ) : (
            <BarChart2 className='h-4 w-4' />
          )}
          <span className='font-semibold text-sm'>
            {isBanter ? "New Banter Room" : "New Poll"}
          </span>
        </div>
        <button
          onClick={onClose}
          className='text-xs text-muted-foreground hover:text-foreground transition-colors'
        >
          ✕ cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className='px-4 pb-4 space-y-4 h-[150px] flex flex-col'
      >
        <Input
          ref={inputRef}
          placeholder={
            isBanter ? "What's the room about?" : "What are you polling?"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className='h-11 text-base font-medium border-b border-t-0 border-x-0 rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground bg-transparent shrink-0'
        />

        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
            {isBanter ? (
              <label className='flex items-center gap-2 cursor-pointer select-none'>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <span className='text-sm flex items-center gap-1.5'>
                  👻 Anonymous and Private
                  <span
                    title='Only anonymous users can join with a link only you have'
                    className='cursor-help inline-flex text-muted-foreground hover:text-foreground transition-colors'
                  >
                    <Info className='h-3.5 w-3.5' />
                  </span>
                </span>
              </label>
            ) : (
              <label className='flex items-center gap-2 cursor-pointer select-none'>
                <Switch
                  checked={privateResults}
                  onCheckedChange={setPrivateResults}
                />
                <span className='text-sm'>🔒 Private Results</span>
              </label>
            )}
          </div>

          <Button
            type='submit'
            disabled={creating || !title.trim()}
            className='w-full font-bold h-10 shrink-0'
          >
            {creating ? (
              "Creating…"
            ) : (
              <span className='flex items-center gap-2'>
                {isBanter ? "Open Room" : "Create Poll"}
                <ArrowRight className='h-4 w-4' />
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EventCard({ ev }: { ev: Event }) {
  const isBanter = ev.type === "banter";
  const href =
    isBanter && ev.joinSlug
      ? `/room/${encodeURIComponent(ev.joinSlug)}`
      : `/events/${encodeURIComponent(ev.id)}`;

  const statusColor =
    ev.status === "running"
      ? "bg-emerald-500"
      : ev.status === "completed"
        ? "bg-zinc-400"
        : "bg-zinc-200 dark:bg-zinc-700";

  return (
    <Link to={href}>
      <Card className='group h-full hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden bg-card/40 backdrop-blur'>
        <CardHeader className='pb-3 pt-6 px-6'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusColor} shadow-sm`}
              />
              <span className='text-[11px] font-medium uppercase tracking-widest text-muted-foreground'>
                {ev.status === "running" ? "live" : ev.status}
              </span>
            </div>
            <Badge
              variant='outline'
              className='text-[10px] h-5 px-2 font-medium uppercase tracking-widest bg-background/50'
            >
              {isBanter ? "BANTER" : "POLL"}
            </Badge>
          </div>
          <CardTitle className='text-base sm:text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors'>
            {ev.title}
          </CardTitle>
        </CardHeader>
        <CardFooter className='px-6 pb-4 pt-3 text-xs text-muted-foreground flex justify-between border-t border-primary/5 mt-auto bg-muted/10'>
          <span className='flex items-center gap-1.5'>
            <CalendarIcon className='h-3.5 w-3.5' />
            {new Date(ev.createdAt).toLocaleDateString()}
          </span>
          <span className='flex items-center gap-1.5 font-medium'>
            {ev.itemCount} {ev.itemCount === 1 ? "question" : "questions"}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function SectionLabel({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <div className='flex items-center justify-between mb-3'>
      <div className='flex items-center gap-2 text-sm font-semibold'>
        {icon}
        {label}
      </div>
      {count !== undefined && (
        <span className='text-xs text-muted-foreground font-mono'>{count}</span>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className='border border-dashed rounded-xl py-8 text-center text-sm text-muted-foreground'>
      {text}
    </div>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [creating, setCreating] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [autoMode, setAutoMode] = useState<"poll" | "banter">("poll");

  const sessionUserId = session?.user?.id;

  useEffect(() => {
    if (hasInteracted) return;
    const interval = setInterval(() => {
      setAutoMode((prev) => (prev === "poll" ? "banter" : "poll"));
    }, 5000);
    return () => clearInterval(interval);
  }, [hasInteracted]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [publicList, userList] = await Promise.all([
        api.listEvents({ limit: 50, offset: 0 }),
        sessionUserId
          ? api.listEvents({ limit: 50, offset: 0, creatorId: sessionUserId })
          : Promise.resolve([]),
      ]);
      setEvents(publicList);
      setMyEvents(userList);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (body: CreateEventBody) => {
    setCreating(true);
    try {
      const ev = await api.createEvent(body);
      if (ev.type === "banter") {
        try {
          await api.startEvent(ev.id);
          ev.status = "running";
        } catch (e) {
          console.error("Auto-start failed:", e);
        }
      }
      toast.success(ev.type === "banter" ? "Room created!" : "Poll created!");
      if (ev.type === "banter" && ev.joinSlug) {
        navigate(`/room/${encodeURIComponent(ev.joinSlug)}`);
      } else {
        navigate(`/events/${encodeURIComponent(ev.id)}`);
      }
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const toggleMode = (mode: "poll" | "banter") => {
    setHasInteracted(true);
    setCreateMode((prev) => (prev === mode ? null : mode));
  };

  const openEvents = events.filter((e) => e.status === "running");
  const completedEvents = events.filter((e) => e.status === "completed");

  return (
    <div className='relative'>
      <div className='absolute top-0 right-0 z-50'>
        {session && !session.user.isAnonymous ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='h-10 w-10 rounded-full p-0 shadow-sm border-2 border-primary/10 hover:border-primary/20 transition-all'
              >
                <Avatar className='h-full w-full'>
                  <AvatarImage
                    src={session.user.image || ""}
                    alt={session.user.name}
                  />
                  <AvatarFallback className='bg-primary/10 text-primary font-bold text-xs'>
                    {session.user.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-56 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl'
              align='end'
            >
              <DropdownMenuLabel className='font-normal'>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-bold leading-none'>
                    {session.user.name}
                  </p>
                  <p className='text-xs leading-none text-muted-foreground'>
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className='cursor-pointer'>
                <Link to='/account' className='flex items-center'>
                  <Settings className='mr-2 h-4 w-4' /> Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive cursor-pointer'
                onClick={() => authClient.signOut()}
              >
                <LogOut className='mr-2 h-4 w-4' /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className='flex items-center gap-3 bg-card/30 backdrop-blur-md px-2 py-1.5 rounded-full border shadow-sm'>
            <Button
              variant='ghost'
              size='sm'
              asChild
              className='text-[11px] font-bold uppercase tracking-wider rounded-full px-4 hover:bg-muted/60 transition-colors'
            >
              <Link to='/login'>Sign in</Link>
            </Button>
            <Button
              size='sm'
              asChild
              className='text-[11px] font-bold uppercase tracking-wider rounded-full px-5 shadow-sm transition-all hover:scale-105'
            >
              <Link to='/register'>Join Free</Link>
            </Button>
          </div>
        )}
      </div>

      <div className='pb-4 pt-16 mb-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
          <HeroText />

          <div
            className='lg:pt-12 lg:pr-12'
            style={{
              animation: "fadeUp 0.5s ease both",
              animationDelay: "320ms",
            }}
          >
            <div className='space-y-6 max-w-xl mx-auto lg:mx-0 lg:ml-auto'>
              <div className='relative'>
                <div className='flex flex-col gap-4'>
                  <div className='flex gap-4'>
                    <button
                      onClick={() => toggleMode("poll")}
                      className={cn(
                        "flex-1 p-8 rounded-2xl border-4 transition-all text-left group relative overflow-hidden",
                        (
                          hasInteracted
                            ? createMode === "poll"
                            : autoMode === "poll"
                        )
                          ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                          : "border-muted bg-muted/10 hover:border-primary/20 opacity-30",
                      )}
                    >
                      <BarChart2 className='h-8 w-8 mb-4 text-primary/40' />
                      <h3 className='text-xl font-black uppercase tracking-widest mb-1 text-primary/40'>
                        New Poll
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        Ask questions, get votes.
                      </p>
                      {(hasInteracted
                        ? createMode === "poll"
                        : autoMode === "poll") && (
                          <div className='absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse' />
                        )}
                    </button>

                    <button
                      onClick={() => toggleMode("banter")}
                      className={cn(
                        "flex-1 p-8 rounded-2xl border-4 transition-all text-left group relative overflow-hidden",
                        (
                          hasInteracted
                            ? createMode === "banter"
                            : autoMode === "banter"
                        )
                          ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                          : "border-muted bg-muted/10 hover:border-primary/20 opacity-30",
                      )}
                    >
                      <MessageSquare className='h-8 w-8 mb-4 text-primary/40' />
                      <h3 className='text-xl font-black uppercase tracking-widest mb-1 text-primary/40'>
                        Banter Room
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        Real-time chat & fight.
                      </p>
                      {(hasInteracted
                        ? createMode === "banter"
                        : autoMode === "banter") && (
                          <div className='absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse' />
                        )}
                    </button>
                  </div>

                  {hasInteracted && createMode && (
                    <div className='mt-4'>
                      <QuickCreateForm
                        mode={createMode}
                        onClose={() => setCreateMode(null)}
                        onCreate={handleCreate}
                        creating={creating}
                      />
                    </div>
                  )}

                  {!hasInteracted && (
                    <p className='text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground animate-pulse mt-4'>
                      Click to choose your mode
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p
          className='text-base font-medium text-muted-foreground/40 italic mt-8 text-center text-balance max-w-2xl mx-auto leading-relaxed'
          style={{
            animation: "fadeUp 0.5s ease both",
            animationDelay: "500ms",
          }}
        >
          This is a prototype. You might ask why this behaves this way and is
          confusing, but, who cares?
        </p>
      </div>

      {/* Dashboard */}
      <div className='space-y-12'>
        {sessionUserId && (
          <section>
            <SectionLabel
              icon={<Users className='h-4 w-4' />}
              label='My Events'
              count={myEvents.length}
            />
            {loading && myEvents.length === 0 ? (
              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className='h-28 rounded-xl bg-muted/50 animate-pulse'
                  />
                ))}
              </div>
            ) : myEvents.length === 0 ? (
              <EmptyState text='Nothing here yet. Create your first poll or banter room above.' />
            ) : (
              <div className='max-h-[420px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 transition-all'>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4'>
                  {myEvents.map((ev) => (
                    <EventCard key={ev.id} ev={ev} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <SectionLabel
            icon={<Globe className='h-4 w-4' />}
            label='Open Events'
            count={openEvents.length}
          />
          {loading && events.length === 0 ? (
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className='h-28 rounded-xl bg-muted/50 animate-pulse'
                />
              ))}
            </div>
          ) : openEvents.length === 0 ? (
            <EmptyState text='No live events right now. Start one above!' />
          ) : (
            <div className='max-h-[420px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 transition-all'>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4'>
                {openEvents.map((ev) => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            </div>
          )}
        </section>

        {completedEvents.length > 0 && (
          <section>
            <SectionLabel
              icon={<Zap className='h-4 w-4 text-muted-foreground' />}
              label='Recently Completed'
              count={completedEvents.length}
            />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60'>
              {completedEvents.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
