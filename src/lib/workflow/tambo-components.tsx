import type { TamboComponent } from "@tambo-ai/react";
import { useTamboCurrentMessage } from "@tambo-ai/react";
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
import { enrichConfigWithRealData, getCachedContext } from "./use-prefetched-context";
import type { JSONSchema7 } from "json-schema";

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
            enum: [
              "trigger",
              "action",
              "condition",
              "transform",
              "ai",
              "sub",
              "others",
            ],
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
              "sentiment-analysis",
              "summarization",
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
      const ctx = getCachedContext();
      // Generate a default message
      if (!config.message || config.message === "") {
        config.message = description || `Notification: {{ trigger }}`;
      }
      if (!config.guildId || config.guildId === "") {
        // Use the first connected Discord guild, or placeholder
        if (ctx?.discord.connected && ctx.discord.guilds.length > 0) {
          config.guildId = ctx.discord.guilds[0].id;
        } else {
          config.guildId = "your-server-id";
        }
      }
      if (!config.channelId || config.channelId === "") {
        // Use the first text channel from the guild, or placeholder
        const guildId = config.guildId as string;
        if (ctx?.discord.channels[guildId]?.length) {
          config.channelId = ctx.discord.channels[guildId][0].id;
        } else {
          config.channelId = "your-channel-id";
        }
      }
      break;
    }

    case "database-query": {
      const ctx = getCachedContext();
      if (!config.query || config.query === "") {
        // Try to infer a SQL query from the label/description
        config.query = inferSqlQuery(label, description);
      }
      if (!config.databaseType) {
        config.databaseType = "postgresql";
      }
      // Prefer credentialId over connectionString
      if (ctx?.dbCredentials.length) {
        if (!config.credentialId || config.credentialId === "") {
          config.credentialId = ctx.dbCredentials[0].id;
        }
        // Clear placeholder connectionStrings when using credential
        if (config.connectionString === "{{ env.DATABASE_URL }}" || config.connectionString === "") {
          config.connectionString = "";
        }
      } else {
        if (!config.connectionString || config.connectionString === "") {
          config.connectionString = "{{ env.DATABASE_URL }}";
        }
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

    case "sentiment-analysis": {
      // Default text to trigger.message or trigger.text
      if (!config.text || config.text === "") {
        config.text = "{{ trigger.message }}";
      }
      if (!config.language) {
        config.language = "auto";
      }
      break;
    }

    case "model-picker": {
      const ctx = getCachedContext();
      // Default provider and model
      if (!config.provider) {
        config.provider = "openai";
      }
      if (!config.model) {
        config.model = "gpt-4o-mini";
      }
      if (!config.credentialId || config.credentialId === "") {
        // Use first AI credential from cache
        if (ctx?.aiCredentials.length) {
          const preferred = ctx.aiCredentials.find(
            (c) => c.type === (config.provider as string),
          );
          config.credentialId = preferred?.id || ctx.aiCredentials[0].id;
        } else {
          config.credentialId = "your-credential-id";
        }
      }
      break;
    }

    case "summarization": {
      if (!config.text || config.text === "") {
        config.text = "{{ trigger.text }}";
      }
      if (!config.style) {
        config.style = "concise";
      }
      break;
    }
  }

  return config;
}

/**
 * Infer a SQL query from the node label and description.
 * Parses patterns like "insert into waitlist", "save name and email to orders table", etc.
 */
function inferSqlQuery(label: string, description: string): string {
  const text = `${label} ${description}`.toLowerCase();

  // Common data fields mentioned in the text → used as columns
  const commonFields = [
    "name", "email", "phone", "phone_number", "address", "message",
    "company", "title", "amount", "status", "feedback", "comment",
    "username", "password", "url", "description", "notes", "subject",
  ];

  // Extract fields that appear in the text
  const mentionedFields = commonFields.filter((f) =>
    text.includes(f.replace("_", " ")) || text.includes(f),
  );

  // Default to name + email if nothing specific is found
  const fields = mentionedFields.length > 0 ? mentionedFields : ["name", "email"];

  // Try to extract the table name
  // Patterns: "to the waitlist table", "into waitlist", "insert waitlist row", "save to orders"
  let tableName = "data";

  const tablePatterns = [
    /(?:into|to|in)\s+(?:the\s+)?(\w+?)(?:\s+table|\s+row|\s+entry|\s+record)?(?:\s|$|,)/i,
    /(?:insert|save|write|add|store|log)\s+(?:to\s+|into\s+)?(?:the\s+)?(\w+?)(?:\s+table|\s+row|\s+entry|\s+record)?(?:\s|$|,)/i,
    /(\w+)\s+(?:table|row|entry|record|submission|signup)/i,
  ];

  for (const pattern of tablePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const candidate = match[1];
      // Skip common verbs/prepositions that aren't table names
      const skipWords = [
        "the", "a", "an", "to", "into", "from", "and", "or", "with",
        "new", "insert", "save", "write", "add", "store", "log",
        "select", "update", "delete", "query", "run", "execute",
        "name", "email", "data",
      ];
      if (!skipWords.includes(candidate)) {
        tableName = candidate;
        break;
      }
    }
  }

  // Determine query type from text
  const isInsert = /insert|save|write|add|store|log|submit|create|record/.test(text);
  const isSelect = /select|find|lookup|look up|search|get|fetch|read|query/.test(text);
  const isUpdate = /update|modify|change|set|edit/.test(text);
  const isDelete = /delete|remove|drop|clear/.test(text);

  if (isInsert && !isSelect && !isUpdate && !isDelete) {
    const columns = fields.join(", ");
    const values = fields.map((f) => `'{{ trigger.${f} }}'`).join(", ");
    return `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
  }

  if (isSelect) {
    if (fields.includes("email")) {
      return `SELECT * FROM ${tableName} WHERE email = '{{ trigger.email }}'`;
    }
    return `SELECT * FROM ${tableName}`;
  }

  if (isUpdate) {
    const setClauses = fields
      .filter((f) => f !== "email")
      .map((f) => `${f} = '{{ trigger.${f} }}'`)
      .join(", ");
    return `UPDATE ${tableName} SET ${setClauses || "status = 'active'"} WHERE email = '{{ trigger.email }}'`;
  }

  if (isDelete) {
    return `DELETE FROM ${tableName} WHERE email = '{{ trigger.email }}'`;
  }

  // Default to INSERT
  const columns = fields.join(", ");
  const values = fields.map((f) => `'{{ trigger.${f} }}'`).join(", ");
  return `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
}

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

// Module-level caches – survive component remounts so we never
// re-apply the same workflow data after streaming has settled.
const _appliedDataPerMessage = new Map<string, string>();

function WorkflowGenerator({
  name,
  description,
  nodes,
  edges,
}: WorkflowGeneratorProps) {
  // Use selectors so this component does NOT re-render on unrelated store changes
  // (e.g. validateNodes, updateNodeStatus, etc.)
  const updateWorkflowMeta = useWorkflowStore((s) => s.updateWorkflowMeta);
  const applyWorkflowChanges = useWorkflowStore((s) => s.applyWorkflowChanges);
  const message = useTamboCurrentMessage();

  useEffect(() => {
    // Skip if this is a historical message (older than 10 seconds)
    if (message?.createdAt) {
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      if (messageAge > 10000) {
        return;
      }
    }

    // Wait until we have valid nodes array
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return;

    // Ensure edges is a valid array (can be empty)
    const safeEdges = Array.isArray(edges) ? edges : [];

    // Module-level dedup keyed by message ID – survives remounts so toggling
    // the chat panel or Tambo re-creating the rendered component won't
    // cause a second application of the same data.
    const messageId = message?.id || "__streaming__";
    const dataString = JSON.stringify({ nodes, edges: safeEdges });
    if (_appliedDataPerMessage.get(messageId) === dataString) return;
    _appliedDataPerMessage.set(messageId, dataString);

    // Guard against multiple AI messages generating the same workflow:
    // If the store already has nodes with the same IDs, skip re-applying.
    const currentStore = useWorkflowStore.getState();
    const existingNodeIds = new Set(currentStore.workflow.nodes.map((n) => n.id));
    const incomingNodeIds = nodes.map((n) => n.id).filter(Boolean);
    if (
      incomingNodeIds.length > 0 &&
      incomingNodeIds.every((id) => existingNodeIds.has(id)) &&
      existingNodeIds.size === incomingNodeIds.length
    ) {
      return;
    }

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

      // Enrich with real data from prefetched integrations/credentials
      // This replaces any remaining placeholders with actual IDs
      const finalConfig = enrichConfigWithRealData(node.subType, mergedConfig);

      console.log(`Node ${node.subType} config:`, {
        aiConfig,
        inferredConfig,
        mergedConfig,
        finalConfig,
      });

      return {
        id: node.id || uuid(),
        type: node.type as NodeCategory,
        subType: node.subType as NodeSubType,
        position: node.position || { x: 100, y: 100 },
        data: {
          label: node.data?.label || definition?.label || node.subType,
          description: node.data?.description || definition?.description,
          config: finalConfig,
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

  return (
    <div className="p-3 bg-accent-light rounded-lg border border-orange-100">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
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

export const workflowGeneratorComponent: TamboComponent = {
  name: "WorkflowGenerator",
  description: `
    Generates a complete workflow on the canvas. Use when user describes what they want to automate.
    
    CRITICAL RULES:
    1. NEVER ask the user for details - ALWAYS infer everything from their description!
       - If user says "write name and email to waitlist table" → table is "waitlist", columns are "name" and "email"
       - If user says "notify team on Discord in #submissions" → find the #submissions channel from context
       - If user says "send email to the user" → use {{ trigger.email }} as the recipient
       - ALWAYS make reasonable assumptions. The user expects the workflow to be complete and ready.
    2. Start with a trigger node (webhook, form-submission, schedule, manual)
    3. Position nodes left-to-right: x=100, x=400, x=700, etc. For branches, offset y by 150px.
    4. ALWAYS populate EVERY config field with actual values — never leave config empty (except triggers)!
    5. Connect edges using correct sourceHandle for conditions.
    6. Use the "availableIntegrations" context to get REAL credential IDs, Discord server/channel IDs, and Slack channels.
    
    INFERRING TRIGGER FIELDS:
    Tally form submissions send data as {{ trigger.FIELDNAME }}. Infer field names from the user's description:
    - "name and email" → {{ trigger.name }}, {{ trigger.email }}
    - "name, email, and phone number" → {{ trigger.name }}, {{ trigger.email }}, {{ trigger.phone }}
    - "feedback message" → {{ trigger.message }} or {{ trigger.feedback }}
    - "order amount" → {{ trigger.amount }}
    Use lowercase snake_case for multi-word fields: "phone number" → {{ trigger.phone_number }}
    
    DATABASE QUERIES — ALWAYS write the full SQL:
    When user mentions writing/inserting/saving to a database table, ALWAYS generate the complete SQL query.
    
    INSERT: "write name and email to waitlist table"
    → query: "INSERT INTO waitlist (name, email) VALUES ('{{ trigger.name }}', '{{ trigger.email }}')"
    
    INSERT with timestamp: "save submission to orders table"
    → query: "INSERT INTO orders (name, email, created_at) VALUES ('{{ trigger.name }}', '{{ trigger.email }}', NOW())"
    
    SELECT: "look up user by email"
    → query: "SELECT * FROM users WHERE email = '{{ trigger.email }}'"
    
    UPDATE: "update user status to active"
    → query: "UPDATE users SET status = 'active' WHERE email = '{{ trigger.email }}'"
    
    DISCORD MESSAGES — Write the full message:
    Always include relevant trigger data in the Discord message. Example:
    "notify team about new waitlist submission"
    → message: "📋 New waitlist submission!\\nName: {{ trigger.name }}\\nEmail: {{ trigger.email }}"
    
    SLACK MESSAGES — Same approach:
    → message: "New signup: {{ trigger.name }} ({{ trigger.email }})"
    
    CONFIG TEMPLATES (populate ALL fields):
    
    if-else: { "field": "{{ trigger.FIELDNAME }}", "operator": "greater", "value": "100" }
    send-slack: { "channel": "#channel-name", "message": "Full message with {{ trigger.field }}" }
    send-discord: { "guildId": "real-id", "channelId": "real-id", "message": "Full message with {{ trigger.field }}" }
    send-email: { "to": "{{ trigger.email }}", "subject": "Subject", "body": "Full body with {{ trigger.data }}" }
    database-query: { "databaseType": "postgresql", "credentialId": "real-id", "query": "INSERT INTO table (col) VALUES ('{{ trigger.field }}')" }
    wait: { "duration": 5, "unit": "seconds" }
    loop: { "items": "{{ trigger.items }}" }
    
    AI NODES (sentiment-analysis, summarization):
    You MUST create a 'model-picker' node connected to the AI node with targetHandle="model".
    - sentiment-analysis: { "text": "{{ trigger.message }}", "language": "auto", "includeEmotions": false }
    - summarization: { "text": "{{ trigger.text }}", "style": "concise", "language": "auto" }
    - model-picker: { "provider": "openai", "model": "gpt-4o", "credentialId": "real-id" }
    Edge: { "id": "edge-model", "source": "node-model-picker", "target": "node-ai", "targetHandle": "model" }
    
    FULL EXAMPLE — "when waitlist form submitted, save name and email to waitlist table, then notify team on Discord in #submissions":
    {
      "name": "Waitlist Submission → DB + Discord",
      "description": "Save waitlist form submissions to database and notify team on Discord",
      "nodes": [
        {
          "id": "node-1",
          "type": "trigger",
          "subType": "form-submission",
          "position": { "x": 100, "y": 200 },
          "data": { "label": "Waitlist Form", "config": {} }
        },
        {
          "id": "node-2",
          "type": "action",
          "subType": "database-query",
          "position": { "x": 400, "y": 200 },
          "data": {
            "label": "Insert waitlist row",
            "description": "Save name and email to waitlist table",
            "config": {
              "databaseType": "postgresql",
              "credentialId": "use-real-credential-id-from-context",
              "query": "INSERT INTO waitlist (name, email) VALUES ('{{ trigger.name }}', '{{ trigger.email }}')"
            }
          }
        },
        {
          "id": "node-3",
          "type": "action",
          "subType": "send-discord",
          "position": { "x": 700, "y": 200 },
          "data": {
            "label": "Notify #submissions",
            "description": "Notify team about new waitlist signup",
            "config": {
              "guildId": "use-real-guild-id-from-context",
              "channelId": "use-real-channel-id-from-context",
              "message": "📋 New waitlist submission!\\nName: {{ trigger.name }}\\nEmail: {{ trigger.email }}"
            }
          }
        }
      ],
      "edges": [
        { "id": "edge-1", "source": "node-1", "target": "node-2" },
        { "id": "edge-2", "source": "node-2", "target": "node-3" }
      ]
    }
  `,
  component: WorkflowGenerator,
  propsSchema: GeneratedWorkflowJSONSchema,
};

export const workflowComponents: TamboComponent[] = [
  workflowGeneratorComponent,
];
