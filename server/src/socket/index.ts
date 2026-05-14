import * as SocketIO from "socket.io";
import type { Server as HttpServer } from "node:http";
import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import { events } from "../db/schema.js";
import { eq } from "drizzle-orm";

export interface ClientToServerEvents {
  "join:room": (payload: { eventId: string }) => void;
}

export interface ServerToClientEvents {
  "room:joined": (payload: { eventId: string }) => void;
  "response:new": (payload: {
    optionId: string;
    itemId: string;
    newVoteCount: number;
    totalResponses: number;
  }) => void;
  "response:count": (payload: { totalResponses: number }) => void;
  "participant:status_updated": (payload: {
    participantId: string;
    status: string;
  }) => void;
  error: (payload: { message: string }) => void;
}

export interface SocketData {
  userId: string;
}

export type IOServer = SocketIO.Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

let io: IOServer;

export function setupSocket(server: HttpServer): IOServer {
  io = new SocketIO.Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(server, {
    cors: { origin: "*", credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const session = await auth.api.getSession({
        headers: { cookie: cookieHeader } as Record<string, string>,
      });

      if (!session?.user?.id) {
        return next(new Error("Unauthorized: no valid session"));
      }

      socket.data.userId = session.user.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join:room", async ({ eventId }) => {
      try {
        const [event] = await db
          .select()
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);

        if (!event) {
          socket.emit("error", { message: "Event not found" });
          return;
        }

        if (
          event.resultsVisibility === "private" &&
          socket.data.userId !== event.creatorId
        ) {
          socket.emit("error", {
            message: "Access denied: results are private",
          });
          return;
        }

        await socket.join(eventId);
        socket.emit("room:joined", { eventId });
      } catch {
        socket.emit("error", { message: "Failed to join room" });
      }
    });
  });

  return io;
}

export function getIo(): IOServer {
  if (!io)
    throw new Error("Socket.io not initialised , call setupSocket() first");
  return io;
}
