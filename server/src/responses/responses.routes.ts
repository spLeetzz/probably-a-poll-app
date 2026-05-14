import type { FastifyPluginAsync } from "fastify";
import {
  respondParamsSchema,
  respondBodySchema,
  participantParamsSchema,
  updateParticipantBodySchema,
} from "./responses.schema.js";
import {
  handleRespond,
  handleGetAnalytics,
  handleListParticipants,
  handleUpdateParticipant,
} from "./responses.handler.js";

// Mounted at: /events/:eventId
const responsesRoutes: FastifyPluginAsync = async (app) => {
  // POST /events/:eventId/respond
  app.post(
    "/respond",
    { schema: { params: respondParamsSchema, body: respondBodySchema } },
    handleRespond,
  );

  // GET /events/:eventId/analytics
  app.get(
    "/analytics",
    { schema: { params: respondParamsSchema } },
    handleGetAnalytics,
  );

  // GET /events/:eventId/participants  (creator only)
  app.get(
    "/participants",
    { schema: { params: respondParamsSchema } },
    handleListParticipants,
  );

  // PATCH /events/:eventId/participants/:participantId  (creator only)
  app.patch(
    "/participants/:participantId",
    { schema: { params: participantParamsSchema, body: updateParticipantBodySchema } },
    handleUpdateParticipant,
  );
};

export default responsesRoutes;
