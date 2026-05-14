import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Event } from "../api/events-api";
import { ensureHiddenSession } from "../lib/ensure-hidden-session";
import { getSocketBaseUrl } from "../lib/socket-url";

/** Fired when a multiple-choice option is selected , carries updated vote counts. */
export type ResponseNewPayload = {
  optionId: string;
  itemId: string;
  newVoteCount: number;
  totalResponses: number;
};

/** Fired on every response submission (including text-only) , carries updated total. */
export type ResponseCountPayload = {
  totalResponses: number;
};

/** Fired when a participant's approval status changes. */
export type ParticipantStatusPayload = {
  participantId: string;
  status: "approved" | "rejected";
};

export type LiveConnectionStatus =
  | "idle"
  | "off"
  | "connecting"
  | "live"
  | "unavailable"
  | "private";

export function useEventRealtime(opts: {
  eventId: string | undefined;
  event: Event | null;
  isCreator: boolean;
  isAnonymous: boolean;
  enabled: boolean;
  onResponseNew: (payload: ResponseNewPayload) => void;
  onResponseCount?: (payload: ResponseCountPayload) => void;
  onParticipantStatusUpdated?: (payload: ParticipantStatusPayload) => void;
}): LiveConnectionStatus {
  const [status, setStatus] = useState<LiveConnectionStatus>("idle");
  const cbNewRef = useRef(opts.onResponseNew);
  const cbCountRef = useRef(opts.onResponseCount);
  const cbParticipantRef = useRef(opts.onParticipantStatusUpdated);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    cbNewRef.current = opts.onResponseNew;
  }, [opts.onResponseNew]);
  useEffect(() => {
    cbCountRef.current = opts.onResponseCount;
  }, [opts.onResponseCount]);
  useEffect(() => {
    cbParticipantRef.current = opts.onParticipantStatusUpdated;
  }, [opts.onParticipantStatusUpdated]);

  useEffect(() => {
    if (!opts.enabled || !opts.eventId || !opts.event) {
      setStatus("off");
      return;
    }

    const ev = opts.event;
    // Anonymous users must not join a room for authOnly events,
    // and non-creators cannot join private-results rooms.
    const canJoin =
      opts.isCreator ||
      (ev.resultsVisibility === "public" && !(ev.authOnly && opts.isAnonymous));
    if (!canJoin) {
      setStatus("private");
      return;
    }

    let cancelled = false;
    const eventId = opts.eventId;
    setStatus("connecting");

    void (async () => {
      try {
        await ensureHiddenSession();
      } catch {
        if (!cancelled) setStatus("unavailable");
        return;
      }
      if (cancelled) return;

      const socket = io(getSocketBaseUrl(), {
        path: "/socket.io",
        withCredentials: true,
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("connect", () => socket.emit("join:room", { eventId }));
      socket.on("room:joined", () => {
        if (!cancelled) setStatus("live");
      });

      socket.on("response:new", (payload: ResponseNewPayload) => {
        cbNewRef.current(payload);
      });

      socket.on("response:count", (payload: ResponseCountPayload) => {
        cbCountRef.current?.(payload);
      });

      socket.on(
        "participant:status_updated",
        (payload: ParticipantStatusPayload) => {
          cbParticipantRef.current?.(payload);
        },
      );

      socket.on("error", (e: { message?: string }) => {
        if (cancelled) return;
        const m = e?.message ?? "";
        setStatus(
          m.includes("private") || m.includes("Access denied")
            ? "private"
            : "unavailable",
        );
      });
      socket.on("connect_error", () => {
        if (!cancelled) setStatus("unavailable");
      });
      socket.on("disconnect", () => {
        if (!cancelled) setStatus("off");
      });
    })();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      socketRef.current = null;
      s?.removeAllListeners();
      s?.disconnect();
    };
  }, [
    opts.enabled,
    opts.eventId,
    opts.event?.resultsVisibility,
    opts.isCreator,
    opts.event,
  ]);

  return status;
}
