import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { options } from "../db/schema.js";
import type { OptionInput } from "./options.schema.js";

/**
 * Atomically replaces all options for an item in a single transaction:
 * 1. Delete all existing options for the item
 * 2. Insert the full new set
 *
 * Safe because options can only be set while the event is pending,
 * so voteCount is always 0 and there are no answer FK references yet.
 */
export async function setOptions(itemId: string, inputs: OptionInput[]) {
  return db.transaction(async (tx) => {
    // 1. Wipe existing options for this item
    await tx.delete(options).where(eq(options.itemId, itemId));

    // 2. Insert the full desired state in one query
    const inserted = await tx
      .insert(options)
      .values(
        inputs.map((opt) => ({
          // Preserve caller-provided IDs so clients can track options across updates
          ...(opt.id ? { id: opt.id } : {}),
          itemId,
          text: opt.text,
          order: opt.order,
        })),
      )
      .returning();

    return inserted;
  });
}

/**
 * Returns all options for an item ordered by their display order.
 */
export async function listOptions(itemId: string) {
  return db
    .select()
    .from(options)
    .where(eq(options.itemId, itemId))
    .orderBy(options.order);
}
