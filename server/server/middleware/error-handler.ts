import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // 1. Always log the real thing server-side
  request.log.error({ err: error }, "Request error");

  // 2. Pass through Fastify validation errors (schema mismatches) as 400
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      details: error.validation,
    });
  }

  // 3. Catch Postgres constraint errors BEFORE statusCode check
  // Drizzle double-wraps — check up to 2 levels deep
  const pgCode =
    (error as any).code ??
    (error as any).cause?.code ??
    (error as any).cause?.cause?.code;

  if (pgCode === "23503") {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid reference. Please re-authenticate or check your input.",
    });
  }

  if (pgCode === "23505") {
    return reply.status(409).send({
      statusCode: 409,
      error: "Conflict",
      message: "Resource already exists.",
    });
  }

  if (pgCode === "22P02") {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid input format.",
    });
  }

  // 4. Pass through known HTTP errors from @fastify/sensible (404, 403, etc.)
  // Only trust .message if it's a real FastifyError (sensible errors are)
  // Non-Fastify errors can carry a statusCode with raw SQL in .message
  if (error.statusCode && error.statusCode < 500) {
    const isFastifyError =
      (error as any)[Symbol.for("fastify.error")] === true ||
      error.name === "FastifyError";
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name || "Error",
      message: isFastifyError ? error.message : "Request failed.",
    });
  }

  // 5. Everything else: sanitized 500. NEVER send raw SQL to client.
  reply.status(500).send({
    statusCode: 500,
    error: "Internal Server Error",
    message: "Something went wrong. Please try again later.",
  });
}
