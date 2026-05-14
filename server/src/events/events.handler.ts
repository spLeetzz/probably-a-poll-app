import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  CreateEventBody,
  UpdateEventBody,
  ListEventsQuery,
  EventParams,
} from "./events.schema.js";
import * as repo from "./events.repo.js";

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

  if (existing.status !== "pending") {
    throw req.server.httpErrors.badRequest("Event can only be updated while in pending status");
  }

  const event = await repo.updateEvent(id, body);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  return reply.send({ data: event });
}

export async function handleDeleteEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const event = await repo.deleteEvent(id);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  return reply.status(200).send({ data: { deleted: true, id: event.id } });
}

export async function handleStartEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const event = await repo.startEvent(id);
  if (!event) throw req.server.httpErrors.badRequest("Event must be in pending status to start");
  return reply.send({ data: event });
}

export async function handleCompleteEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const event = await repo.completeEvent(id);
  if (!event) throw req.server.httpErrors.badRequest("Event must be running to complete");
  return reply.send({ data: event });
}

export async function handlePublishEvent(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as EventParams;
  const event = await repo.publishEvent(id);
  if (!event) throw req.server.httpErrors.badRequest("Event must be completed to publish");
  return reply.send({ data: event });
}
