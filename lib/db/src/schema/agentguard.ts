import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const policies = pgTable("agentguard_policies", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  active: boolean("active").notNull().default(true),
});

export const memories = pgTable("agentguard_memories", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull(),
  category: text("category").notNull(),
  situation: text("situation").notNull(),
  customerRequest: text("customer_request").notNull(),
  agentResponse: text("agent_response").notNull(),
  failure: text("failure").notNull(),
  humanCorrection: text("human_correction").notNull(),
  correctAction: text("correct_action").notNull(),
  outcome: text("outcome").notNull(),
  severity: text("severity").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  retrievalCount: integer("retrieval_count").notNull().default(0),
});

export const interactions = pgTable("agentguard_interactions", {
  id: text("id").primaryKey(),
  request: text("request").notNull(),
  category: text("category").notNull(),
  workerResponse: text("worker_response").notNull(),
  finalResponse: text("final_response").notNull(),
  supervisor: jsonb("supervisor").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  riskLevel: text("risk_level").notNull(),
  relatedMemories: text("related_memories").array().notNull().default([]),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const feedback = pgTable("agentguard_feedback", {
  id: text("id").primaryKey(),
  interactionId: text("interaction_id").notNull(),
  decision: text("decision").notNull(),
  whatWasWrong: text("what_was_wrong"),
  whatShouldHaveHappened: text("what_should_have_happened"),
  correctResponse: text("correct_response"),
  memoryCreated: boolean("memory_created").notNull().default(false),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const activity = pgTable("agentguard_activity", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export type Policy = typeof policies.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;