import type { FastifyRequest, FastifyReply } from "fastify";
import * as repo from "./responses.repo.js";
import { getEventById } from "../events/events.repo.js";
import { listItemsWithOptions } from "../items/items.repo.js";
import { getIo } from "../socket/index.js";
import { NO_SESSION_MESSAGE } from "../middleware/auth-messages.js";
import type { RespondParams, RespondBody, ParticipantParams, UpdateParticipantBody } from "./responses.schema.js";

export async function handleRespond(req: FastifyRequest, reply: FastifyReply) {
  const { eventId } = req.params as RespondParams;
  const event = await getEventById(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");

  if (!req.user?.id) {
    throw req.server.httpErrors.unauthorized(NO_SESSION_MESSAGE);
  }

  switch (event.type) {
    case "poll": {
      const { answers } = req.body as RespondBody;
      if (event.authOnly && (req.user as any)?.isAnonymous) {
        throw req.server.httpErrors.forbidden("This event requires a verified account to participate");
      }
      return handlePollResponse(reply, event, answers, req.user!.id);
    }

    default:
      throw req.server.httpErrors.badRequest("Unknown event type");
  }
}

async function handlePollResponse(reply: FastifyReply, event: any, answers: any, userId: string) {
  const eventId = event.id;

  if (event.status !== "running") {
    throw reply.server.httpErrors.badRequest("Poll is not currently running");
  }

  if (event.expiresAt && new Date(event.expiresAt) < new Date()) {
    throw reply.server.httpErrors.badRequest("Poll has expired");
  }

  const existing = await repo.findExistingParticipant(eventId, userId);
  if (existing?.submittedAt) {
    throw reply.server.httpErrors.conflict("You have already responded to this poll");
  }

  const itemsWithOptions = await listItemsWithOptions(eventId);
  const mandatoryItemIds = itemsWithOptions.filter((i) => i.isMandatory).map((i) => i.id);
  const answeredItemIds = new Set(answers.map((a: any) => a.itemId));
  const missingItemIds = mandatoryItemIds.filter((id) => !answeredItemIds.has(id));

  if (missingItemIds.length > 0) {
    throw reply.server.httpErrors.badRequest(
      `Missing answers for mandatory items: ${missingItemIds.join(", ")}`,
    );
  }

  const status = event.joinMode === "open" ? "approved" : "pending";
  const { participantId, submittedAt, updatedOptions } =
    await repo.submitResponse(eventId, userId, answers, status);

  const totalResponses = await repo.getResponseCount(eventId);
  const io = getIo();

  for (const opt of updatedOptions) {
    const payload = { optionId: opt.id, itemId: opt.itemId, newVoteCount: opt.voteCount, totalResponses };

    if (event.resultsVisibility === "public") {
      io.to(eventId).emit("response:new", payload);
    } else {
      const sockets = await io.in(eventId).fetchSockets();
      for (const socket of sockets) {
        if ((socket.data as { userId?: string }).userId === event.creatorId) {
          socket.emit("response:new", payload);
        }
      }
    }
  }

  if (updatedOptions.length === 0) {
    const payload = { totalResponses };
    if (event.resultsVisibility === "public") {
      io.to(eventId).emit("response:count", payload);
    } else {
      const sockets = await io.in(eventId).fetchSockets();
      for (const socket of sockets) {
        if ((socket.data as { userId?: string }).userId === event.creatorId) {
          socket.emit("response:count", payload);
        }
      }
    }
  }

  return reply.status(201).send({ data: { participantId, submittedAt } });
}

export async function handleGetAnalytics(req: FastifyRequest, reply: FastifyReply) {
  const { eventId } = req.params as RespondParams;

  const event = await getEventById(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");

  if (event.resultsVisibility === "private") {
    if (!req.user?.id) throw req.server.httpErrors.unauthorized(NO_SESSION_MESSAGE);
    if (req.user.id !== event.creatorId) {
      throw req.server.httpErrors.forbidden("Results are private for this event");
    }
  }

  const analytics = await repo.getAnalytics(eventId);
  return reply.send({ data: analytics });
}

export async function handleListParticipants(req: FastifyRequest, reply: FastifyReply) {
  const { eventId } = req.params as RespondParams;

  const event = await getEventById(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");

  if (!req.user?.id || req.user.id !== event.creatorId) {
    throw req.server.httpErrors.forbidden("Only creator can view participants");
  }

  const participants = await repo.listParticipants(eventId);
  return reply.send({ data: participants });
}

export async function handleUpdateParticipant(req: FastifyRequest, reply: FastifyReply) {
  const { eventId, participantId } = req.params as ParticipantParams;
  const { status } = req.body as UpdateParticipantBody;

  const event = await getEventById(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");

  if (!req.user?.id || req.user.id !== event.creatorId) {
    throw req.server.httpErrors.forbidden("Only creator can update participants");
  }

  const updated = await repo.updateParticipantStatus(participantId, status);
  if (!updated) throw req.server.httpErrors.notFound("Participant not found");

  const io = getIo();
  io.to(eventId).emit("participant:status_updated", { participantId, status });

  return reply.send({ data: updated });
}
