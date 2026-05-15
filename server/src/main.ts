import "./config/validate-env.js"; // validate ENVs first
import { createServer } from "node:http";
import { auth } from "./auth/index.js";
import app from "./app.js";
import { toNodeHandler } from "better-auth/node";
import { setupSocket } from "./socket/index.js";

const server = createServer(async (req, res) => {
  if (req.url?.startsWith("/api/auth")) {
    const origin = req.headers.origin || "";
    const allowed = [process.env.FRONTEND_URL, "http://localhost:3000"].filter(
      Boolean,
    );

    if (allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
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
