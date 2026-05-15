import React, { useState } from 'react'
import { Plus, X, Loader2, ListTodo, MessageSquarePlus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { toast } from 'sonner'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

interface InlinePollCreatorProps {
  onAdd: (text: string, isMandatory: boolean, options: string[]) => Promise<void>
  busy: boolean
}

export function InlinePollCreator({ onAdd, busy }: InlinePollCreatorProps) {
  const [text, setText] = useState('')
  const [isPoll, setIsPoll] = useState(false)
  const [options, setOptions] = useState<string[]>(['', ''])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    
    let validOptions: string[] = []
    if (isPoll) {
      validOptions = options.map(o => o.trim()).filter(o => o.length > 0)
      if (validOptions.length < 2) {
        toast.error('A poll needs at least two options')
        return
      }
    }
    
    await onAdd(text.trim(), false, validOptions)
    setText('')
    setOptions(['', ''])
    setIsPoll(false)
  }

  return (
    <Card className="border-dashed shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Ask the Room</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="poll-mode" className="text-xs text-muted-foreground cursor-pointer">Poll Mode</Label>
            <Switch id="poll-mode" checked={isPoll} onCheckedChange={setIsPoll} />
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input 
            placeholder={isPoll ? "What's the poll question?" : "Ask an open-ended question..."}
            value={text}
            onChange={e => setText(e.target.value)}
            required
          />
          
          {isPoll && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input 
                    placeholder={`Option ${i + 1}`} 
                    value={opt}
                    onChange={e => {
                      const newOpts = [...options]
                      newOpts[i] = e.target.value
                      setOptions(newOpts)
                    }}
                    className="h-8 text-sm"
                  />
                  {options.length > 2 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" 
                      onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs w-full border-dashed" 
                  onClick={() => setOptions([...options, ''])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Option
                </Button>
              )}
            </div>
          )}
          
          <Button type="submit" disabled={busy || !text.trim()} className="w-full h-9">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isPoll ? <ListTodo className="h-4 w-4 mr-2" /> : <MessageSquarePlus className="h-4 w-4 mr-2" />}
            {isPoll ? 'Post Poll' : 'Ask Question'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
