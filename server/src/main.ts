import "./config/validate-env.js"; // validate ENVs first
import { createServer } from "node:http";
import { auth } from "./auth/index.js";
import app from "./app.js";
import { toNodeHandler } from "better-auth/node";
import { setupSocket } from "./socket/index.js";

const server = createServer(async (req, res) => {
  // better-auth owns its routes
  if (req.url?.startsWith("/api/auth")) {
    return toNodeHandler(auth)(req, res);
  }

  // Fastify handles everything else
  app.routing(req, res);
});

// Attach socket.io to the same HTTP server
setupSocket(server);

await app.ready();

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  app.log.info(`Server listening on PORT ${PORT}`);
});
