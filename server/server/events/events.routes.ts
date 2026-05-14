import type { FastifyPluginAsync } from "fastify";
import { resolveCreator } from "../middleware/resolve-creator.js";
import {
  createEventBodySchema,
  updateEventBodySchema,
  listEventsQuerySchema,
  eventParamsSchema,
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
} from "./events.handler.js";

const eventsRoutes: FastifyPluginAsync = async (app) => {
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
};

export default eventsRoutes;
