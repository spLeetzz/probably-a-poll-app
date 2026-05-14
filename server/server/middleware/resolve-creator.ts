import type { FastifyRequest, FastifyReply } from "fastify";
import { NO_SESSION_MESSAGE } from "./auth-messages.js";

export async function resolveCreator(req: FastifyRequest, _reply: FastifyReply) {
  // Better-auth manages both regular and anonymous sessions via its own cookie.
  // The global preHandler in app.ts resolves req.user from the session.
  // Anonymous users are created client-side via authClient.signIn.anonymous()
  // before hitting any protected route.
  if (!req.user?.id) {
    throw req.server.httpErrors.unauthorized(NO_SESSION_MESSAGE);
  }

  req.creatorId = req.user.id;
}
