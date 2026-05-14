import type { FastifyRequest, FastifyReply } from "fastify";
import * as repo from "./items.repo.js";
import { getEventById } from "../events/events.repo.js";
import type {
  ItemEventParams,
  ItemParams,
  CreateItemBody,
  UpdateItemBody,
} from "./items.schema.js";

async function requireEvent(req: FastifyRequest, eventId: string) {
  const event = await getEventById(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  return event;
}

function requirePending(req: FastifyRequest, status: string) {
  if (status !== "pending") {
    throw req.server.httpErrors.badRequest("Items can only be modified when event is pending");
  }
}

function requireCreator(req: FastifyRequest, creatorId: string) {
  if (req.user!.id !== creatorId) {
    throw req.server.httpErrors.forbidden("Only the event creator can modify items");
  }
}

export async function handleCreateItem(req: FastifyRequest, reply: FastifyReply) {
  const { eventId } = req.params as ItemEventParams;
  const body = req.body as CreateItemBody;

  const event = await requireEvent(req, eventId);
  requirePending(req, event.status);
  requireCreator(req, event.creatorId);

  const item = await repo.createItem(eventId, body);
  return reply.status(201).send({ data: item });
}

export async function handleListItems(req: FastifyRequest, reply: FastifyReply) {
  const { eventId } = req.params as ItemEventParams;
  await requireEvent(req, eventId);
  const data = await repo.listItemsWithOptions(eventId);
  return reply.send({ data });
}

export async function handleGetItem(req: FastifyRequest, reply: FastifyReply) {
  const { itemId } = req.params as ItemParams;
  const item = await repo.getItemWithOptions(itemId);
  if (!item) throw req.server.httpErrors.notFound("Item not found");
  return reply.send({ data: item });
}

export async function handleUpdateItem(req: FastifyRequest, reply: FastifyReply) {
  const { eventId, itemId } = req.params as ItemParams;
  const body = req.body as UpdateItemBody;

  const event = await requireEvent(req, eventId);
  requirePending(req, event.status);
  requireCreator(req, event.creatorId);

  const item = await repo.updateItem(itemId, body);
  if (!item) throw req.server.httpErrors.notFound("Item not found");
  return reply.send({ data: item });
}

export async function handleDeleteItem(req: FastifyRequest, reply: FastifyReply) {
  const { eventId, itemId } = req.params as ItemParams;

  const event = await requireEvent(req, eventId);
  requirePending(req, event.status);
  requireCreator(req, event.creatorId);

  const item = await repo.deleteItem(itemId);
  if (!item) throw req.server.httpErrors.notFound("Item not found");
  return reply.status(200).send({ data: { deleted: true, id: item.id } });
}
