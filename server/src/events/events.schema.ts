const EVENT_TYPES = ["poll", "banter"] as const;
const JOIN_MODES = ["open", "approval"] as const;
const EVENT_STATUSES = ["pending", "running", "completed"] as const;
const RESULTS_VISIBILITIES = ["public", "private"] as const;

export const eventParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string" },
  },
} as const;

export const createEventBodySchema = {
  type: "object",
  required: ["title", "type"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 },
    description: { type: "string", maxLength: 1000 },
    type: { type: "string", enum: EVENT_TYPES },
    joinMode: { type: "string", enum: JOIN_MODES },
    authOnly: { type: "boolean" },
    resultsVisibility: { type: "string", enum: RESULTS_VISIBILITIES },
    expiresAt: { type: "string", format: "date-time" },
    isPrivate: { type: "boolean" },
    isAnonymous: { type: "boolean" },
  },
} as const;

export const updateEventBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 },
    description: { type: ["string", "null"], maxLength: 1000 },
    joinMode: { type: "string", enum: JOIN_MODES },
    authOnly: { type: "boolean" },
    resultsVisibility: { type: "string", enum: RESULTS_VISIBILITIES },
    expiresAt: { type: ["string", "null"], format: "date-time" },
  },
} as const;

export const listEventsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    creatorId: { type: "string" },
    type: { type: "string", enum: EVENT_TYPES },
    status: { type: "string", enum: EVENT_STATUSES },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    offset: { type: "integer", minimum: 0, default: 0 },
  },
} as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type JoinMode = (typeof JOIN_MODES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type ResultsVisibility = (typeof RESULTS_VISIBILITIES)[number];

export interface CreateEventBody {
  title: string;
  description?: string;
  type: EventType;
  joinMode?: JoinMode;
  authOnly?: boolean;
  resultsVisibility?: ResultsVisibility;
  expiresAt?: string;
  isPrivate?: boolean;
  isAnonymous?: boolean;
}

export interface UpdateEventBody {
  title?: string;
  description?: string | null;
  joinMode?: JoinMode;
  authOnly?: boolean;
  resultsVisibility?: ResultsVisibility;
  expiresAt?: string | null;
}

export interface ListEventsQuery {
  creatorId?: string;
  type?: EventType;
  status?: EventStatus;
  limit: number;
  offset: number;
}

export interface EventParams {
  id: string;
}

// --- Banter-specific schemas & types ---

export const slugParamsSchema = {
  type: "object",
  required: ["joinSlug"],
  properties: {
    joinSlug: { type: "string", minLength: 1, maxLength: 64 },
  },
} as const;

export const joinBanterBodySchema = {
  type: "object",
  required: ["displayName"],
  additionalProperties: false,
  properties: {
    displayName: { type: "string", minLength: 1, maxLength: 100 },
  },
} as const;

export const sendMessageBodySchema = {
  type: "object",
  required: ["content"],
  additionalProperties: false,
  properties: {
    content: { type: "string", minLength: 1, maxLength: 2000 },
  },
} as const;

export const messagesQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    cursor: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  },
} as const;

export interface SlugParams {
  joinSlug: string;
}

export interface JoinBanterBody {
  displayName: string;
}

export interface SendMessageBody {
  content: string;
}

export interface MessagesQuery {
  cursor?: string;
  limit: number;
}
