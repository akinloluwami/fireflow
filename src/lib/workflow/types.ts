// FireFlow Workflow Types

// =============================================================================
// Node Types
// =============================================================================

export type NodeCategory =
  | "trigger"
  | "action"
  | "condition"
  | "transform"
  | "others";

export type TriggerSubType =
  | "webhook"
  | "schedule"
  | "manual"
  | "form-submission";

export type ActionSubType =
  | "http-request"
  | "send-email"
  | "send-slack"
  | "send-discord"
  | "database-query"
  | "code";

export type ConditionSubType = "if-else" | "switch" | "loop";

export type TransformSubType =
  | "set-variable"
  | "function"
  | "filter"
  | "split"
  | "aggregate";

export type OthersSubType = "wait" | "note" | "sticky";

export type NodeSubType =
  | TriggerSubType
  | ActionSubType
  | ConditionSubType
  | TransformSubType
  | OthersSubType;

// =============================================================================
// Node Configuration Types
// =============================================================================

export interface WebhookConfig {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  authentication?: "none" | "basic" | "bearer" | "api-key";
}

export interface ScheduleConfig {
  cron: string;
  timezone: string;
}

export interface HttpRequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  authentication?: "none" | "basic" | "bearer" | "api-key";
}

export interface SendEmailConfig {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface SendSlackConfig {
  channel: string;
  message: string;
  webhook?: string;
}

export interface ConditionConfig {
  field: string;
  operator: "equals" | "not-equals" | "contains" | "greater" | "less";
  value: string;
}

export interface CodeConfig {
  language: "javascript" | "python";
  code: string;
}

export type NodeConfig =
  | WebhookConfig
  | ScheduleConfig
  | HttpRequestConfig
  | SendEmailConfig
  | SendSlackConfig
  | ConditionConfig
  | CodeConfig
  | Record<string, unknown>;

// =============================================================================
// Workflow Node
// =============================================================================

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  description?: string;
  config: NodeConfig;
  icon?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeCategory;
  subType: NodeSubType;
  position: NodePosition;
  data: NodeData;
}

// =============================================================================
// Workflow Edge
// =============================================================================

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

// =============================================================================
// Workflow
// =============================================================================

export type WorkflowStatus =
  | "draft"
  | "active"
  | "paused"
  | "error"
  | "testing";

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  chatThreadId?: string; // Tambo thread ID for AI chat history
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

// =============================================================================
// Node Definition (for palette and AI)
// =============================================================================

export interface NodeDefinition {
  type: NodeCategory;
  subType: NodeSubType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: NodeConfig;
  configSchema?: Record<string, unknown>;
}

// =============================================================================
// Execution Types
// =============================================================================

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface NodeExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  output?: unknown;
  error?: string;
  duration?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  nodeResults: NodeExecutionResult[];
  error?: string;
}
