import type { Namespace, Socket } from "socket.io";
import {
  getEventBySlug,
  findParticipantByToken,
  findParticipantById,
  createMessage,
} from "../events/events.repo.js";

export interface BanterClientToServer {
  join_room: (payload: { joinSlug: string; sessionToken: string }) => void;
  send_message: (payload: { content: string }) => void;
}

export interface BanterServerToClient {
  new_message: (payload: {
    id: string;
    content: string;
    participantId: string;
    displayName: string;
    createdAt: string;
  }) => void;
  participant_joined: (payload: {
    displayName: string;
    participantId: string;
  }) => void;
  new_item: (payload: Record<string, unknown>) => void;
  answer_recorded: (payload: Record<string, unknown>) => void;
  room_joined: (payload: { eventId: string }) => void;
  presence_update: (payload: { count: number }) => void;
  error: (payload: { message: string }) => void;
}

export interface BanterSocketData {
  participantId?: string;
  eventId?: string;
  displayName?: string;
}

type BanterNamespace = Namespace<
  BanterClientToServer,
  BanterServerToClient,
  Record<string, never>,
  BanterSocketData
>;

export function setupBanterNamespace(nsp: BanterNamespace) {
  // No auth middleware on this namespace — participants authenticate via sessionToken
  // sent in the join_room event.

  nsp.on("connection", (socket: Socket<BanterClientToServer, BanterServerToClient, Record<string, never>, BanterSocketData>) => {
    socket.on("join_room", async ({ joinSlug, sessionToken }) => {
      try {
        const event = await getEventBySlug(joinSlug);
        if (!event) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const participant = await findParticipantByToken(event.id, sessionToken);
        if (!participant) {
          socket.emit("error", { message: "Invalid session token" });
          return;
        }

        // Store on socket data for later use
        socket.data.participantId = participant.id;
        socket.data.eventId = event.id;
        socket.data.displayName = participant.displayName ?? "Anonymous";

        // Join the Socket.IO room keyed by eventId (not joinSlug, since slug can change)
        await socket.join(event.id);
        socket.emit("room_joined", { eventId: event.id });

        // Broadcast presence update to everyone in the room
        const roomSize = nsp.adapter.rooms.get(event.id)?.size ?? 0;
        nsp.to(event.id).emit("presence_update", { count: roomSize });
      } catch {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("disconnect", () => {
      const { eventId } = socket.data;
      if (eventId) {
        const roomSize = nsp.adapter.rooms.get(eventId)?.size ?? 0;
        nsp.to(eventId).emit("presence_update", { count: roomSize });
      }
    });

    socket.on("send_message", async ({ content }) => {
      try {
        const { participantId, eventId, displayName } = socket.data;

        if (!participantId || !eventId) {
          socket.emit("error", { message: "Not in a room. Call join_room first." });
          return;
        }

        if (!content || content.length === 0 || content.length > 2000) {
          socket.emit("error", { message: "Message content must be 1-2000 characters" });
          return;
        }

        // Re-validate participant still exists
        const participant = await findParticipantById(participantId);
        if (!participant) {
          socket.emit("error", { message: "Participant no longer valid" });
          return;
        }

        const msg = await createMessage(eventId, participantId, content);

        // Broadcast to entire room (including sender)
        nsp.to(eventId).emit("new_message", {
          id: msg.id,
          content: msg.content,
          participantId,
          displayName: displayName ?? "Anonymous",
          createdAt: msg.createdAt,
        });
      } catch {
        socket.emit("error", { message: "Failed to send message" });
      }
    });
  });
}
