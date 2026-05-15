import type { FastifyRequest, FastifyReply } from "fastify";
import * as repo from "./options.repo.js";
import { getEventByIdInternal, requireBanterParticipant } from "../events/events.repo.js";
import { getItemById } from "../items/items.repo.js";
import { NO_SESSION_MESSAGE } from "../middleware/auth-messages.js";
import type {
  OptionEventItemParams,
  SetOptionsBody,
} from "./options.schema.js";

async function requireEvent(req: FastifyRequest, eventId: string) {
  const event = await getEventByIdInternal(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  return event;
}

async function requireItem(req: FastifyRequest, itemId: string, eventId: string) {
  const item = await getItemById(itemId);
  if (!item || item.eventId !== eventId) {
    throw req.server.httpErrors.notFound("Item not found");
  }
  return item;
}

/**
 * PUT /events/:eventId/items/:itemId/options
 *
 * Replaces the full set of options for an item in one transaction.
 * Only allowed while the event is pending and caller is the creator.
 */
export async function handleSetOptions(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const { eventId, itemId } = req.params as OptionEventItemParams;
  const { options } = req.body as SetOptionsBody;

  const event = await requireEvent(req, eventId);

  if (event.type !== "banter" && event.status !== "pending") {
    throw req.server.httpErrors.badRequest(
      "Options can only be modified when event is pending",
    );
  }

  if (event.type === "banter") {
    await requireBanterParticipant(req, event.id);
  } else {
    if (!req.user?.id) {
      throw req.server.httpErrors.unauthorized(NO_SESSION_MESSAGE);
    }
    if (req.user.id !== event.creatorId) {
      throw req.server.httpErrors.forbidden(
        "Only the event creator can modify options",
      );
    }
  }

  await requireItem(req, itemId, eventId);

  const result = await repo.setOptions(itemId, options);
  return reply.send({ data: result });
}
