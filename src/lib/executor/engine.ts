import { db } from "@/db";
import {
  workflows,
  workflowExecutions,
  workflowNodeExecutions,
  integrations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow/types";
import { InterpolationContext, createEmptyContext } from "./interpolate";

import { executeIfElse } from "./nodes/condition-if";
import { executeSwitch } from "./nodes/condition-switch";
import { executeLoop } from "./nodes/condition-loop";
import { executeSlack } from "./nodes/action-slack";
import { executeDiscord } from "./nodes/action-discord";
import { executeHttp } from "./nodes/action-http";
import { executeEmail } from "./nodes/action-email";
import { executeSetVariable } from "./nodes/transform-variable";
import { executeWait } from "./nodes/others-wait";
import { executeCode } from "./nodes/action-code";
import { executeFilter } from "./nodes/transform-filter";
import { executeFunction } from "./nodes/transform-function";
import { executeSplit } from "./nodes/transform-split";
import { executeAggregate } from "./nodes/transform-aggregate";

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerData: Record<string, unknown>;
  interpolation: InterpolationContext;
}

export interface NodeExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  // For condition nodes, which branch to take
  conditionResult?: boolean;
  // For switch nodes, which case branch to take
  switchResult?: string | null;
  // For loop nodes, the iterations to process
  loopIterations?: Array<{
    item: unknown;
    index: number;
    total: number;
    isFirst: boolean;
    isLast: boolean;
  }>;
}
export async function executeWorkflow(
  workflowId: string,
  executionId: string,
  triggerData: Record<string, unknown>,
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

    // Create execution context
    const context: ExecutionContext = {
      workflowId,
      executionId,
      userId,
      triggerData,
      interpolation: {
        ...createEmptyContext(),
        trigger: triggerData,
      },
    };

    // Find trigger node (starting point)
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      throw new Error("No trigger node found");
    }

    // Execute starting from trigger
    await executeNodeChain(triggerNode, nodes, edges, context);

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

async function executeNodeChain(
  node: WorkflowNode,
  allNodes: WorkflowNode[],
  allEdges: WorkflowEdge[],
  context: ExecutionContext,
): Promise<void> {
  // Execute the current node
  const result = await executeNode(node, context);

  // Store node output in interpolation context
  context.interpolation.nodes[node.id] = { output: result.output };

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
        await executeNodeChain(bodyNode, allNodes, allEdges, context);
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
      await executeNodeChain(doneNode, allNodes, allEdges, context);
    }

    return; // Don't use getNextNodes for loops
  }

  // Find next nodes to execute
  const nextNodes = getNextNodes(node, allEdges, allNodes, result);

  // Execute next nodes in sequence (could be parallel for some node types)
  for (const nextNode of nextNodes) {
    await executeNodeChain(nextNode, allNodes, allEdges, context);
  }
}

async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const nodeExecutionId = uuid();
  const startTime = Date.now();

  // Record node execution start
  await db.insert(workflowNodeExecutions).values({
    id: nodeExecutionId,
    executionId: context.executionId,
    nodeId: node.id,
    status: "running",
    input: { config: node.data.config, context: context.interpolation },
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
        result = await executeCode(node, context);
        break;

      // Transforms
      case "set-variable":
        result = await executeSetVariable(node, context);
        break;

      case "function":
        result = await executeFunction(node, context);
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

    // Update node execution record
    await db
      .update(workflowNodeExecutions)
      .set({
        status: result.success ? "completed" : "failed",
        output: result.output,
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

  // For regular nodes, follow all outgoing edges
  return outgoingEdges
    .map((e) => allNodes.find((n) => n.id === e.target))
    .filter((n): n is WorkflowNode => n !== undefined);
}

export async function getIntegrationToken(
  userId: string,
  provider: string,
): Promise<string | null> {
  const integration = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId))
    .limit(1);

  const match = integration.find((i) => i.provider === provider);
  if (!match?.credentials) return null;

  const creds = match.credentials as Record<string, unknown>;
  return (creds.accessToken as string) || null;
}
