import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { items, options, events } from "../db/schema.js";
import { sql } from "drizzle-orm";
import type { CreateItemBody, UpdateItemBody } from "./items.schema.js";

export async function createItem(eventId: string, input: CreateItemBody) {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .insert(items)
      .values({
        eventId,
        text: input.text,
        order: input.order,
        isMandatory: input.isMandatory ?? false,
      })
      .returning();

    await tx
      .update(events)
      .set({ itemCount: sql`${events.itemCount} + 1` })
      .where(eq(events.id, eventId));

    return item!;
  });
}

export async function listItemsWithOptions(eventId: string) {
  const eventItems = await db
    .select()
    .from(items)
    .where(eq(items.eventId, eventId))
    .orderBy(items.order);

  if (eventItems.length === 0) return [];

  const itemIds = eventItems.map((i) => i.id);
  const allOptions = await db
    .select()
    .from(options)
    .where(inArray(options.itemId, itemIds))
    .orderBy(options.order);

  return eventItems.map((item) => ({
    ...item,
    options: allOptions.filter((o) => o.itemId === item.id),
  }));
}

export async function getItemWithOptions(itemId: string) {
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item) return null;

  const itemOptions = await db
    .select()
    .from(options)
    .where(eq(options.itemId, itemId))
    .orderBy(options.order);

  return { ...item, options: itemOptions };
}

export async function getItemById(itemId: string) {
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  return item ?? null;
}

export async function updateItem(itemId: string, input: UpdateItemBody) {
  const [item] = await db
    .update(items)
    .set({
      ...(input.text !== undefined && { text: input.text }),
      ...(input.order !== undefined && { order: input.order }),
      ...(input.isMandatory !== undefined && { isMandatory: input.isMandatory }),
    })
    .where(eq(items.id, itemId))
    .returning();
  return item ?? null;
}

export async function deleteItem(itemId: string) {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .delete(items)
      .where(eq(items.id, itemId))
      .returning();

    if (item) {
      await tx
        .update(events)
        .set({ itemCount: sql`${events.itemCount} - 1` })
        .where(eq(events.id, item.eventId));
    }

    return item ?? null;
  });
}
