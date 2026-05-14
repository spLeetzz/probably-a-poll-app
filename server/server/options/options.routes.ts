import type { FastifyPluginAsync } from "fastify";
import {
  optionEventItemParamsSchema,
  setOptionsBodySchema,
} from "./options.schema.js";
import { handleSetOptions } from "./options.handler.js";

// Mounted at: /events/:eventId/items/:itemId/options
const optionsRoutes: FastifyPluginAsync = async (app) => {
  // PUT replaces the entire options list for an item in one transaction
  app.put(
    "/",
    { schema: { params: optionEventItemParamsSchema, body: setOptionsBodySchema } },
    handleSetOptions,
  );
};

export default optionsRoutes;
