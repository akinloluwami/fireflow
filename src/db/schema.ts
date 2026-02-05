import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// =============================================================================
// Better Auth Tables
// =============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// Legacy Tables
// =============================================================================

export const todos = pgTable("todos", {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// Workflow Tables
// =============================================================================

export const workflows = pgTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'paused' | 'error'
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

// =============================================================================
// Integration Tables (Slack, Discord, etc.)
// =============================================================================

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

// =============================================================================
// Webhook Tables (for Tally, etc.)
// =============================================================================

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
