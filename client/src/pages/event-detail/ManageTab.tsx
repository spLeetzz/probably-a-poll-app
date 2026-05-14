import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Slider } from '@/components/ui/slider'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Trash2, Play, Pause, CloudUpload, Calendar as CalendarIcon, Clock, XCircle, Lock } from 'lucide-react'
import { format, addMinutes, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Event, ItemWithOptions, JoinMode, ResultsVisibility, OptionInput } from '../../api/events-api'
import * as api from '../../api/events-api'

interface Props {
  event: Event
  items: ItemWithOptions[]
  optionsByItem: Record<string, OptionInput[]>
  busy: boolean
  onSaveMeta: (data: {
    title: string; description: string; joinMode: JoinMode
    authOnly: boolean; resultsVisibility: ResultsVisibility; expiresAt: string | null
  }) => void
  onStart: () => void
  onComplete: () => void
  onPublish: () => void
  onDelete: () => void
  onAddItem: (text: string, mandatory: boolean) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onSaveOptions: (itemId: string, opts: OptionInput[]) => Promise<void>
  onOptionsByItemChange: (val: Record<string, OptionInput[]>) => void
}

export function ManageTab({
  event, items, optionsByItem, busy,
  onSaveMeta, onStart, onComplete, onPublish, onDelete,
  onAddItem, onDeleteItem, onSaveOptions,
  onOptionsByItemChange
}: Props) {
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [joinMode, setJoinMode] = useState<JoinMode>(event.joinMode)
  const [authOnly, setAuthOnly] = useState(event.authOnly)
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>(event.resultsVisibility)
  const [hasExpiry, setHasExpiry] = useState(Boolean(event.expiresAt))
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(event.expiresAt ? new Date(event.expiresAt) : undefined)
  const [newItemText, setNewItemText] = useState('')
  const [newItemMandatory, setNewItemMandatory] = useState(true)

  const isEditable = event.status === 'pending'

  // Initialize form state once per event ID
  useEffect(() => {
    setTitle(event.title)
    setDescription(event.description ?? '')
    setJoinMode(event.joinMode)
    setAuthOnly(event.authOnly)
    setResultsVisibility(event.resultsVisibility)
    setHasExpiry(Boolean(event.expiresAt))
    setExpiresAt(event.expiresAt ? new Date(event.expiresAt) : undefined)
  }, [event.id])

  // Debounced auto-save for settings
  useEffect(() => {
    if (!isEditable) return

    const currentMeta = {
      title,
      description,
      joinMode,
      authOnly,
      resultsVisibility,
      expiresAt: hasExpiry && expiresAt && isValid(expiresAt) ? expiresAt.toISOString() : null,
    }

    const eventExpiresAt = event.expiresAt ? new Date(event.expiresAt).toISOString() : null
    const hasChanged =
      title !== event.title ||
      description !== (event.description ?? '') ||
      joinMode !== event.joinMode ||
      authOnly !== event.authOnly ||
      resultsVisibility !== event.resultsVisibility ||
      currentMeta.expiresAt !== eventExpiresAt

    if (hasChanged) {
      const timer = setTimeout(() => {
        onSaveMeta(currentMeta)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [title, description, joinMode, authOnly, resultsVisibility, hasExpiry, expiresAt, isEditable, event, onSaveMeta])

  // Track which items have pending autosave
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})


  const toggleExpiry = (checked: boolean) => {
    setHasExpiry(checked)
    if (checked && !expiresAt) setExpiresAt(addMinutes(new Date(), 30))
  }

  const safeDate = expiresAt && isValid(expiresAt) ? expiresAt : undefined

  // Music-specific state
  const [numSongs, setNumSongs] = useState<number[]>([10])
  const [artistSearch, setArtistSearch] = useState('')
  const [artistResults, setArtistResults] = useState<any[]>([])
  const [selectedArtists, setSelectedArtists] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Deezer search with debounce
  useEffect(() => {
    if (!artistSearch.trim()) {
      setArtistResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await api.searchDeezerArtists(artistSearch)
        if (results && Array.isArray(results)) {
          const filtered = results
            .filter((a: any) => !a.name.includes(',') && a.nb_fan > 50)
            .slice(0, 5)
          setArtistResults(filtered)
        }
      } catch (e) {
        console.error('Deezer search failed', e)
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [artistSearch])

  const handleAddArtist = (artist: any) => {
    if (!selectedArtists.find(a => a.id === artist.id)) {
      const next = [...selectedArtists, artist]
      setSelectedArtists(next)
      console.log('Selected artists:', next.map(a => a.name))
    }
    setArtistSearch('')
    setArtistResults([])
  }

  const handleRemoveArtist = (id: number) => {
    const next = selectedArtists.filter(a => a.id !== id)
    setSelectedArtists(next)
    console.log('Selected artists:', next.map(a => a.name))
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim()) return
    await onAddItem(newItemText.trim(), newItemMandatory)
    setNewItemText('')
  }

  // Debounced auto-save options — fires 1.5s after user stops typing
  const handleOptionChange = useCallback((itemId: string, opts: OptionInput[]) => {
    onOptionsByItemChange({ ...optionsByItem, [itemId]: opts })

    // Clear previous timer
    if (debounceRefs.current[itemId]) clearTimeout(debounceRefs.current[itemId])

    setSavingItems(s => new Set(s).add(itemId))
    debounceRefs.current[itemId] = setTimeout(async () => {
      try {
        if (opts.length === 0 || opts.length >= 2) {
          await onSaveOptions(itemId, opts)
        }
      } finally {
        setSavingItems(s => { const n = new Set(s); n.delete(itemId); return n })
      }
    }, 1500)
  }, [optionsByItem, onOptionsByItemChange, onSaveOptions])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceRefs.current).forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle</CardTitle>
          <CardDescription>Control the event state.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {event.status === 'pending' && (
            <Button onClick={onStart} disabled={busy} className="gap-2">
              <Play className="h-4 w-4" /> Start Event
            </Button>
          )}
          {event.status === 'running' && (
            <Button onClick={onComplete} variant="secondary" disabled={busy} className="gap-2">
              <Pause className="h-4 w-4" /> Complete Event
            </Button>
          )}
          {!event.isPublished && (
            <Button onClick={onPublish} variant="outline" disabled={busy} className="gap-2">
              <CloudUpload className="h-4 w-4" /> Publish
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy} className="gap-2 ml-auto">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete event?</AlertDialogTitle>
                <AlertDialogDescription>This is permanent and cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} disabled={!isEditable} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="resize-none" disabled={!isEditable} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label>Results Visibility</Label>
              <Select value={resultsVisibility} onValueChange={v => setResultsVisibility(v as ResultsVisibility)} disabled={!isEditable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private (Creator only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Require Authentication</Label>
            <Switch checked={authOnly} onCheckedChange={setAuthOnly} disabled={!isEditable} />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Enable Expiry</Label>
              <Switch checked={hasExpiry} onCheckedChange={toggleExpiry} disabled={!isEditable} />
            </div>
            {hasExpiry && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start gap-2', !safeDate && 'text-muted-foreground')}>
                    <CalendarIcon className="h-4 w-4" />
                    {safeDate ? format(safeDate, 'PPP p') : 'Pick date & time'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 space-y-4" align="start">
                  <Calendar
                    mode="single"
                    selected={safeDate}
                    onSelect={d => {
                      if (!d) return
                      const next = new Date(d)
                      if (safeDate) next.setHours(safeDate.getHours(), safeDate.getMinutes())
                      setExpiresAt(next)
                    }}
                    initialFocus
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Time (24h)</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={safeDate ? safeDate.getHours().toString().padStart(2, '0') : '12'}
                        onValueChange={h => {
                          const d = new Date(expiresAt ?? new Date())
                          d.setHours(parseInt(h))
                          setExpiresAt(d)
                        }}
                      >
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="font-bold">:</span>
                      <Select
                        value={safeDate ? safeDate.getMinutes().toString().padStart(2, '0') : '00'}
                        onValueChange={m => {
                          const d = new Date(expiresAt ?? new Date())
                          d.setMinutes(parseInt(m))
                          setExpiresAt(d)
                        }}
                      >
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          {Array.from({ length: 60 }, (_, i) => (
                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
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

      {/* Music Settings */}
      {event.type === 'music' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Music Configuration</CardTitle>
            <CardDescription>Setup your playlist generation parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Number of Songs</Label>
                <span className="text-sm font-semibold">{numSongs[0]}</span>
              </div>
              <Slider
                value={numSongs}
                onValueChange={setNumSongs}
                max={50}
                min={1}
                step={1}
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-4">
              <Label>Search Artists</Label>
              <div className="relative">
                <Input
                  placeholder="Type to search artists on Deezer..."
                  value={artistSearch}
                  onChange={e => setArtistSearch(e.target.value)}
                  disabled={!isEditable}
                />
                {searching && <span className="absolute right-3 top-2.5 text-xs text-muted-foreground animate-pulse">Searching...</span>}
              </div>

              {artistResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {artistResults.map(artist => (
                    <div key={artist.id} className="flex items-center gap-3 p-2 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors" onClick={() => handleAddArtist(artist)}>
                      <img src={artist.picture_medium} alt={artist.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{artist.name}</p>
                        <p className="text-xs text-muted-foreground">{artist.nb_fan.toLocaleString()} fans</p>
                      </div>
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {selectedArtists.length > 0 && (
                <div className="space-y-3 mt-6">
                  <Label>Selected Artists</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtists.map(artist => (
                      <div key={artist.id} className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary-foreground pl-1 pr-3 py-1 rounded-full text-sm">
                        <img src={artist.picture_small} alt={artist.name} className="w-6 h-6 rounded-full shadow-sm" />
                        <span className="font-medium text-foreground">{artist.name}</span>
                        {isEditable && (
                          <button type="button" onClick={() => handleRemoveArtist(artist.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Questions</CardTitle>
              <CardDescription className="mt-1">
                {isEditable
                  ? 'Add and configure questions. Leave options empty for open text answers.'
                  : 'Questions are locked while the event is running.'}
              </CardDescription>
            </div>
            {!isEditable && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add question — only when pending */}
          {isEditable && (
            <form onSubmit={handleAddItem} className="flex gap-2">
              <Input
                placeholder="New question text…"
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Checkbox id="mand" checked={newItemMandatory} onCheckedChange={v => setNewItemMandatory(!!v)} />
                <Label htmlFor="mand" className="text-sm cursor-pointer">Req.</Label>
              </div>
              <Button type="submit" disabled={busy} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          )}

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No questions yet.</p>
          )}

          {items.map((item) => {
            const opts = optionsByItem[item.id] ?? []
            const isSaving = savingItems.has(item.id)
            return (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{item.text}</p>
                  <div className="flex items-center gap-2">
                    {item.isMandatory && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                    {isSaving && <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>}
                    {isEditable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDeleteItem(item.id)}
                        disabled={busy}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Options editor — locked when event is running */}
                {isEditable ? (
                  <div className="space-y-2">
                    {opts.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={opt.text}
                          placeholder={`Option ${i + 1}`}
                          onChange={e => {
                            const next = opts.map((o, j) => j === i ? { ...o, text: e.target.value } : o)
                            handleOptionChange(item.id, next)
                          }}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                          onClick={() => {
                            const next = opts.filter((_, j) => j !== i).map((o, j) => ({ ...o, order: j + 1 }))
                            handleOptionChange(item.id, next)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => {
                        const next = [...opts, { text: '', order: opts.length + 1 }]
                        handleOptionChange(item.id, next)
                      }}
                    >
                      <Plus className="h-3 w-3" /> Add Option
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground space-y-1 pl-1">
                    {opts.length > 0
                      ? opts.map((o, i) => <p key={i}>• {o.text || '(empty)'}</p>)
                      : <p className="italic">Open text answer</p>}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>


    </div>
  )
}
