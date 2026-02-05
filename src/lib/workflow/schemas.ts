import { z } from "zod";

// =============================================================================
// Node Schema
// =============================================================================

export const NodePositionSchema = z.object({
  x: z.number().describe("X coordinate position on canvas"),
  y: z.number().describe("Y coordinate position on canvas"),
});

export const NodeConfigSchema = z
  .record(z.string(), z.unknown())
  .describe("Node-specific configuration options");

export const WorkflowNodeSchema = z
  .object({
    id: z.string().describe("Unique identifier for the node"),
    type: z
      .enum(["trigger", "action", "condition", "transform"])
      .describe("Category of the node"),
    subType: z
      .string()
      .describe(
        'Specific node type like "webhook", "http-request", "if-else", "set-variable"',
      ),
    position: NodePositionSchema.describe("Position on the canvas"),
    data: z.object({
      label: z.string().describe("Display name for the node"),
      description: z.string().optional().describe("Brief description"),
      config: NodeConfigSchema.describe("Node configuration"),
    }),
  })
  .describe("A workflow node representing a step in the automation");

// =============================================================================
// Edge Schema
// =============================================================================

export const WorkflowEdgeSchema = z
  .object({
    id: z.string().describe("Unique identifier for the edge"),
    source: z.string().describe("ID of the source node"),
    target: z.string().describe("ID of the target node"),
    sourceHandle: z
      .string()
      .optional()
      .describe(
        'Handle ID on source node (e.g., "true" or "false" for conditions)',
      ),
    targetHandle: z.string().optional().describe("Handle ID on target node"),
  })
  .describe("A connection between two nodes");

// =============================================================================
// Workflow Schema (for AI generation)
// =============================================================================

export const GeneratedWorkflowSchema = z
  .object({
    name: z
      .string()
      .describe(
        'A concise name for the workflow, e.g., "Email to Slack Notifier"',
      ),
    description: z
      .string()
      .optional()
      .describe("Brief description of what the workflow does"),
    nodes: z
      .array(WorkflowNodeSchema)
      .describe(
        "Array of workflow nodes. Start with a trigger, then actions/conditions/transforms",
      ),
    edges: z
      .array(WorkflowEdgeSchema)
      .describe("Array of connections between nodes"),
  })
  .describe(
    "Complete workflow definition. Always include at least one trigger node as the starting point.",
  );

// =============================================================================
// Node Addition Schema
// =============================================================================

export const AddNodeSchema = z
  .object({
    node: WorkflowNodeSchema.describe("The node to add"),
    connectFrom: z
      .string()
      .optional()
      .describe(
        "ID of an existing node to connect FROM (this node becomes the target)",
      ),
    connectFromHandle: z
      .string()
      .optional()
      .describe('Source handle to use (e.g., "true" or "false")'),
  })
  .describe(
    "Add a new node to the workflow, optionally connecting it to an existing node",
  );

// =============================================================================
// Workflow Modification Schema
// =============================================================================

export const ModifyNodeSchema = z
  .object({
    nodeId: z.string().describe("ID of the node to modify"),
    updates: z
      .object({
        label: z.string().optional().describe("New label for the node"),
        description: z.string().optional().describe("New description"),
        config: NodeConfigSchema.optional().describe("Updated configuration"),
      })
      .describe("Fields to update on the node"),
  })
  .describe("Modify an existing node");

export const WorkflowModificationSchema = z
  .object({
    addNodes: z.array(AddNodeSchema).optional().describe("Nodes to add"),
    removeNodeIds: z
      .array(z.string())
      .optional()
      .describe("IDs of nodes to remove"),
    modifyNodes: z
      .array(ModifyNodeSchema)
      .optional()
      .describe("Nodes to modify"),
    addEdges: z.array(WorkflowEdgeSchema).optional().describe("Edges to add"),
    removeEdgeIds: z
      .array(z.string())
      .optional()
      .describe("IDs of edges to remove"),
  })
  .describe("Batch modifications to apply to the workflow");

// =============================================================================
// Type Exports
// =============================================================================

export type GeneratedWorkflow = z.infer<typeof GeneratedWorkflowSchema>;
export type AddNode = z.infer<typeof AddNodeSchema>;
export type ModifyNode = z.infer<typeof ModifyNodeSchema>;
export type WorkflowModification = z.infer<typeof WorkflowModificationSchema>;
