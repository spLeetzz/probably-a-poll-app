import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  CreateEventBody,
  UpdateEventBody,
  ListEventsQuery,
  EventParams,
  SlugParams,
  JoinBanterBody,
  SendMessageBody,
  MessagesQuery,
} from "./events.schema.js";
import * as repo from "./events.repo.js";
import { getIo } from "../socket/index.js";
import type { BanterServerToClient } from "../socket/banter.js";
import { NO_SESSION_MESSAGE } from "../middleware/auth-messages.js";

// ── Standard event handlers ────────────────────────────────────────────────

export async function handleCreateEvent(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as CreateEventBody;
  const event = await repo.createEvent(body, req.creatorId);
  return reply.status(201).send({ data: event });
}

export async function handleListEvents(req: FastifyRequest, reply: FastifyReply) {
  const query = req.query as ListEventsQuery;
  const events = await repo.listEvents(query);
  return reply.send({ data: events });
}

export async function handleGetEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const event = await repo.getEventById(id);
  if (!event) throw req.server.httpErrors.notFound("Event not found");

  // Privacy check: If event has a joinSlug, it's private.
  // Only the creator can view it via the ID route.
  if (event.joinSlug && event.creatorId !== req.user?.id) {
    throw req.server.httpErrors.notFound("Event not found"); // 404 to avoid leaking existence
  }

  let participant = null;
  if (req.user?.id) {
    const { findExistingParticipant } = await import("../responses/responses.repo.js");
    participant = await findExistingParticipant(id, req.user.id);
  }

  return reply.send({ data: { ...event, participant } });
}

export async function handleUpdateEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const body = req.body as UpdateEventBody;

  const existing = await repo.getEventById(id);
  if (!existing) throw req.server.httpErrors.notFound("Event not found");

  if (existing.creatorId !== req.user?.id) {
    throw req.server.httpErrors.forbidden("Only the creator can update this event");
  }

  if (existing.status !== "pending") {
    throw req.server.httpErrors.badRequest("Event can only be updated while in pending status");
  }

  const event = await repo.updateEvent(id, body);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  return reply.send({ data: event });
}

export async function handleDeleteEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const existing = await repo.getEventById(id);
  if (!existing) throw req.server.httpErrors.notFound("Event not found");
  if (existing.creatorId !== req.user?.id) throw req.server.httpErrors.forbidden("Only the creator can delete this event");

  const event = await repo.deleteEvent(id);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  return reply.status(200).send({ data: { deleted: true, id: event.id } });
}

export async function handleStartEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const existing = await repo.getEventById(id);
  if (!existing) throw req.server.httpErrors.notFound("Event not found");
  if (existing.creatorId !== req.user?.id) throw req.server.httpErrors.forbidden("Only the creator can start this event");

  const event = await repo.startEvent(id);
  if (!event) throw req.server.httpErrors.badRequest("Event must be in pending status to start");
  return reply.send({ data: event });
}

export async function handleCompleteEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const existing = await repo.getEventById(id);
  if (!existing) throw req.server.httpErrors.notFound("Event not found");
  if (existing.creatorId !== req.user?.id) throw req.server.httpErrors.forbidden("Only the creator can complete this event");

  const event = await repo.completeEvent(id);
  if (!event) throw req.server.httpErrors.badRequest("Event must be running to complete");
  return reply.send({ data: event });
}

export async function handlePublishEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const existing = await repo.getEventById(id);
  if (!existing) throw req.server.httpErrors.notFound("Event not found");
  if (existing.creatorId !== req.user?.id) throw req.server.httpErrors.forbidden("Only the creator can publish this event");

  const event = await repo.publishEvent(id);
  if (!event) throw req.server.httpErrors.badRequest("Event must be completed to publish");
  return reply.send({ data: event });
}

// ── Banter handlers (now under /events) ───────────────────────────────────

/** GET /events/slug/:joinSlug — fetch banter event by slug */
export async function handleGetEventBySlug(req: FastifyRequest, reply: FastifyReply) {
  const { joinSlug } = req.params as SlugParams;
  const event = await repo.getEventBySlug(joinSlug);
  if (!event) throw req.server.httpErrors.notFound("Room not found");

  const participantCount = await repo.getParticipantCount(event.id);

  let participant = null;
  if (req.user?.id) {
    participant = await repo.findParticipantByUserId(event.id, req.user.id);
  }

  const eventData = event.isAnonymous ? { ...event, creatorId: undefined } : event;
  return reply.send({ data: { ...eventData, participantCount, participant } });
}

/** POST /events/:id/join — join a banter room */
export async function handleJoinRoom(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const body = req.body as JoinBanterBody;

  // Look up via ID (banter events have joinSlug but are still accessed internally by id here)
  const event = await repo.getEventByIdInternal(id);
  if (!event) throw req.server.httpErrors.notFound("Room not found");

  if (event.authOnly && !req.user?.id) {
    throw req.server.httpErrors.unauthorized("This room requires authentication to join.");
  }

  const userId = req.user?.id;

  if (userId) {
    const existing = await repo.findParticipantByUserId(event.id, userId);
    if (existing) {
      return reply.send({
        data: {
          participantId: existing.id,
          sessionToken: existing.sessionToken,
          displayName: existing.displayName,
          alreadyJoined: true,
        },
      });
    }
  }

  let displayName: string;
  if (event.isAnonymous) {
    displayName = body.displayName;
  } else if (event.authOnly && req.user?.name) {
    displayName = req.user.name;
  } else {
    displayName = body.displayName;
  }

  const participant = await repo.joinBanterRoom(event.id, displayName, userId ?? undefined);

  const io = getIo();
  const banterNsp = io.of("/banter") as unknown as {
    to(room: string): {
      emit<K extends keyof BanterServerToClient>(ev: K, ...args: Parameters<BanterServerToClient[K]>): void;
    };
  };
  banterNsp.to(event.id).emit("participant_joined", {
    displayName: participant.displayName ?? "Anonymous",
    participantId: participant.id,
  });

  return reply.status(201).send({
    data: {
      participantId: participant.id,
      sessionToken: participant.sessionToken,
      displayName: participant.displayName,
      alreadyJoined: false,
    },
  });
}

/** POST /events/:id/reset-link — creator only, generate new joinSlug */
export async function handleResetLink(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;

  const event = await repo.getEventByIdInternal(id);
  if (!event) throw req.server.httpErrors.notFound("Room not found");

  if (!req.user?.id) throw req.server.httpErrors.unauthorized(NO_SESSION_MESSAGE);
  if (req.user.id !== event.creatorId) {
    throw req.server.httpErrors.forbidden("Only the room creator can reset the link");
  }

  const updated = await repo.resetJoinSlug(event.id);
  if (!updated) throw req.server.httpErrors.internalServerError("Failed to reset link");

  return reply.send({ data: { joinSlug: updated.joinSlug } });
}

/** GET /events/:id/messages — paginated message history */
export async function handleGetMessages(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const query = req.query as MessagesQuery;

  const event = await repo.getEventByIdInternal(id);
  if (!event) throw req.server.httpErrors.notFound("Room not found");

  const msgs = await repo.getMessages(event.id, query.limit, query.cursor);

  const data = msgs.map((m) => ({
    id: m.id,
    content: m.content,
    participantId: m.participantId,
    displayName: m.displayName,
    createdAt: m.createdAt,
  }));

  const nextCursor = data.length === query.limit ? data[data.length - 1]?.createdAt ?? null : null;
  return reply.send({ data: { messages: data, nextCursor } });
}

/** POST /events/:id/messages — send message (REST fallback) */
export async function handleSendMessage(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const { content } = req.body as SendMessageBody;

  const event = await repo.getEventByIdInternal(id);
  if (!event) throw req.server.httpErrors.notFound("Room not found");

  const sessionToken = req.headers["x-session-token"] as string | undefined;
  if (!sessionToken) throw req.server.httpErrors.unauthorized("Missing session token");

  const participant = await repo.findParticipantByToken(event.id, sessionToken);
  if (!participant) throw req.server.httpErrors.forbidden("Not a participant of this room");

  const msg = await repo.createMessage(event.id, participant.id, content);

  const io = getIo();
  const banterNsp = io.of("/banter") as unknown as {
    to(room: string): {
      emit<K extends keyof BanterServerToClient>(ev: K, ...args: Parameters<BanterServerToClient[K]>): void;
    };
  };
  banterNsp.to(event.id).emit("new_message", {
    id: msg.id,
    content: msg.content,
    participantId: participant.id,
    displayName: participant.displayName ?? "Anonymous",
    createdAt: msg.createdAt,
  });

  return reply.status(201).send({
    data: {
      id: msg.id,
      content: msg.content,
      participantId: participant.id,
      displayName: participant.displayName,
      createdAt: msg.createdAt,
    },
  });
}
