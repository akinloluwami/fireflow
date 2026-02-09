import { db } from "@/db";
import {
  workflows,
  workflowExecutions,
  workflowNodeExecutions,
  integrations,
  credentials,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow/types";
import { InterpolationContext, createEmptyContext } from "./interpolate";
import { decrypt } from "@/lib/credentials/encryption";
import { maskExecutionData } from "./data-masking";

import { executeIfElse } from "./nodes/condition-if";
import { executeSwitch } from "./nodes/condition-switch";
import { executeLoop } from "./nodes/condition-loop";
import { executeSlack } from "./nodes/action-slack";
import { executeDiscord } from "./nodes/action-discord";
import { executeHttp } from "./nodes/action-http";
import { executeEmail } from "./nodes/action-email";
import { executeDatabase } from "./nodes/action-database";
import { executeSetVariable } from "./nodes/transform-variable";
import { executeWait } from "./nodes/others-wait";
// executeCode removed for security - see SECURITY_AUDIT.md
import { executeFilter } from "./nodes/transform-filter";
// executeFunction removed for security - see SECURITY_AUDIT.md
import { executeSplit } from "./nodes/transform-split";
import { executeAggregate } from "./nodes/transform-aggregate";
import { executeSentimentAnalysis } from "./nodes/ai-sentiment";

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerData: Record<string, unknown>;
  interpolation: InterpolationContext;
  // For AI nodes to find connected model picker nodes
  allNodes?: WorkflowNode[];
  allEdges?: WorkflowEdge[];
}

export interface NodeExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  // For condition nodes, which branch to take
  conditionResult?: boolean;
  // For switch nodes, which case branch to take
  switchResult?: string | null;
  // For sentiment analysis nodes, which sentiment branch to take
  sentimentResult?: "positive" | "neutral" | "negative";
  // For loop nodes, the iterations to process
  loopIterations?: Array<{
    item: unknown;
    index: number;
    total: number;
    isFirst: boolean;
    isLast: boolean;
  }>;
}

/**
 * Extract all credential IDs referenced in workflow node configs
 * Looks for {{ credentials.UUID.field }} patterns AND direct credential ID fields
 */
function extractCredentialIds(nodes: WorkflowNode[]): string[] {
  const credentialIds = new Set<string>();

  // UUID pattern for direct credential ID fields
  const uuidPattern =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

  function scanValue(value: unknown, key?: string): void {
    if (typeof value === "string") {
      // Check for direct credential ID fields (like authCredentialId, credentialId)
      if (
        key &&
        (key.toLowerCase().includes("credentialid") || key === "credential") &&
        uuidPattern.test(value)
      ) {
        credentialIds.add(value);
      }

      // Also scan for {{ credentials.UUID.field }} patterns
      const pattern = /\{\{\s*credentials\.([a-f0-9-]+)\./gi;
      let match;
      while ((match = pattern.exec(value)) !== null) {
        credentialIds.add(match[1]);
      }
    } else if (Array.isArray(value)) {
      value.forEach((v) => scanValue(v));
    } else if (value !== null && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      Object.entries(obj).forEach(([k, v]) => scanValue(v, k));
    }
  }

  for (const node of nodes) {
    if (node.data.config) {
      scanValue(node.data.config);
    }
  }

  return Array.from(credentialIds);
}

/**
 * Load and decrypt credentials by IDs for a user
 */
async function loadCredentials(
  credentialIds: string[],
  userId: string,
): Promise<Record<string, Record<string, unknown>>> {
  if (credentialIds.length === 0) return {};

  const result: Record<string, Record<string, unknown>> = {};

  const rows = await db
    .select()
    .from(credentials)
    .where(
      and(
        inArray(credentials.id, credentialIds),
        eq(credentials.userId, userId),
      ),
    );

  for (const row of rows) {
    try {
      const decrypted = decrypt(row.encryptedData);
      result[row.id] = decrypted as Record<string, unknown>;
    } catch (error) {
      console.error(`Failed to decrypt credential ${row.id}:`, error);
    }
  }

  return result;
}

export async function executeWorkflow(
  workflowId: string,
  executionId: string,
  triggerData: Record<string, unknown>,
  triggerId?: string,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Update execution status to running
    await db
      .update(workflowExecutions)
      .set({ status: "running" })
      .where(eq(workflowExecutions.id, executionId));

    // Load workflow
    const workflow = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow[0]) {
      throw new Error("Workflow not found");
    }

    const nodes = workflow[0].nodes as WorkflowNode[];
    const edges = workflow[0].edges as WorkflowEdge[];
    const userId = workflow[0].userId || "";

    // Extract and load any credentials referenced in node configs
    const credentialIds = extractCredentialIds(nodes);
    const loadedCredentials = await loadCredentials(credentialIds, userId);

    // Create execution context
    const context: ExecutionContext = {
      workflowId,
      executionId,
      userId,
      triggerData,
      interpolation: {
        ...createEmptyContext(),
        trigger: triggerData,
        credentials: loadedCredentials,
      },
      // Include nodes and edges for AI nodes to find connected model picker nodes
      allNodes: nodes,
      allEdges: edges,
    };

    // Find trigger node (starting point)
    // If triggerId is provided, use that specific trigger, otherwise fall back to first trigger
    let triggerNode = triggerId
      ? nodes.find((n) => n.id === triggerId && n.type === "trigger")
      : nodes.find((n) => n.type === "trigger");

    if (!triggerNode) {
      throw new Error(
        triggerId
          ? `Trigger node not found: ${triggerId}`
          : "No trigger node found",
      );
    }

    // Execute starting from trigger
    const chainResult = await executeNodeChain(
      triggerNode,
      nodes,
      edges,
      context,
    );

    // Check if any node failed during execution
    if (!chainResult.success) {
      await db
        .update(workflowExecutions)
        .set({
          status: "failed",
          completedAt: new Date(),
          error: chainResult.error || "A node failed during execution",
          result: { duration: Date.now() - startTime },
        })
        .where(eq(workflowExecutions.id, executionId));
      return;
    }

    // Mark execution as completed
    await db
      .update(workflowExecutions)
      .set({
        status: "completed",
        completedAt: new Date(),
        result: { duration: Date.now() - startTime },
      })
      .where(eq(workflowExecutions.id, executionId));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Mark execution as failed
    await db
      .update(workflowExecutions)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
      })
      .where(eq(workflowExecutions.id, executionId));

    throw error;
  }
}

interface ChainResult {
  success: boolean;
  error?: string;
  failedNodeId?: string;
}

async function executeNodeChain(
  node: WorkflowNode,
  allNodes: WorkflowNode[],
  allEdges: WorkflowEdge[],
  context: ExecutionContext,
): Promise<ChainResult> {
  // Execute the current node
  const result = await executeNode(node, context);

  // Store node output in interpolation context (include error if present)
  context.interpolation.nodes[node.id] = {
    output: result.output,
    error: result.error || null,
    success: result.success,
  };

  // If node failed, stop execution chain here and return failure
  if (!result.success) {
    return {
      success: false,
      error: result.error || `Node ${node.id} failed`,
      failedNodeId: node.id,
    };
  }

  // Special handling for loop nodes - iterate over items
  if (node.subType === "loop" && result.loopIterations) {
    const config = node.data.config as Record<string, unknown>;
    const itemVariable = (config.itemVariable as string) || "item";
    const indexVariable = (config.indexVariable as string) || "index";

    // Find body branch nodes (connected to "body" or legacy "true" handle)
    const bodyEdges = allEdges.filter(
      (e) =>
        e.source === node.id &&
        (e.sourceHandle === "body" || e.sourceHandle === "true"),
    );
    const bodyNodes = bodyEdges
      .map((e) => allNodes.find((n) => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined);

    // Execute body for each iteration
    for (const iteration of result.loopIterations) {
      // Add loop context for this iteration
      context.interpolation.loop = {
        [itemVariable]: iteration.item,
        [indexVariable]: iteration.index,
        item: iteration.item,
        index: iteration.index,
        total: iteration.total,
        isFirst: iteration.isFirst,
        isLast: iteration.isLast,
      };

      // Execute all body nodes for this iteration
      for (const bodyNode of bodyNodes) {
        const bodyResult = await executeNodeChain(
          bodyNode,
          allNodes,
          allEdges,
          context,
        );
        if (!bodyResult.success) {
          return bodyResult;
        }
      }
    }

    // Clear loop context after iterations complete
    delete context.interpolation.loop;

    // Find and execute "done" branch nodes (or legacy "false" handle)
    const doneEdges = allEdges.filter(
      (e) =>
        e.source === node.id &&
        (e.sourceHandle === "done" || e.sourceHandle === "false"),
    );
    const doneNodes = doneEdges
      .map((e) => allNodes.find((n) => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined);

    for (const doneNode of doneNodes) {
      const doneResult = await executeNodeChain(
        doneNode,
        allNodes,
        allEdges,
        context,
      );
      if (!doneResult.success) {
        return doneResult;
      }
    }

    return { success: true }; // Don't use getNextNodes for loops
  }

  // Find next nodes to execute
  const nextNodes = getNextNodes(node, allEdges, allNodes, result);

  // Execute next nodes in sequence (could be parallel for some node types)
  for (const nextNode of nextNodes) {
    const nextResult = await executeNodeChain(
      nextNode,
      allNodes,
      allEdges,
      context,
    );
    if (!nextResult.success) {
      return nextResult;
    }
  }

  return { success: true };
}

async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const nodeExecutionId = uuid();
  const startTime = Date.now();

  // Record node execution start - mask sensitive data before storing
  await db.insert(workflowNodeExecutions).values({
    id: nodeExecutionId,
    executionId: context.executionId,
    nodeId: node.id,
    status: "running",
    input: maskExecutionData({
      config: node.data.config,
      context: context.interpolation,
    }),
    startedAt: new Date(),
  });

  try {
    let result: NodeExecutionResult;

    switch (node.subType) {
      // Triggers (usually just pass through)
      case "webhook":
      case "form-submission":
      case "manual":
      case "schedule":
        result = { success: true, output: context.triggerData };
        break;

      // Conditions
      case "if-else":
        result = await executeIfElse(node, context);
        break;

      case "switch":
        result = await executeSwitch(node, context);
        break;

      case "loop":
        result = await executeLoop(node, context);
        break;

      // Actions
      case "send-slack":
        result = await executeSlack(node, context);
        break;

      case "send-discord":
        result = await executeDiscord(node, context);
        break;

      case "http-request":
        result = await executeHttp(node, context);
        break;

      case "send-email":
        result = await executeEmail(node, context);
        break;

      case "code":
        // Code execution disabled for security - see SECURITY_AUDIT.md
        result = {
          success: false,
          output: null,
          error: "Code execution is disabled for security reasons",
        };
        break;

      case "database-query":
        result = await executeDatabase(node, context);
        break;

      // Transforms
      case "set-variable":
        result = await executeSetVariable(node, context);
        break;

      case "function":
        // Function execution disabled for security - see SECURITY_AUDIT.md
        result = {
          success: false,
          output: null,
          error: "Function execution is disabled for security reasons",
        };
        break;

      case "filter":
        result = await executeFilter(node, context);
        break;

      case "split":
        result = await executeSplit(node, context);
        break;

      case "aggregate":
        result = await executeAggregate(node, context);
        break;

      // AI Nodes
      case "sentiment-analysis":
        result = await executeSentimentAnalysis(node, context);
        break;

      case "wait":
        result = await executeWait(node, context);
        break;

      default:
        result = {
          success: false,
          output: null,
          error: `Unknown node type: ${node.subType}`,
        };
    }

    // Update node execution record - mask sensitive data in output
    await db
      .update(workflowNodeExecutions)
      .set({
        status: result.success ? "completed" : "failed",
        output: maskExecutionData(result.output),
        error: result.error,
        completedAt: new Date(),
        duration: String(Date.now() - startTime),
      })
      .where(eq(workflowNodeExecutions.id, nodeExecutionId));

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db
      .update(workflowNodeExecutions)
      .set({
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
        duration: String(Date.now() - startTime),
      })
      .where(eq(workflowNodeExecutions.id, nodeExecutionId));

    return { success: false, output: null, error: errorMessage };
  }
}
function getNextNodes(
  currentNode: WorkflowNode,
  allEdges: WorkflowEdge[],
  allNodes: WorkflowNode[],
  result: NodeExecutionResult,
): WorkflowNode[] {
  // Find all edges from this node
  const outgoingEdges = allEdges.filter((e) => e.source === currentNode.id);

  // For condition nodes, filter by the branch result
  if (
    currentNode.type === "condition" &&
    result.conditionResult !== undefined
  ) {
    const branchHandle = result.conditionResult ? "true" : "false";
    const filteredEdges = outgoingEdges.filter(
      (e) => e.sourceHandle === branchHandle || e.label === branchHandle,
    );
    return filteredEdges
      .map((e) => allNodes.find((n) => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }

  // For sentiment analysis nodes, filter by the sentiment result
  if (currentNode.subType === "sentiment-analysis") {
    // If sentiment analysis failed, don't follow any branches
    if (!result.success || result.sentimentResult === undefined) {
      return [];
    }
    const sentimentHandle = result.sentimentResult;
    const filteredEdges = outgoingEdges.filter(
      (e) => e.sourceHandle === sentimentHandle,
    );
    return filteredEdges
      .map((e) => allNodes.find((n) => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }

  // For regular nodes, follow all outgoing edges
  return outgoingEdges
    .map((e) => allNodes.find((n) => n.id === e.target))
    .filter((n): n is WorkflowNode => n !== undefined);
}

export async function getIntegrationToken(
  userId: string,
  provider: string,
): Promise<string | null> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, provider)),
    )
    .limit(1);

  if (!integration?.credentials) return null;

  const creds = integration.credentials as Record<string, unknown>;
  return (creds.accessToken as string) || null;
}
