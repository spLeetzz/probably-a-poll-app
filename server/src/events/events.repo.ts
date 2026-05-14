import { eq, desc, and, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { events } from "../db/schema.js";
import type {
  CreateEventBody,
  UpdateEventBody,
  ListEventsQuery,
} from "./events.schema.js";

export async function createEvent(input: CreateEventBody, creatorId: string) {
  const [event] = await db
    .insert(events)
    .values({
      creatorId,
      title: input.title,
      description: input.description,
      type: input.type,
      joinMode: input.joinMode,
      authOnly: input.authOnly,
      resultsVisibility: input.resultsVisibility, // defaults to 'public' at DB level if omitted
      expiresAt: input.expiresAt,
    })
    .returning();

  return event!;
}

export async function listEvents(query: ListEventsQuery) {
  const conditions: SQL[] = [];

  if (query.creatorId) conditions.push(eq(events.creatorId, query.creatorId));
  if (query.type) conditions.push(eq(events.type, query.type));
  if (query.status) conditions.push(eq(events.status, query.status));

  return db
    .select()
    .from(events)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(events.createdAt))
    .limit(query.limit)
    .offset(query.offset);
}

export async function getEventById(id: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  return event ?? null;
}

export async function updateEvent(id: string, input: UpdateEventBody) {
  const [event] = await db
    .update(events)
    .set({
      title: input.title,
      description: input.description,
      joinMode: input.joinMode,
      authOnly: input.authOnly,
      resultsVisibility: input.resultsVisibility,
      expiresAt: input.expiresAt,
    })
    .where(eq(events.id, id))
    .returning();

  return event ?? null;
}

export async function startEvent(id: string) {
  const [event] = await db
    .update(events)
    .set({ status: "running" })
    .where(and(eq(events.id, id), eq(events.status, "pending")))
    .returning();

  return event ?? null;
}

export async function completeEvent(id: string) {
  const [event] = await db
    .update(events)
    .set({ status: "completed" })
    .where(and(eq(events.id, id), eq(events.status, "running")))
    .returning();

  return event ?? null;
}

export async function publishEvent(id: string) {
  const [event] = await db
    .update(events)
    .set({ isPublished: true })
    .where(and(eq(events.id, id), eq(events.status, "completed")))
    .returning();

  return event ?? null;
}

export async function deleteEvent(id: string) {
  const [event] = await db
    .delete(events)
    .where(eq(events.id, id))
    .returning();

  return event ?? null;
}
