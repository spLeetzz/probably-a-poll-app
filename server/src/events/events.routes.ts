import type { FastifyPluginAsync } from "fastify";
import { resolveCreator } from "../middleware/resolve-creator.js";
import {
  createEventBodySchema,
  updateEventBodySchema,
  listEventsQuerySchema,
  eventParamsSchema,
  slugParamsSchema,
  joinBanterBodySchema,
  sendMessageBodySchema,
  messagesQuerySchema,
} from "./events.schema.js";
import {
  handleCreateEvent,
  handleListEvents,
  handleGetEvent,
  handleUpdateEvent,
  handleDeleteEvent,
  handleStartEvent,
  handleCompleteEvent,
  handlePublishEvent,
  handleGetEventBySlug,
  handleJoinRoom,
  handleResetLink,
  handleGetMessages,
  handleSendMessage,
} from "./events.handler.js";
import { handleBanterVote } from "./banter-vote.handler.js";

const eventsRoutes: FastifyPluginAsync = async (app) => {
  // ── Standard event routes ──────────────────────────────────────────────

  app.post(
    "/",
    { schema: { body: createEventBodySchema }, preHandler: [resolveCreator] },
    handleCreateEvent,
  );

  app.get(
    "/",
    { schema: { querystring: listEventsQuerySchema } },
    handleListEvents,
  );

  // Slug resolver — MUST come before /:id to avoid "slug" matching as an id
  app.get(
    "/slug/:joinSlug",
    { schema: { params: slugParamsSchema } },
    handleGetEventBySlug,
  );

  app.get(
    "/:id",
    { schema: { params: eventParamsSchema } },
    handleGetEvent,
  );

  app.patch(
    "/:id",
    { schema: { params: eventParamsSchema, body: updateEventBodySchema }, preHandler: [resolveCreator] },
    handleUpdateEvent,
  );

  app.delete(
    "/:id",
    { schema: { params: eventParamsSchema }, preHandler: [resolveCreator] },
    handleDeleteEvent,
  );

  app.post(
    "/:id/start",
    { schema: { params: eventParamsSchema }, preHandler: [resolveCreator] },
    handleStartEvent,
  );

  app.post(
    "/:id/complete",
    { schema: { params: eventParamsSchema }, preHandler: [resolveCreator] },
    handleCompleteEvent,
  );

  app.post(
    "/:id/publish",
    { schema: { params: eventParamsSchema }, preHandler: [resolveCreator] },
    handlePublishEvent,
  );

  // ── Banter sub-routes (under /events/:id) ─────────────────────────────

  app.post(
    "/:id/join",
    { schema: { params: eventParamsSchema, body: joinBanterBodySchema } },
    handleJoinRoom,
  );

  app.post(
    "/:id/reset-link",
    { schema: { params: eventParamsSchema }, preHandler: [resolveCreator] },
    handleResetLink,
  );

  app.get(
    "/:id/messages",
    { schema: { params: eventParamsSchema, querystring: messagesQuerySchema } },
    handleGetMessages,
  );

  app.post(
    "/:id/messages",
    { schema: { params: eventParamsSchema, body: sendMessageBodySchema } },
    handleSendMessage,
  );
  app.post(
    "/:id/vote",
    { schema: { params: eventParamsSchema, body: {
      type: "object",
      required: ["itemId", "optionId"],
      properties: {
        itemId: { type: "string" },
        optionId: { type: "string" },
      },
    }}},
    handleBanterVote,
  );
};

export default eventsRoutes;
