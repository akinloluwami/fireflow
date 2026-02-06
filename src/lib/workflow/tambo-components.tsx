import type { TamboComponent } from "@tambo-ai/react";
import { useWorkflowStore } from "./store";
import { v4 as uuid } from "uuid";
import { useEffect, useRef } from "react";
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
  description: `Complete workflow definition with nodes and connections.
  
CRITICAL: You MUST populate the config object for each node with actual values!
Do not leave config empty except for trigger nodes.`,
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
          id: {
            type: "string",
            description: "Unique identifier like 'node-1', 'node-2'",
          },
          type: {
            type: "string",
            enum: ["trigger", "action", "condition", "transform", "others"],
            description: "Category of the node",
          },
          subType: {
            type: "string",
            enum: [
              "webhook",
              "schedule",
              "manual",
              "form-submission",
              "http-request",
              "send-email",
              "send-slack",
              "send-discord",
              "database-query",
              "code",
              "if-else",
              "switch",
              "loop",
              "set-variable",
              "function",
              "filter",
              "wait",
            ],
            description: "Specific node type",
          },
          position: {
            type: "object",
            required: ["x", "y"],
            properties: {
              x: { type: "number" },
              y: { type: "number" },
            },
          },
          data: {
            type: "object",
            required: ["label", "config"],
            properties: {
              label: { type: "string" },
              description: { type: "string" },
              config: {
                type: "object",
                description:
                  "Node configuration - MUST be populated with values!",
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    edges: {
      type: "array",
      description:
        "Connections between nodes. For conditions, use sourceHandle 'true' or 'false'",
      items: {
        type: "object",
        required: ["id", "source", "target"],
        properties: {
          id: { type: "string" },
          source: { type: "string", description: "Source node ID" },
          target: { type: "string", description: "Target node ID" },
          sourceHandle: {
            type: "string",
            description:
              "For if-else: 'true' or 'false'. For loop: 'body' or 'done'",
          },
          targetHandle: { type: "string" },
        },
      },
    },
  },
};

// =============================================================================
// Config Inference from Labels/Descriptions
// =============================================================================

/**
 * Infer config values from node label and description when AI doesn't populate them.
 * This parses patterns like "Amount > 100?" or "#alerts" from the generated text.
 */
function inferConfigFromContext(
  subType: string,
  label: string,
  description: string,
  existingConfig: Record<string, unknown>,
): Record<string, unknown> {
  const text = `${label} ${description}`.toLowerCase();
  const config: Record<string, unknown> = { ...existingConfig };

  switch (subType) {
    case "if-else": {
      // Skip if already populated
      if (config.field && config.field !== "") break;

      // Parse patterns like "Amount > 100", "price >= 50", "status = active"
      const comparisonMatch = label.match(
        /(\w+)\s*(>|<|>=|<=|=|!=|equals?|greater|less|contains)\s*(\d+|\w+)/i,
      );

      if (comparisonMatch) {
        const [, fieldName, op, value] = comparisonMatch;
        config.field = `{{ trigger.${fieldName.toLowerCase()} }}`;
        config.value = value;

        // Map operator
        const opLower = op.toLowerCase();
        if (opLower === ">" || opLower === "greater")
          config.operator = "greater";
        else if (opLower === "<" || opLower === "less")
          config.operator = "less";
        else if (opLower === ">=" || opLower === "greater or equal")
          config.operator = "greater-or-equal";
        else if (opLower === "<=" || opLower === "less or equal")
          config.operator = "less-or-equal";
        else if (opLower === "=" || opLower === "equals" || opLower === "equal")
          config.operator = "equals";
        else if (opLower === "!=" || opLower === "not equals")
          config.operator = "not-equals";
        else if (opLower === "contains") config.operator = "contains";
      }
      break;
    }

    case "send-slack": {
      // Extract channel from text like "#alerts" or "#general"
      const channelMatch = text.match(/#([\w-]+)/);
      if (channelMatch && (!config.channel || config.channel === "")) {
        config.channel = `#${channelMatch[1]}`;
      }

      // Generate a default message referencing trigger data
      if (!config.message || config.message === "") {
        config.message =
          description || `New alert from workflow: {{ trigger }}`;
      }
      break;
    }

    case "send-discord": {
      // Generate a default message
      if (!config.message || config.message === "") {
        config.message = description || `Notification: {{ trigger }}`;
      }
      break;
    }

    case "send-email": {
      // Extract email patterns
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && (!config.to || config.to === "")) {
        config.to = emailMatch[0];
      }

      if (!config.subject || config.subject === "") {
        config.subject = label || "Workflow Notification";
      }
      break;
    }

    case "wait": {
      // Parse duration like "wait 5 seconds" or "5 minutes"
      const durationMatch = text.match(/(\d+)\s*(second|minute|hour|day)/i);
      if (durationMatch) {
        config.duration = parseInt(durationMatch[1], 10);
        config.unit = durationMatch[2].toLowerCase() + "s";
      }
      break;
    }

    case "loop": {
      // Default to trigger.items if not specified
      if (!config.items || config.items === "") {
        config.items = "{{ trigger.items }}";
      }
      break;
    }
  }

  return config;
}

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
  const lastAppliedCount = useRef(0);

  useEffect(() => {
    // Wait until we have valid nodes array
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return;

    // Ensure edges is a valid array (can be empty)
    const safeEdges = Array.isArray(edges) ? edges : [];

    // Only re-apply if node count increased (streaming more nodes in)
    // This ensures we always have the latest complete state
    const totalCount = nodes.length + safeEdges.length;
    if (totalCount <= lastAppliedCount.current) return;
    lastAppliedCount.current = totalCount;

    console.log(
      "🔧 WorkflowGenerator - Raw AI Data:",
      JSON.stringify({ nodes, edges: safeEdges }, null, 2),
    );

    // Convert to workflow format with proper defaults
    const workflowNodes: WorkflowNode[] = nodes.map((node) => {
      const definition = getNodeDefinition(
        node.type,
        node.subType as NodeSubType,
      );

      // Merge AI-generated config with defaults
      const aiConfig = node.data?.config || {};
      const defaultConfig = definition?.defaultConfig || {};

      // Infer config values from label/description if AI didn't provide them
      const inferredConfig = inferConfigFromContext(
        node.subType,
        node.data?.label || "",
        node.data?.description || "",
        aiConfig,
      );

      const mergedConfig = { ...defaultConfig, ...inferredConfig };

      console.log(`Node ${node.subType} config:`, {
        aiConfig,
        inferredConfig,
        mergedConfig,
      });

      return {
        id: node.id || uuid(),
        type: node.type as NodeCategory,
        subType: node.subType as NodeSubType,
        position: node.position || { x: 100, y: 100 },
        data: {
          label: node.data?.label || definition?.label || node.subType,
          description: node.data?.description || definition?.description,
          config: mergedConfig,
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
    Generates a complete workflow on the canvas. Use when user describes what they want to automate.
    
    RULES:
    1. Start with a trigger node (webhook, form-submission, schedule, manual)
    2. Position nodes left-to-right: x=100, x=400, x=700, etc.
    3. For branches, offset y by 150px
    4. ALWAYS populate config with actual values - never leave it empty except triggers!
    5. Connect edges using correct sourceHandle for conditions
    
    CONFIG TEMPLATES (copy and fill in):
    
    if-else: { "field": "{{ trigger.FIELDNAME }}", "operator": "greater", "value": "100" }
    Operators: equals, not-equals, contains, greater, less, greater-or-equal, less-or-equal
    
    send-slack: { "channel": "#channel-name", "message": "Your message with {{ trigger.field }}" }
    send-email: { "to": "{{ trigger.email }}", "subject": "Subject", "body": "Body text" }
    wait: { "duration": 5, "unit": "seconds" }
    loop: { "items": "{{ trigger.items }}", "itemVariable": "item" }
    
    FULL EXAMPLE for "when form submitted, if amount > 100, send slack":
    {
      "name": "High Value Form Alert",
      "description": "Notify team when high-value form is submitted",
      "nodes": [
        {
          "id": "node-1",
          "type": "trigger",
          "subType": "form-submission",
          "position": { "x": 100, "y": 200 },
          "data": { "label": "Form Submitted", "config": {} }
        },
        {
          "id": "node-2",
          "type": "condition",
          "subType": "if-else",
          "position": { "x": 400, "y": 200 },
          "data": {
            "label": "Amount > 100?",
            "config": { "field": "{{ trigger.amount }}", "operator": "greater", "value": "100" }
          }
        },
        {
          "id": "node-3",
          "type": "action",
          "subType": "send-slack",
          "position": { "x": 700, "y": 150 },
          "data": {
            "label": "Notify Team",
            "config": { "channel": "#alerts", "message": "High value: {{ trigger.amount }}" }
          }
        }
      ],
      "edges": [
        { "id": "edge-1", "source": "node-1", "target": "node-2" },
        { "id": "edge-2", "source": "node-2", "target": "node-3", "sourceHandle": "true" }
      ]
    }
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
