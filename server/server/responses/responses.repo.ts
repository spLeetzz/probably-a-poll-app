import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { participants, answers, options, items } from "../db/schema.js";
import type { AnswerInput } from "./responses.schema.js";

/**
 * Returns the existing participant row for (eventId, userId) if one exists,
 * or null if this is the first response attempt.
 */
export async function findExistingParticipant(eventId: string, userId: string) {
  const [row] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function listParticipants(eventId: string) {
  return db
    .select()
    .from(participants)
    .where(eq(participants.eventId, eventId))
    .orderBy(participants.joinedAt);
}

export async function updateParticipantStatus(participantId: string, status: "pending" | "approved" | "rejected") {
  const [updated] = await db
    .update(participants)
    .set({ status })
    .where(eq(participants.id, participantId))
    .returning();
  return updated ?? null;
}

/**
 * Executes the full poll-response in a single transaction:
 * 1. Insert participant row with submittedAt = now()
 * 2. Insert one answer row per submitted answer
 * 3. Increment voteCount on each selected option
 *
 * Returns { participantId, submittedAt, updatedOptions } so the handler
 * can emit the socket delta without extra queries.
 */
export async function submitResponse(
  eventId: string,
  userId: string,
  answersInput: AnswerInput[],
  status: "pending" | "approved" | "rejected" = "approved"
) {
  const submittedAt = new Date().toISOString();

  return db.transaction(async (tx) => {
    // 1. Insert participant
    const [participant] = await tx
      .insert(participants)
      .values({
        eventId,
        userId,
        sessionToken: userId,
        status,
        submittedAt,
      })
      .returning();

    const participantId = participant!.id;

    // 2. Insert answer rows
    await tx.insert(answers).values(
      answersInput.map(({ itemId, optionId, textAnswer }) => ({
        participantId,
        itemId,
        optionId: optionId || null,
        textAnswer: textAnswer || null,
      })),
    );

    // 3. Increment voteCount on each selected option and return new counts
    const optionIds = answersInput
      .map((a) => a.optionId)
      .filter((id): id is string => !!id);

    let updatedOptions: { id: string; itemId: string; voteCount: number }[] = [];
    if (status === "approved" && optionIds.length > 0) {
      updatedOptions = await tx
        .update(options)
        .set({ voteCount: sql`${options.voteCount} + 1` })
        .where(inArray(options.id, optionIds))
        .returning({
          id: options.id,
          itemId: options.itemId,
          voteCount: options.voteCount,
        });
    }

    return { participantId, submittedAt, updatedOptions };
  });
}

/**
 * Returns total response count for an event (used in socket delta payload).
 */
export async function getResponseCount(eventId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participants)
    .where(eq(participants.eventId, eventId));
  return row?.count ?? 0;
}

/**
 * Returns all items with their options and current voteCounts for analytics.
 */
export async function getAnalytics(eventId: string) {
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.status, "approved")));

  const totalResponses = totalRow?.count ?? 0;

  const eventItems = await db
    .select()
    .from(items)
    .where(eq(items.eventId, eventId))
    .orderBy(items.order);

  if (eventItems.length === 0) {
    return { totalResponses, items: [] };
  }

  const itemIds = eventItems.map((i) => i.id);

  // Fetch all options
  const allOptions = await db
    .select()
    .from(options)
    .where(inArray(options.itemId, itemIds))
    .orderBy(options.order);

  // Fetch all text answers (only for approved participants)
  const allTextAnswers = await db
    .select({
      itemId: answers.itemId,
      text: answers.textAnswer,
    })
    .from(answers)
    .innerJoin(participants, eq(answers.participantId, participants.id))
    .where(
      and(
        inArray(answers.itemId, itemIds),
        sql`${answers.textAnswer} IS NOT NULL`,
        eq(participants.status, "approved")
      )
    );

  const analyticsItems = eventItems.map((item) => {
    const itemOptions = allOptions.filter((o) => o.itemId === item.id);
    const itemTextAnswers = allTextAnswers
      .filter((a) => a.itemId === item.id)
      .map((a) => a.text)
      .filter((t): t is string => !!t);

    return {
      itemId: item.id,
      text: item.text,
      options: itemOptions.map((o) => ({
        optionId: o.id,
        text: o.text,
        voteCount: o.voteCount,
        percentage:
          totalResponses > 0
            ? Math.round((o.voteCount / totalResponses) * 1000) / 10
            : 0,
      })),
      textResponses: itemTextAnswers,
    };
  });

  return { totalResponses, items: analyticsItems };
}
