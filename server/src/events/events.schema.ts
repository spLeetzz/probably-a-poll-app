const EVENT_TYPES = ["poll"] as const;
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
