import type { TamboComponent } from "@tambo-ai/react";
import { useWorkflowStore } from "./store";
import { v4 as uuid } from "uuid";
import { useEffect } from "react";
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeCategory,
  NodeSubType,
} from "./types";
import { getNodeDefinition } from "./node-definitions";
import type { JSONSchema7 } from "json-schema";

// JSON Schema definition for Tambo (avoiding Zod v4 compatibility issues)
const GeneratedWorkflowJSONSchema: JSONSchema7 = {
  type: "object",
  description:
    "Complete workflow definition. Always include at least one trigger node as the starting point.",
  required: ["name", "nodes", "edges"],
  properties: {
    name: {
      type: "string",
      description:
        'A concise name for the workflow, e.g., "Email to Slack Notifier"',
    },
    description: {
      type: "string",
      description: "Brief description of what the workflow does",
    },
    nodes: {
      type: "array",
      description:
        "Array of workflow nodes. Start with a trigger, then actions/conditions/transforms",
      items: {
        type: "object",
        required: ["id", "type", "subType", "position", "data"],
        properties: {
          id: { type: "string", description: "Unique identifier for the node" },
          type: {
            type: "string",
            enum: ["trigger", "action", "condition", "transform"],
            description: "Category of the node",
          },
          subType: {
            type: "string",
            description:
              'Specific node type like "webhook", "http-request", "if-else", "set-variable"',
          },
          position: {
            type: "object",
            required: ["x", "y"],
            properties: {
              x: {
                type: "number",
                description: "X coordinate position on canvas",
              },
              y: {
                type: "number",
                description: "Y coordinate position on canvas",
              },
            },
          },
          data: {
            type: "object",
            required: ["label"],
            properties: {
              label: {
                type: "string",
                description: "Display name for the node",
              },
              description: { type: "string", description: "Brief description" },
              config: {
                type: "object",
                description: "Node-specific configuration options",
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    edges: {
      type: "array",
      description: "Array of connections between nodes",
      items: {
        type: "object",
        required: ["id", "source", "target"],
        properties: {
          id: { type: "string", description: "Unique identifier for the edge" },
          source: { type: "string", description: "ID of the source node" },
          target: { type: "string", description: "ID of the target node" },
          sourceHandle: {
            type: "string",
            description:
              'Handle ID on source node (e.g., "true" or "false" for conditions)',
          },
          targetHandle: {
            type: "string",
            description: "Handle ID on target node",
          },
        },
      },
    },
  },
};

// =============================================================================
// WorkflowGenerator Component
// =============================================================================

interface WorkflowGeneratorProps {
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: "trigger" | "action" | "condition" | "transform" | "others";
    subType: string;
    position: { x: number; y: number };
    data: {
      label: string;
      description?: string;
      config: Record<string, unknown>;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

function WorkflowGenerator({
  name,
  description,
  nodes,
  edges,
}: WorkflowGeneratorProps) {
  const { updateWorkflowMeta, applyWorkflowChanges } = useWorkflowStore();

  useEffect(() => {
    // Wait until we have valid nodes array
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return;

    // Ensure edges is a valid array (can be empty)
    const safeEdges = Array.isArray(edges) ? edges : [];

    // Convert to workflow format with proper defaults
    const workflowNodes: WorkflowNode[] = nodes.map((node) => {
      const definition = getNodeDefinition(
        node.type,
        node.subType as NodeSubType,
      );
      return {
        id: node.id || uuid(),
        type: node.type as NodeCategory,
        subType: node.subType as NodeSubType,
        position: node.position || { x: 100, y: 100 },
        data: {
          label: node.data?.label || definition?.label || node.subType,
          description: node.data?.description || definition?.description,
          config: { ...definition?.defaultConfig, ...node.data?.config },
          icon: definition?.icon,
        },
      };
    });

    const workflowEdges: WorkflowEdge[] = safeEdges.map((edge) => ({
      id: edge.id || uuid(),
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      animated: true,
    }));

    // Apply to store
    updateWorkflowMeta(name, description);
    applyWorkflowChanges(workflowNodes, workflowEdges);
  }, [
    name,
    description,
    nodes,
    edges,
    updateWorkflowMeta,
    applyWorkflowChanges,
  ]);

  // This component renders a confirmation message
  return (
    <div className="p-3 bg-accent-light rounded-lg border border-orange-100">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-800 truncate">{name}</h4>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
              {nodes?.length || 0} nodes
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              {edges?.length || 0} edges
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tambo Component Registration
// =============================================================================

export const workflowGeneratorComponent: TamboComponent = {
  name: "WorkflowGenerator",
  description: `
    Generates and applies a complete workflow with nodes and connections to the canvas.
    Use this when the user describes a workflow they want to create.
    
    IMPORTANT GUIDELINES:
    - Always start with a trigger node (type: "trigger")
    - Position nodes with x increasing left-to-right (add ~250px between nodes)
    - Position nodes with y offset for branches (add ~150px for branching paths)
    - Connect nodes with edges from source to target
    - For condition nodes, use sourceHandle "true" or "false" to specify the branch
    
    AVAILABLE NODE TYPES:
    - Triggers: webhook, schedule, manual, form-submission
    - Actions: http-request, send-email, send-slack, database-query, code
    - Conditions: if-else, switch, loop, merge, wait
    - Transforms: set-variable, function, filter, split, aggregate
    
    EXAMPLE: "When I receive a webhook, send a Slack message"
    - Node 1: trigger/webhook at (100, 200)
    - Node 2: action/send-slack at (400, 200)
    - Edge: from node1 to node2
  `,
  component: WorkflowGenerator,
  propsSchema: GeneratedWorkflowJSONSchema,
};

// =============================================================================
// Export Components List
// =============================================================================

export const workflowComponents: TamboComponent[] = [
  workflowGeneratorComponent,
];
