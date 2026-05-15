import Fastify from "fastify";
import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import type { FastifyRequest } from "fastify";
import { auth } from "./auth/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import eventsRoutes from "./events/events.routes.js";
import itemsRoutes from "./items/items.routes.js";
import optionsRoutes from "./options/options.routes.js";
import responsesRoutes from "./responses/responses.routes.js";
import proxyRoutes from "./proxy/proxy.routes.js";
import cors from "@fastify/cors";
import { ALLOWED_ORIGINS } from "./main.js";

const app = Fastify({ logger: true });

app.decorateRequest("user", null);
app.decorateRequest("creatorId", "");

app.setErrorHandler(errorHandler);

app.addHook("preHandler", async (req: FastifyRequest) => {
  const session = await auth.api.getSession({
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, String(v)]),
    ) as Record<string, string>,
  });
  req.user = session?.user ?? null;
});

await app.register(sensible);
await app.register(cookie);

await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  credentials: true,
});

await app.register(eventsRoutes, { prefix: "/events" });
await app.register(itemsRoutes, { prefix: "/events/:eventId/items" });
await app.register(optionsRoutes, {
  prefix: "/events/:eventId/items/:itemId/options",
});
await app.register(responsesRoutes, { prefix: "/events/:eventId" });
await app.register(proxyRoutes, { prefix: "/proxy" });

export default app;
