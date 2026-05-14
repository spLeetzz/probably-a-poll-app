import type { Analytics, ItemWithOptions } from '../api/events-api'

/** Mirrors server `getAnalytics` percentage math from current items + total response count. */
export function buildAnalyticsFromItems(
  items: ItemWithOptions[],
  totalResponses: number,
): Analytics {
  return {
    totalResponses,
    items: items.map((it) => ({
      itemId: it.id,
      text: it.text,
      options: it.options.map((o) => ({
        optionId: o.id,
        text: o.text,
        voteCount: o.voteCount,
        percentage:
          totalResponses > 0
            ? Math.round((o.voteCount / totalResponses) * 1000) / 10
            : 0,
      })),
    })),
  }
}
