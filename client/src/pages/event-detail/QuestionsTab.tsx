import { Plus, Trash2, MessageSquare, BarChart2, Badge as BadgeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ItemWithOptions, OptionInput } from "../../api/events-api";

interface Props {
  items: ItemWithOptions[];
  optionsByItem: Record<string, OptionInput[]>;
  isEditable: boolean;
  busy: boolean;
  savingItems: Set<string>;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateItemText: (id: string, text: string) => void;
  onUpdateItemMandatory: (id: string, mandatory: boolean) => void;
  onSaveOptions: (itemId: string, opts: OptionInput[]) => void;
}

export function QuestionsTab({
  items,
  optionsByItem,
  isEditable,
  busy,
  savingItems,
  onAddItem,
  onDeleteItem,
  onUpdateItemText,
  onUpdateItemMandatory,
  onSaveOptions,
}: Props) {
  return (
    <div className="space-y-6">
      <div className='flex items-center justify-between px-1'>
        <div>
          <h3 className='text-lg font-bold flex items-center gap-2'>
            Questions <Badge variant="secondary" className="rounded-full">{items.length}</Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            {isEditable ? "Create and manage your poll questions." : "Questions are locked while the event is running."}
          </p>
        </div>
        {isEditable && (
          <Button onClick={onAddItem} disabled={busy} className="gap-2 shadow-xl shadow-primary/20">
            <Plus className='h-4 w-4' /> ADD QUESTION
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className='flex flex-col items-center justify-center py-20 border-4 border-dashed rounded-2xl bg-muted/20 border-primary/20'>
            <p className='text-muted-foreground font-black uppercase tracking-widest text-xs opacity-50'>Your poll is empty</p>
            <Button variant="outline" onClick={onAddItem} className="mt-6 h-14 px-10 text-lg">
              <Plus className="h-5 w-5" /> CREATE FIRST QUESTION
            </Button>
          </div>
        )}

        {items.map((item, index) => {
          const opts = optionsByItem[item.id] ?? [];
          const isSaving = savingItems.has(item.id);
          const isMCQ = opts.length > 0;
          const isOptimistic = item.id.startsWith('temp-');

          return (
            <Card key={item.id} className={cn("relative group transition-all duration-200 border-l-4", isSaving ? "border-l-primary" : "border-l-transparent hover:border-l-primary/30", isOptimistic && "opacity-60")}>
              <CardHeader className="pb-3">
                <div className='flex items-start justify-between gap-4'>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">Q{index + 1}</span>
                       {isSaving && (
                        <span className='text-[10px] text-primary animate-pulse font-medium'>
                          Saving changes…
                        </span>
                      )}
                    </div>
                    <Input
                      key={item.id}
                      className="text-xl font-semibold border-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/30"
                      defaultValue={item.text}
                      placeholder="Type your question here…"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onUpdateItemText(item.id, e.target.value)}
                      disabled={!isEditable}
                    />
                  </div>
                  {isEditable && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={() => onDeleteItem(item.id)}
                      disabled={busy}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Response Type</Label>
                    <div className="flex bg-muted p-1 rounded-lg border shadow-inner">
                      <button
                        type="button"
                        onClick={() => onSaveOptions(item.id, [])}
                        disabled={!isEditable}
                        className={cn(
                          "flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-95",
                          !isMCQ 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Text
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveOptions(item.id, [
                          { text: "", order: 1 },
                          { text: "", order: 2 },
                        ])}
                        disabled={!isEditable}
                        className={cn(
                          "flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-95",
                          isMCQ 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <BarChart2 className="h-3.5 w-3.5" /> MCQ
                      </button>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      id={`mand-${item.id}`}
                      checked={item.isMandatory}
                      onCheckedChange={(v) => onUpdateItemMandatory(item.id, !!v)}
                      disabled={!isEditable}
                    />
                    <Label htmlFor={`mand-${item.id}`} className='text-xs font-bold uppercase text-muted-foreground cursor-pointer'>
                      Required
                    </Label>
                  </div>
                </div>

                {/* Options editor */}
                {isMCQ ? (
                  <div className='space-y-2 mt-4 bg-muted/20 p-3 rounded-lg border border-dashed'>
                    {opts.map((opt, i) => (
                      <div key={i} className='flex gap-2 items-center'>
                        <div className="h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                        <Input
                          value={opt.text}
                          placeholder={`Option ${i + 1}`}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const next = opts.map((o, j) =>
                              j === i ? { ...o, text: e.target.value } : o,
                            );
                            onSaveOptions(item.id, next);
                          }}
                          className='h-11 text-base font-medium bg-background border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20'
                          disabled={!isEditable}
                        />
                        {isEditable && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
                            onClick={() => {
                              const next = opts
                                .filter((_, j) => j !== i)
                                .map((o, j) => ({ ...o, order: j + 1 }));
                              onSaveOptions(item.id, next);
                            }}
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditable && (
                      <Button
                        variant='secondary'
                        className='w-full mt-4 gap-2 h-12'
                        onClick={() => {
                          const next = [
                            ...opts,
                            { text: "", order: opts.length + 1 },
                          ];
                          onSaveOptions(item.id, next);
                        }}
                      >
                        <Plus className='h-4 w-4' /> ADD OPTION
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-6 border rounded-xl bg-muted/5 border-dashed flex flex-col items-center justify-center gap-2">
                     <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
                     <p className="text-xs text-muted-foreground font-medium text-center">
                       Participants will see a text field to write their answer.
                     </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
