export const optionEventItemParamsSchema = {
  type: "object",
  required: ["eventId", "itemId"],
  properties: {
    eventId: { type: "string" },
    itemId: { type: "string" },
  },
} as const;

// Single batch-replace body — send the full desired state for an item's options.
// Omitting an option removes it. Providing an id preserves it (and its order in the DB).
export const setOptionsBodySchema = {
  type: "object",
  required: ["options"],
  additionalProperties: false,
  properties: {
    options: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["text", "order"],
        additionalProperties: false,
        properties: {
          id: { type: "string", format: "uuid" }, // optional — omit for new options
          text: { type: "string", minLength: 1, maxLength: 500 },
          order: { type: "integer", minimum: 1 },
          // voteCount intentionally excluded — server managed only
        },
      },
    },
  },
} as const;

// --- TypeScript interfaces ---

export interface OptionEventItemParams {
  eventId: string;
  itemId: string;
}

export interface OptionInput {
  id?: string;
  text: string;
  order: number;
}

export interface SetOptionsBody {
  options: OptionInput[];
}
