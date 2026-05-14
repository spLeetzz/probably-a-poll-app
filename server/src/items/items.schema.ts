export const itemEventParamsSchema = {
  type: "object",
  required: ["eventId"],
  properties: {
    eventId: { type: "string" },
  },
} as const;

export const itemParamsSchema = {
  type: "object",
  required: ["eventId", "itemId"],
  properties: {
    eventId: { type: "string" },
    itemId: { type: "string" },
  },
} as const;

export const createItemBodySchema = {
  type: "object",
  required: ["text", "order"],
  additionalProperties: false,
  properties: {
    text: { type: "string", minLength: 1, maxLength: 1000 },
    order: { type: "integer", minimum: 1 },
    isMandatory: { type: "boolean" },
  },
} as const;

export const updateItemBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    text: { type: "string", minLength: 1, maxLength: 1000 },
    order: { type: "integer", minimum: 1 },
    isMandatory: { type: "boolean" },
  },
} as const;

export interface ItemEventParams {
  eventId: string;
}

export interface ItemParams {
  eventId: string;
  itemId: string;
}

export interface CreateItemBody {
  text: string;
  order: number;
  isMandatory?: boolean;
}

export interface UpdateItemBody {
  text?: string;
  order?: number;
  isMandatory?: boolean;
}
