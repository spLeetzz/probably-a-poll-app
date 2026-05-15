import "./config/validate-env.js"; // validate ENVs first
import { createServer } from "node:http";
import { auth } from "./auth/index.js";
import app from "./app.js";
import { toNodeHandler } from "better-auth/node";
import { setupSocket } from "./socket/index.js";

export const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean) as string[];

const server = createServer(async (req, res) => {
  if (req.url?.startsWith("/api/auth")) {
    const origin = req.headers.origin || "";
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.writeHead(204).end();
      return;
    }
    return toNodeHandler(auth)(req, res);
  }
  app.routing(req, res);
});

// Attach socket.io to the same HTTP server
setupSocket(server);

await app.ready();

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  app.log.info(`Server listening on PORT ${PORT}`);
});
