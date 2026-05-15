import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, BarChart2, LockKeyhole, LogIn, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { Analytics } from "../../api/events-api";
import { Button } from "@/components/ui/button";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
];

interface Props {
  analytics: Analytics;
  totalResponses: number;
  canViewResults: boolean;
  isPrivate: boolean;
  isAuthenticated: boolean;
  eventStatus: string;
  itemsCount: number;
  onStart: () => void;
  busy: boolean;
}

function groupTextResponses(
  responses: string[],
): { text: string; count: number }[] {
  const map: Record<string, { text: string; count: number }> = {};
  for (const r of responses) {
    const key = r.trim().toLowerCase();
    if (!key) continue;
    if (!map[key]) map[key] = { text: r.trim(), count: 0 };
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

export function ResultsTab({
  analytics,
  totalResponses,
  canViewResults,
  isPrivate,
  isAuthenticated,
  eventStatus,
  itemsCount,
  onStart,
  busy,
}: Props) {
  // Private results , non-creator sees lock card
  if (isPrivate && !canViewResults) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-16 gap-4'>
          <LockKeyhole className='h-10 w-10 text-muted-foreground' />
          <div className='text-center space-y-1'>
            <p className='font-semibold text-lg'>Results are private</p>
            <p className='text-sm text-muted-foreground'>
              Only the event creator can view these results.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Public results but user is not authenticated
  if (!canViewResults && !isAuthenticated) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-16 gap-4'>
          <LogIn className='h-10 w-10 text-muted-foreground' />
          <div className='text-center space-y-1'>
            <p className='font-semibold text-lg'>Sign in to view results</p>
            <p className='text-sm text-muted-foreground'>
              You need an account to see results for this event.
            </p>
          </div>
          <Button asChild className='h-12 px-8'>
            <Link to='/login'>
              <LogIn className='h-5 w-5' /> SIGN IN
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className='space-y-6'>
      {eventStatus === "pending" && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-amber-600" /> Event not started
            </CardTitle>
            <CardDescription>
              Analytics will appear here once you start the event and collect responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsCount > 0 ? (
              <Button onClick={onStart} disabled={busy} size="lg" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest px-10 py-6 text-lg shadow-lg border-b-2 border-amber-800 active:border-b-0 active:translate-y-1 transition-all">
                <Play className="h-5 w-5 fill-current" /> START EVENT
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground font-black italic uppercase tracking-widest bg-muted/20 p-4 rounded-lg border-2 border-dashed">
                Add at least one question in the Manage tab to enable participation.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className='bg-primary/5 border-primary/20'>
        <CardHeader className='pb-2'>
          <CardDescription className='text-primary text-xs uppercase tracking-widest font-medium'>
            Total Responses
          </CardDescription>
          <CardTitle className='text-5xl font-black'>
            {totalResponses}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            Across all participants
          </p>
        </CardContent>
      </Card>

      {analytics.items.map((row, idx) => {
        const hasOptions = row.options.length > 0;
        const grouped = groupTextResponses(row.textResponses ?? []);

        return (
          <Card key={row.itemId}>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                {hasOptions ? (
                  <BarChart2 className='h-4 w-4 text-muted-foreground' />
                ) : (
                  <MessageSquare className='h-4 w-4 text-muted-foreground' />
                )}
                <CardTitle className='text-base font-semibold'>
                  {idx + 1}. {row.text}
                </CardTitle>
              </div>
              <CardDescription>
                {hasOptions ? "Multiple choice" : "Open text"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasOptions ? (
                <div className='space-y-3'>
                  {[...row.options]
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .map((opt, i) => (
                      <div key={opt.optionId} className='space-y-1.5'>
                        <div className='flex justify-between text-sm'>
                          <div className='flex items-center gap-2'>
                            <span
                              className='h-2.5 w-2.5 rounded-full flex-none'
                              style={{
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            />
                            <span className='font-medium'>{opt.text}</span>
                          </div>
                          <span className='text-muted-foreground tabular-nums'>
                            {opt.voteCount} ({opt.percentage}%)
                          </span>
                        </div>
                        <Progress
                          value={opt.percentage}
                          className='h-2'
                          style={
                            {
                              "--progress-foreground":
                                COLORS[i % COLORS.length],
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    ))}
                </div>
              ) : grouped.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  No text responses yet.
                </p>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {grouped.map(({ text, count }) => (
                    <Badge
                      key={text}
                      variant='secondary'
                      className='text-sm px-3 py-1.5 gap-1.5'
                    >
                      {text}
                      {count > 1 && (
                        <span className='bg-primary/15 text-primary rounded px-1 text-xs font-bold'>
                          ×{count}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
            {idx < analytics.items.length - 1 && <Separator />}
          </Card>
        );
      })}
    </div>
  );
}
