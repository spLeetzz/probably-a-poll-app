import type { FastifyRequest, FastifyReply } from "fastify";
import { getEventByIdInternal, requireBanterParticipant } from "../events/events.repo.js";
import { getItemById } from "../items/items.repo.js";
import { incrementOptionVote } from "../options/options.repo.js";
import { getIo } from "../socket/index.js";

interface VoteParams { id: string }
interface VoteBody { itemId: string; optionId: string }

/**
 * POST /events/:id/vote
 *
 * Banter-specific per-item voting. Any participant can vote on any item
 * independently — no "already responded" lock. Increments option voteCount
 * and emits answer_recorded to the banter socket room.
 */
export async function handleBanterVote(req: FastifyRequest, reply: FastifyReply) {
  const { id: eventId } = req.params as VoteParams;
  const { itemId, optionId } = req.body as VoteBody;

  const event = await getEventByIdInternal(eventId);
  if (!event) throw req.server.httpErrors.notFound("Event not found");
  if (event.type !== "banter") throw req.server.httpErrors.badRequest("Vote endpoint is only for banter events");
  if (event.status !== "running") throw req.server.httpErrors.badRequest("Room is not currently active");

  // Any joined participant can vote
  await requireBanterParticipant(req, eventId);

  // Validate item belongs to this event
  const item = await getItemById(itemId);
  if (!item || item.eventId !== eventId) throw req.server.httpErrors.notFound("Item not found");

  // Increment vote count atomically
  const updated = await incrementOptionVote(optionId);
  if (!updated) throw req.server.httpErrors.notFound("Option not found");

  // Broadcast to all participants in the banter room
  const banterNsp = getIo().of("/banter");
  banterNsp.to(eventId).emit("answer_recorded", {
    itemId,
    optionId,
    newVoteCount: updated.voteCount,
  });

  return reply.status(200).send({
    data: { itemId, optionId, newVoteCount: updated.voteCount },
  });
}
