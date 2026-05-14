import {
  pgTable,
  index,
  text,
  timestamp,
  foreignKey,
  unique,
  boolean,
  uuid,
  integer,
  varchar,
  pgSequence,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema.js";

export const eventStatus = pgEnum("event_status", ["pending", "running", "completed"]);
export const eventType = pgEnum("event_type", ["poll"]);
export const joinMode = pgEnum("join_mode", ["open", "approval"]);
export const participantStatus = pgEnum("participant_status", ["pending", "approved", "rejected"]);
export const resultsVisibility = pgEnum("results_visibility", ["public", "private"]);

export const eventIdSeq = pgSequence("event_id_seq", {
  startWith: "703",
  increment: "1",
  minValue: "1",
  maxValue: "9223372036854775807",
  cache: "1",
  cycle: false,
});

export const items = pgTable(
  "items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    eventId: text("event_id").notNull(),
    order: integer().notNull(),
    text: varchar({ length: 1000 }).notNull(),
    mediaUrl: varchar("media_url", { length: 500 }),
    isMandatory: boolean("is_mandatory").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("items_event_id_idx").using(
      "btree",
      table.eventId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: "items_event_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const events = pgTable(
  "events",
  {
    id: text()
      .default(sql`next_event_id()`)
      .primaryKey()
      .notNull(),
    creatorId: text("creator_id").notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 1000 }),
    type: eventType().notNull(),
    status: eventStatus().default("pending").notNull(),
    joinMode: joinMode("join_mode").default("open").notNull(),
    authOnly: boolean("auth_only").default(false).notNull(),
    resultsVisibility: resultsVisibility("results_visibility")
      .default("public")
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    itemCount: integer("item_count").default(0).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
  },
  (table) => [
    index("events_creator_id_idx").using(
      "btree",
      table.creatorId.asc().nullsLast().op("text_ops"),
    ),
    index("events_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.creatorId],
      foreignColumns: [user.id],
      name: "events_creator_id_user_id_fk",
    }).onDelete("set null"),
  ],
);

export const options = pgTable(
  "options",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    itemId: uuid("item_id").notNull(),
    text: varchar({ length: 500 }).notNull(),
    order: integer().notNull(),
    voteCount: integer("vote_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("options_item_id_idx").using(
      "btree",
      table.itemId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [items.id],
      name: "options_item_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    eventId: text("event_id").notNull(),
    userId: text("user_id"),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 100 }),
    status: participantStatus("status").default("pending").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("participants_event_id_idx").using(
      "btree",
      table.eventId.asc().nullsLast().op("text_ops"),
    ),
    index("participants_session_token_idx").using(
      "btree",
      table.sessionToken.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: "participants_event_id_fkey",
    }).onDelete("cascade"),
    unique("participants_event_id_session_token_key").on(
      table.eventId,
      table.sessionToken,
    ),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    participantId: uuid("participant_id").notNull(),
    itemId: uuid("item_id").notNull(),
    optionId: uuid("option_id"),
    textAnswer: varchar("text_answer", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("answers_item_id_idx").using(
      "btree",
      table.itemId.asc().nullsLast().op("uuid_ops"),
    ),
    index("answers_participant_id_idx").using(
      "btree",
      table.participantId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [items.id],
      name: "answers_item_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.optionId],
      foreignColumns: [options.id],
      name: "answers_option_id_fkey",
    }),
    foreignKey({
      columns: [table.participantId],
      foreignColumns: [participants.id],
      name: "answers_participant_id_fkey",
    }).onDelete("cascade"),
  ],
);
