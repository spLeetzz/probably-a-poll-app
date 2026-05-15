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
import { Separator } from "@/components/ui/separator";
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
}

export function ManageTab({
  event,
  busy,
  onSaveMeta,
  onStart,
  onComplete,
  onPublish,
  onDelete,
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

  const isEditable = event.status === "pending";

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

    <div className='max-w-2xl mx-auto space-y-6'>
      {/* Locked Alert */}
      {!isEditable && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
           <LockKeyhole className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
           <div>
             <p className="text-sm font-bold text-amber-600">Event is Locked</p>
             <p className="text-xs text-amber-600/80">Settings cannot be edited while the event is {event.status}.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lifecycle */}
        <Card className={cn(!isEditable && "opacity-80 bg-muted/20")}>
          <CardHeader>
            <CardTitle className='text-base font-semibold flex items-center gap-2'>
              <Play className="h-4 w-4 text-primary" /> Status Control
            </CardTitle>
            <CardDescription>Manage the lifecycle of your event.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            {event.status === "pending" && (
              <Button onClick={onStart} disabled={busy} className='w-full gap-2 justify-start'>
                <Play className='h-4 w-4' /> Start Event
              </Button>
            )}
            {event.status === "running" && (
              <Button
                onClick={onComplete}
                variant='secondary'
                disabled={busy}
                className='w-full gap-2 justify-start'
              >
                <Pause className='h-4 w-4' /> Complete Event
              </Button>
            )}
            {event.status === "completed" && !event.isPublished && (
              <Button
                onClick={onPublish}
                variant='default'
                disabled={busy}
                className='w-full gap-2 justify-start bg-green-600 hover:bg-green-700'
              >
                <CloudUpload className='h-4 w-4' /> Publish Results
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  disabled={busy}
                  className='w-full gap-2 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive'
                >
                  <Trash2 className='h-4 w-4' /> Delete Event
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
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className={cn(!isEditable && "opacity-70 bg-muted/10 border-dashed")}>
          <CardHeader>
            <CardTitle className='text-base font-semibold flex items-center gap-2'>
              <Settings2 className="h-4 w-4 text-primary" /> Settings
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='space-y-1.5'>
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                Title {!isEditable && <LockKeyhole className="h-3 w-3" />}
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isEditable}
                placeholder="Event title"
                className={cn(!isEditable && "bg-transparent border-none px-0 h-auto font-medium disabled:opacity-100")}
              />
            </div>
            <div className='space-y-1.5'>
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                Description {!isEditable && <LockKeyhole className="h-3 w-3" />}
              </Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn('resize-none', !isEditable && "bg-transparent border-none px-0 h-auto disabled:opacity-100")}
                disabled={!isEditable}
                placeholder="Optional description"
              />
            </div>
            <div className='space-y-3'>
              <Label className="text-xs font-bold uppercase text-muted-foreground">Results Visibility</Label>
              <div className="flex bg-muted p-1 rounded-lg border shadow-inner">
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setResultsVisibility('public')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-95",
                    resultsVisibility === 'public' 
                      ? "bg-zinc-600 text-white shadow-sm" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <BarChart2 className="h-3.5 w-3.5" /> Public
                </button>
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setResultsVisibility('private')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-95",
                    resultsVisibility === 'private' 
                      ? "bg-zinc-600 text-white shadow-sm" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <LockKeyhole className="h-3.5 w-3.5" /> Private
                </button>
              </div>
            </div>
            <div className='flex items-center justify-between'>
              <Label className="text-sm font-medium">Require Login</Label>
              <Switch
                checked={authOnly}
                onCheckedChange={setAuthOnly}
                disabled={!isEditable}
              />
            </div>
            <Separator />
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className="text-sm font-medium">Auto-Expire</Label>
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
                        "w-full justify-start gap-2 h-9",
                        !safeDate && "text-muted-foreground",
                        !isEditable && "border-none bg-muted/30 h-8"
                      )}
                    >
                      <CalendarIcon className='h-4 w-4' />
                      {safeDate ? format(safeDate, "PPP p") : "Pick date & time"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-4 space-y-4 bg-[#1c1c1b] border-4 border-primary shadow-[0_0_50px_rgba(0,0,0,1)]' align='start'>
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
                    <div className='space-y-4 p-5 rounded-xl border-4 border-primary bg-[#2a2a28] shadow-[0_0_30px_rgba(0,0,0,0.8)]'>
                      <Label className='text-sm font-semibold text-primary flex items-center gap-2'>
                        <Clock className="h-4 w-4" /> Finalize Time (24h)
                      </Label>
                      <div className='flex items-center justify-center gap-3'>
                        <Select
                          value={
                            safeDate
                              ? safeDate.getHours().toString().padStart(2, "0")
                              : "12"
                          }
                          onValueChange={(h) => {
                            const d = new Date(expiresAt ?? new Date());
                            d.setHours(parseInt(h));
                            setExpiresAt(d);
                          }}
                        >
                          <SelectTrigger className='w-20 h-10 text-base font-medium bg-card border-2 border-primary/40'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className='max-h-48 border-4'>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem
                                key={i}
                                value={i.toString().padStart(2, "0")}
                                className="font-medium"
                              >
                                {i.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className='font-semibold text-2xl text-primary/60'>:</span>
                        <Select
                          value={
                            safeDate
                              ? safeDate.getMinutes().toString().padStart(2, "0")
                              : "00"
                          }
                          onValueChange={(m) => {
                            const d = new Date(expiresAt ?? new Date());
                            d.setMinutes(parseInt(m));
                            setExpiresAt(d);
                          }}
                        >
                          <SelectTrigger className='w-20 h-10 text-base font-medium bg-card border-2 border-primary/40'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className='max-h-48 border-4'>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem
                                key={i}
                                value={i.toString().padStart(2, "0")}
                                className="font-medium"
                              >
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

