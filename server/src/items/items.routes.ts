import type { FastifyPluginAsync } from "fastify";
import {
  itemEventParamsSchema,
  itemParamsSchema,
  createItemBodySchema,
  updateItemBodySchema,
} from "./items.schema.js";
import {
  handleCreateItem,
  handleListItems,
  handleGetItem,
  handleUpdateItem,
  handleDeleteItem,
} from "./items.handler.js";

// Mounted at: /events/:eventId/items
const itemsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/",
    { schema: { params: itemEventParamsSchema, body: createItemBodySchema } },
    handleCreateItem,
  );

  app.get(
    "/",
    { schema: { params: itemEventParamsSchema } },
    handleListItems,
  );

  app.get(
    "/:itemId",
    { schema: { params: itemParamsSchema } },
    handleGetItem,
  );

  app.patch(
    "/:itemId",
    { schema: { params: itemParamsSchema, body: updateItemBodySchema } },
    handleUpdateItem,
  );

  app.delete(
    "/:itemId",
    { schema: { params: itemParamsSchema } },
    handleDeleteItem,
  );
};

export default itemsRoutes;
