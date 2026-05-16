import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Play,
  Pause,
  CloudUpload,
  Calendar as CalendarIcon,
  Clock,
  LockKeyhole,
  Settings2,
  BarChart2,
  RefreshCw,
  Archive,
} from "lucide-react";
import { format, addMinutes, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import type {
  Event,
  JoinMode,
  ResultsVisibility,
} from "../../api/events-api";

interface Props {
  event: Event;
  busy: boolean;
  onSaveMeta: (data: {
    title: string;
    description: string;
    joinMode: JoinMode;
    authOnly: boolean;
    resultsVisibility: ResultsVisibility;
    expiresAt: string | null;
  }) => void;
  onStart: () => void;
  onComplete: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onResetLink?: () => void;
}

export function ManageTab({
  event,
  busy,
  onSaveMeta,
  onStart,
  onComplete,
  onPublish,
  onDelete,
  onResetLink,
}: Props) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [joinMode] = useState<JoinMode>(event.joinMode);
  const [authOnly, setAuthOnly] = useState(event.authOnly);
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>(
    event.resultsVisibility,
  );
  const [hasExpiry, setHasExpiry] = useState(Boolean(event.expiresAt));
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    event.expiresAt ? new Date(event.expiresAt) : undefined,
  );

  const isEditable = event.status === "pending" || (event.type === "banter" && event.status !== "completed");

  // Debounced auto-save for settings
  useEffect(() => {
    if (!isEditable) return;

    const currentMeta = {
      title,
      description,
      joinMode,
      authOnly,
      resultsVisibility,
      expiresAt:
        hasExpiry && expiresAt && isValid(expiresAt)
          ? expiresAt.toISOString()
          : null,
    };

    const eventExpiresAt = event.expiresAt
      ? new Date(event.expiresAt).toISOString()
      : null;
    const hasChanged =
      title !== event.title ||
      description !== (event.description ?? "") ||
      joinMode !== event.joinMode ||
      authOnly !== event.authOnly ||
      resultsVisibility !== event.resultsVisibility ||
      currentMeta.expiresAt !== eventExpiresAt;

    if (hasChanged) {
      const timer = setTimeout(() => {
        onSaveMeta(currentMeta);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    title,
    description,
    joinMode,
    authOnly,
    resultsVisibility,
    hasExpiry,
    expiresAt,
    isEditable,
    event,
    onSaveMeta,
  ]);

  const toggleExpiry = (checked: boolean) => {
    setHasExpiry(checked);
    if (checked && !expiresAt) setExpiresAt(addMinutes(new Date(), 30));
  };

  const safeDate = expiresAt && isValid(expiresAt) ? expiresAt : undefined;

  return (
    <div className='w-full space-y-6'>
      <div className={cn(
        "flex flex-col sm:flex-row items-center justify-between p-2 pl-4 rounded-xl border transition-colors",
        !isEditable ? "bg-muted/30 border-border" : "bg-card border-primary/20 shadow-sm"
      )}>
        <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
          <div className={cn(
            "h-2 w-2 rounded-full",
            event.status === 'running' ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
            event.status === 'completed' ? "bg-blue-500" :
            "bg-amber-500"
          )} />
          <span className="text-sm font-semibold capitalize tracking-wide text-foreground">
            {event.status}
          </span>
          {!isEditable && (
            <div className="flex items-center gap-1.5 ml-2 text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5" />
              <span className="text-[8px] font-medium uppercase tracking-wider">Locked</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {event.status === "pending" && (
            <Button onClick={onStart} disabled={busy} size="sm" className='gap-2 flex-1 sm:flex-none rounded-lg font-semibold shadow-sm'>
              <Play className='h-3.5 w-3.5' /> Start Event
            </Button>
          )}
          {event.status === "running" && (
            <Button
              onClick={onComplete}
              variant='secondary'
              disabled={busy}
              size="sm"
              className='gap-2 flex-1 sm:flex-none rounded-lg font-semibold border'
            >
              {event.type === "banter" ? <><Archive className='h-3.5 w-3.5' /> Archive Room</> : <><Pause className='h-3.5 w-3.5' /> Complete</>}
            </Button>
          )}
          {event.status === "completed" && !event.isPublished && event.type !== "banter" && (
            <Button
              onClick={onPublish}
              disabled={busy}
              size="sm"
              className='gap-2 flex-1 sm:flex-none rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm'
            >
              <CloudUpload className='h-3.5 w-3.5' /> Publish Results
            </Button>
          )}
          {onResetLink && (
            <Button
              onClick={onResetLink}
              variant="outline"
              size="sm"
              disabled={busy}
              className='gap-2 shrink-0 rounded-lg h-9 border-dashed text-amber-600 border-amber-600/30 hover:bg-amber-600/10 dark:text-amber-500 dark:border-amber-500/30'
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Link
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='ghost'
                size="icon"
                disabled={busy}
                title="Delete Event"
                className='h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete event?</AlertDialogTitle>
                <AlertDialogDescription>
                  This is permanent and cannot be undone. All responses will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className={cn("transition-opacity", !isEditable && "opacity-60 pointer-events-none")}>
        <CardHeader className="pb-4 border-b bg-muted/20">
          <CardTitle className='text-base font-semibold flex items-center gap-2'>
            <Settings2 className="h-4 w-4 text-primary" /> Configuration
          </CardTitle>
          <CardDescription>Update your event details and preferences.</CardDescription>
        </CardHeader>
        <CardContent className='p-6 space-y-8'>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className='space-y-2'>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  Title
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isEditable}
                  placeholder="Event title"
                  className="h-12 bg-muted/30 focus-visible:ring-1 text-base font-medium"
                />
              </div>
              <div className='space-y-2'>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  Description
                </Label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none bg-muted/30 focus-visible:ring-1"
                  disabled={!isEditable}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className='space-y-3 p-4 rounded-xl border bg-muted/10'>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Results Visibility</Label>
                <div className="flex bg-muted p-1 rounded-lg border shadow-inner">
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => setResultsVisibility('public')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all",
                      resultsVisibility === 'public' 
                        ? "bg-zinc-400 dark:bg-zinc-700 text-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <BarChart2 className="h-4 w-4" /> Public
                  </button>
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => setResultsVisibility('private')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all",
                      resultsVisibility === 'private' 
                        ? "bg-zinc-400 dark:bg-zinc-700 text-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <LockKeyhole className="h-4 w-4" /> Private
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between p-4 rounded-xl border bg-muted/10'>
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Require Login</Label>
                  <p className="text-xs text-muted-foreground">Only authenticated users can participate.</p>
                </div>
                <Switch
                  checked={authOnly}
                  onCheckedChange={setAuthOnly}
                  disabled={!isEditable}
                />
              </div>

              <div className='space-y-3 p-4 rounded-xl border bg-muted/10'>
                <div className='flex items-center justify-between'>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Auto-Expire</Label>
                    <p className="text-xs text-muted-foreground">Automatically close the event at a specific time.</p>
                  </div>
                  <Switch
                    checked={hasExpiry}
                    onCheckedChange={toggleExpiry}
                    disabled={!isEditable}
                  />
                </div>
                {hasExpiry && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        disabled={!isEditable}
                        className={cn(
                          "w-full justify-start gap-3 h-12 mt-2",
                          !safeDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className='h-4 w-4' />
                        {safeDate ? format(safeDate, "PPP p") : "Pick date & time"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-4 space-y-4 bg-card border shadow-xl' align='start'>
                      <Calendar
                        mode='single'
                        selected={safeDate}
                        className="rounded-md border bg-muted/20"
                        onSelect={(d) => {
                          if (!d) return;
                          const next = new Date(d);
                          if (safeDate)
                            next.setHours(
                              safeDate.getHours(),
                              safeDate.getMinutes(),
                            );
                          setExpiresAt(next);
                        }}
                        initialFocus
                      />
                      <div className='space-y-3 p-4 rounded-xl border bg-muted/30'>
                        <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                          <Clock className="h-3.5 w-3.5" /> Time (24h)
                        </Label>
                        <div className='flex items-center justify-center gap-2'>
                          <Select
                            value={safeDate ? safeDate.getHours().toString().padStart(2, "0") : "12"}
                            onValueChange={(h) => {
                              const d = new Date(expiresAt ?? new Date());
                              d.setHours(parseInt(h));
                              setExpiresAt(d);
                            }}
                          >
                            <SelectTrigger className='w-[70px] h-9 text-sm font-medium'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className='max-h-48'>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                                  {i.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className='font-bold text-muted-foreground'>:</span>
                          <Select
                            value={safeDate ? safeDate.getMinutes().toString().padStart(2, "0") : "00"}
                            onValueChange={(m) => {
                              const d = new Date(expiresAt ?? new Date());
                              d.setMinutes(parseInt(m));
                              setExpiresAt(d);
                            }}
                          >
                            <SelectTrigger className='w-[70px] h-9 text-sm font-medium'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className='max-h-48'>
                              {Array.from({ length: 60 }, (_, i) => (
                                <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                                  {i.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

