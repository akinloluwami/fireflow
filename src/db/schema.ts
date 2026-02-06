import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// Re-export Better Auth tables
export * from "./auth-schema";
import { user } from "./auth-schema";

export const todos = pgTable("todos", {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'paused' | 'error'
  chatThreadId: text("chat_thread_id"), // Tambo thread ID for AI chat history
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflowExecutions = pgTable("workflow_executions", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'running' | 'completed' | 'failed'
  triggerData: jsonb("trigger_data"), // Data from the trigger (e.g., form submission)
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  result: jsonb("result"),
  error: text("error"),
});

export const workflowNodeExecutions = pgTable("workflow_node_executions", {
  id: text("id").primaryKey(),
  executionId: text("execution_id")
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // in milliseconds
});

export const integrations = pgTable("integrations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'slack' | 'discord'
  credentials: jsonb("credentials"), // Encrypted tokens/keys
  metadata: jsonb("metadata"), // Provider-specific data (workspace name, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflowWebhooks = pgTable("workflow_webhooks", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  triggerNodeId: text("trigger_node_id").notNull(), // Which trigger node this webhook is for
  provider: text("provider").notNull(), // 'tally' | 'generic'
  externalId: text("external_id"), // e.g., Tally form ID
  webhookSecret: text("webhook_secret"), // For signature validation
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
