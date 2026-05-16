import { eq, desc, and, isNull, lt, sql, or, type SQL } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import { events, participants, messages } from "../db/schema.js";
import { randomBytes } from "node:crypto";
import type {
  CreateEventBody,
  UpdateEventBody,
  ListEventsQuery,
} from "./events.schema.js";

// --- Slug / token helpers (moved from banter.repo) ---

export function generateSlug(length = 32): string {
  return randomBytes(length).toString("base64url").slice(0, length);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** For banter rooms: any participant (auth'd user OR sessionToken holder) can perform actions. */
export async function requireBanterParticipant(req: FastifyRequest, eventId: string) {
  const sessionToken = req.headers["x-session-token"] as string | undefined;
  let isParticipant = false;

  if (req.user?.id) {
    const p = await findParticipantByUserId(eventId, req.user.id);
    isParticipant = !!p;
  }
  if (!isParticipant && sessionToken) {
    const p = await findParticipantByToken(eventId, sessionToken);
    isParticipant = !!p;
  }
  if (!isParticipant) {
    throw req.server.httpErrors.forbidden("You must join the room before performing this action.");
  }
}

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
      joinSlug: (input.type === 'banter' || input.isPrivate) ? generateSlug() : undefined,
      isAnonymous: input.isAnonymous,
    })
    .returning();

  return event!;
}

export async function listEvents(query: ListEventsQuery) {
  const conditions: SQL[] = [];

  if (query.creatorId) {
    // Creator sees all their own events
    conditions.push(eq(events.creatorId, query.creatorId));
  } else {
    // Public feed: show non-slug events (polls) AND banter rooms that are NOT anonymous (private)
    const orCondition = or(
      isNull(events.joinSlug), 
      and(eq(events.type, "banter"), eq(events.isAnonymous, false))
    );
    if (orCondition) conditions.push(orCondition);
  }

  if (query.type) conditions.push(eq(events.type, query.type));
  if (query.status) conditions.push(eq(events.status, query.status));

  return db
    .select()
    .from(events)
    .where(and(...conditions))
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

/** Alias for getEventById (maintained for compatibility) */
export async function getEventByIdInternal(id: string) {
  return getEventById(id);
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

// --- Banter repo functions (moved from banter/banter.repo) ---

/** Find a banter event by its joinSlug. */
export async function getEventBySlug(joinSlug: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.joinSlug, joinSlug))
    .limit(1);
  return event ?? null;
}

/** Get participant count for an event. */
export async function getParticipantCount(eventId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participants)
    .where(eq(participants.eventId, eventId));
  return row?.count ?? 0;
}

/** Find an existing participant for an event by userId. */
export async function findParticipantByUserId(eventId: string, userId: string) {
  const [row] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Find a participant by sessionToken. */
export async function findParticipantByToken(eventId: string, sessionToken: string) {
  const [row] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.sessionToken, sessionToken)))
    .limit(1);
  return row ?? null;
}

/** Find a participant by id. */
export async function findParticipantById(participantId: string) {
  const [row] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, participantId))
    .limit(1);
  return row ?? null;
}

/** Join a banter room — create participant row. */
export async function joinBanterRoom(eventId: string, displayName: string, userId?: string) {
  const sessionToken = generateSessionToken();
  const [participant] = await db
    .insert(participants)
    .values({ eventId, userId: userId ?? null, sessionToken, displayName, status: "approved" })
    .returning();
  return participant!;
}

/** Reset joinSlug for an event (creator only). */
export async function resetJoinSlug(eventId: string) {
  const newSlug = generateSlug();
  const [event] = await db
    .update(events)
    .set({ joinSlug: newSlug })
    .where(eq(events.id, eventId))
    .returning();
  return event ?? null;
}

/** Get paginated messages for an event, newest first, cursor-based on createdAt. */
export async function getMessages(eventId: string, limit: number, cursor?: string) {
  const conditions = [eq(messages.eventId, eventId)];
  if (cursor) conditions.push(lt(messages.createdAt, cursor));

  return db
    .select({
      id: messages.id,
      eventId: messages.eventId,
      participantId: messages.participantId,
      content: messages.content,
      createdAt: messages.createdAt,
      displayName: participants.displayName,
    })
    .from(messages)
    .innerJoin(participants, eq(messages.participantId, participants.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

/** Insert a new message. */
export async function createMessage(eventId: string, participantId: string, content: string) {
  const [msg] = await db
    .insert(messages)
    .values({ eventId, participantId, content })
    .returning();
  return msg!;
}
