import { relations } from "drizzle-orm/relations";
import {
  user,
  account,
  session,
} from "./auth-schema.js";
import {
  events,
  items,
  options,
  participants,
  answers,
} from "./schema.js";

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  events: many(events),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  event: one(events, {
    fields: [items.eventId],
    references: [events.id],
  }),
  options: many(options),
  answers: many(answers),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  items: many(items),
  user: one(user, {
    fields: [events.creatorId],
    references: [user.id],
  }),
  participants: many(participants),
}));

export const optionsRelations = relations(options, ({ one, many }) => ({
  item: one(items, {
    fields: [options.itemId],
    references: [items.id],
  }),
  answers: many(answers),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    event: one(events, {
      fields: [participants.eventId],
      references: [events.id],
    }),
    answers: many(answers),
  }),
);

export const answersRelations = relations(answers, ({ one }) => ({
  item: one(items, {
    fields: [answers.itemId],
    references: [items.id],
  }),
  option: one(options, {
    fields: [answers.optionId],
    references: [options.id],
  }),
  participant: one(participants, {
    fields: [answers.participantId],
    references: [participants.id],
  }),
}));
