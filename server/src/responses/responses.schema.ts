export const respondParamsSchema = {
  type: "object",
  required: ["eventId"],
  properties: {
    eventId: { type: "string" },
  },
} as const;

export const respondBodySchema = {
  type: "object",
  required: ["answers"],
  additionalProperties: false,
  properties: {
    answers: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["itemId"],
        additionalProperties: false,
        properties: {
          itemId: { type: "string", format: "uuid" },
          optionId: { type: "string", format: "uuid" },
          textAnswer: { type: "string", maxLength: 500 },
        },
        anyOf: [
          { required: ["optionId"] },
          { required: ["textAnswer"] }
        ]
      },
    },
  },
} as const;

export const participantParamsSchema = {
  type: "object",
  required: ["eventId", "participantId"],
  properties: {
    eventId: { type: "string" },
    participantId: { type: "string", format: "uuid" },
  },
} as const;

export const updateParticipantBodySchema = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["pending", "approved", "rejected"] },
  },
} as const;

// --- TypeScript interfaces ---

export interface RespondParams {
  eventId: string;
}

export interface AnswerInput {
  itemId: string;
  optionId?: string;
  textAnswer?: string;
}

export interface RespondBody {
  answers: AnswerInput[];
}

export interface ParticipantParams {
  eventId: string;
  participantId: string;
}

export interface UpdateParticipantBody {
  status: "pending" | "approved" | "rejected";
}
