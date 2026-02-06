/**
 * Node Output Schemas
 *
 * Defines the data shape that each node type produces as output.
 * Used by the Variable Picker to show available data from upstream nodes.
 */

export interface NodeOutputSchema {
  type: "object" | "array" | "string" | "number" | "boolean" | "unknown";
  properties?: Record<string, NodeOutputSchema>;
  items?: NodeOutputSchema;
  description?: string;
  example?: unknown;
}

/**
 * Output schemas for all node subtypes
 */
export const nodeOutputSchemas: Record<string, NodeOutputSchema> = {
  // ===========================================================================
  // TRIGGER NODES
  // ===========================================================================

  webhook: {
    type: "object",
    description: "Incoming webhook request data",
    properties: {
      body: {
        type: "object",
        description: "Request body (JSON payload)",
        example: { email: "user@example.com", name: "John Doe" },
      },
      headers: {
        type: "object",
        description: "HTTP request headers",
        example: { "content-type": "application/json" },
      },
      query: {
        type: "object",
        description: "URL query parameters",
        example: { ref: "abc123" },
      },
      method: {
        type: "string",
        description: "HTTP method used",
        example: "POST",
      },
      path: {
        type: "string",
        description: "Request path",
        example: "/webhook/abc123",
      },
    },
  },

  schedule: {
    type: "object",
    description: "Scheduled trigger context",
    properties: {
      scheduledAt: {
        type: "string",
        description: "When the trigger was scheduled to run",
        example: "2026-02-06T09:00:00Z",
      },
      triggeredAt: {
        type: "string",
        description: "When the trigger actually fired",
        example: "2026-02-06T09:00:01Z",
      },
      cron: {
        type: "string",
        description: "The cron expression",
        example: "0 9 * * *",
      },
    },
  },

  manual: {
    type: "object",
    description: "Manual trigger context",
    properties: {
      triggeredAt: {
        type: "string",
        description: "When manually triggered",
        example: "2026-02-06T14:30:00Z",
      },
      triggeredBy: {
        type: "string",
        description: "User who triggered",
        example: "user@example.com",
      },
    },
  },

  "email-received": {
    type: "object",
    description: "Incoming email data",
    properties: {
      from: {
        type: "string",
        description: "Sender email address",
        example: "sender@example.com",
      },
      to: {
        type: "string",
        description: "Recipient email address",
        example: "inbox@yourapp.com",
      },
      subject: {
        type: "string",
        description: "Email subject line",
        example: "Hello World",
      },
      body: {
        type: "string",
        description: "Email body (plain text)",
        example: "This is the email content...",
      },
      html: {
        type: "string",
        description: "Email body (HTML)",
        example: "<p>This is the email content...</p>",
      },
      receivedAt: {
        type: "string",
        description: "When email was received",
        example: "2026-02-06T14:30:00Z",
      },
      attachments: {
        type: "array",
        description: "Email attachments",
        items: {
          type: "object",
          properties: {
            filename: { type: "string", example: "document.pdf" },
            contentType: { type: "string", example: "application/pdf" },
            size: { type: "number", example: 1024 },
          },
        },
      },
    },
  },

  "form-submission": {
    type: "object",
    description: "Form submission data",
    properties: {
      formId: {
        type: "string",
        description: "Form identifier",
        example: "contact-form",
      },
      submissionId: {
        type: "string",
        description: "Unique submission ID",
        example: "sub_abc123",
      },
      fields: {
        type: "object",
        description: "Form field values",
        example: { name: "John", email: "john@example.com", message: "Hello" },
      },
      submittedAt: {
        type: "string",
        description: "When form was submitted",
        example: "2026-02-06T14:30:00Z",
      },
      metadata: {
        type: "object",
        description: "Submission metadata",
        properties: {
          ip: { type: "string", example: "192.168.1.1" },
          userAgent: { type: "string", example: "Mozilla/5.0..." },
          referer: { type: "string", example: "https://yoursite.com/contact" },
        },
      },
    },
  },

  // ===========================================================================
  // ACTION NODES
  // ===========================================================================

  "http-request": {
    type: "object",
    description: "HTTP response data",
    properties: {
      status: {
        type: "number",
        description: "HTTP status code",
        example: 200,
      },
      statusText: {
        type: "string",
        description: "HTTP status text",
        example: "OK",
      },
      data: {
        type: "unknown",
        description: "Response body (parsed JSON or text)",
        example: { id: 1, name: "Result" },
      },
      headers: {
        type: "object",
        description: "Response headers",
        example: { "content-type": "application/json" },
      },
    },
  },

  "send-email": {
    type: "object",
    description: "Email send result",
    properties: {
      messageId: {
        type: "string",
        description: "Unique message ID",
        example: "msg_abc123",
      },
      sent: {
        type: "boolean",
        description: "Whether email was sent successfully",
        example: true,
      },
      to: {
        type: "string",
        description: "Recipient address",
        example: "recipient@example.com",
      },
      sentAt: {
        type: "string",
        description: "When email was sent",
        example: "2026-02-06T14:30:00Z",
      },
    },
  },

  "send-slack": {
    type: "object",
    description: "Slack message result",
    properties: {
      messageId: {
        type: "string",
        description: "Slack message timestamp ID",
        example: "1234567890.123456",
      },
      channel: {
        type: "string",
        description: "Channel where message was sent",
        example: "#general",
      },
      sent: {
        type: "boolean",
        description: "Whether message was sent successfully",
        example: true,
      },
    },
  },

  "send-discord": {
    type: "object",
    description: "Discord message result",
    properties: {
      messageId: {
        type: "string",
        description: "Discord message ID",
        example: "1234567890123456789",
      },
      channelId: {
        type: "string",
        description: "Channel ID where message was sent",
        example: "9876543210987654321",
      },
      sent: {
        type: "boolean",
        description: "Whether message was sent successfully",
        example: true,
      },
    },
  },

  "database-query": {
    type: "object",
    description: "Database query result",
    properties: {
      rows: {
        type: "array",
        description: "Query result rows",
        items: {
          type: "object",
          description: "Row data",
        },
        example: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
      },
      rowCount: {
        type: "number",
        description: "Number of rows returned/affected",
        example: 2,
      },
      command: {
        type: "string",
        description: "SQL command type",
        example: "SELECT",
      },
    },
  },

  code: {
    type: "unknown",
    description: "Custom code output (depends on your code)",
    example: { result: "Custom value" },
  },

  // ===========================================================================
  // CONDITION NODES
  // ===========================================================================

  "if-else": {
    type: "object",
    description: "Condition evaluation result",
    properties: {
      condition: {
        type: "boolean",
        description: "Whether condition was true or false",
        example: true,
      },
      branch: {
        type: "string",
        description: "Which branch was taken",
        example: "true",
      },
      input: {
        type: "unknown",
        description: "The input data that was evaluated",
      },
    },
  },

  switch: {
    type: "object",
    description: "Switch case result",
    properties: {
      matchedCase: {
        type: "string",
        description: "Which case was matched",
        example: "case1",
      },
      value: {
        type: "unknown",
        description: "The value that was evaluated",
      },
      input: {
        type: "unknown",
        description: "The input data",
      },
    },
  },

  loop: {
    type: "object",
    description: "Current loop iteration",
    properties: {
      item: {
        type: "unknown",
        description: "Current item in the loop",
        example: { id: 1, name: "Item" },
      },
      index: {
        type: "number",
        description: "Current iteration index (0-based)",
        example: 0,
      },
      isFirst: {
        type: "boolean",
        description: "Whether this is the first item",
        example: true,
      },
      isLast: {
        type: "boolean",
        description: "Whether this is the last item",
        example: false,
      },
      total: {
        type: "number",
        description: "Total number of items",
        example: 10,
      },
    },
  },

  merge: {
    type: "object",
    description: "Merged data from multiple branches",
    properties: {
      branches: {
        type: "array",
        description: "Data from each merged branch",
        items: { type: "unknown" },
      },
      mode: {
        type: "string",
        description: "Merge mode used",
        example: "wait-all",
      },
    },
  },

  // ===========================================================================
  // TRANSFORM NODES
  // ===========================================================================

  "set-variable": {
    type: "object",
    description: "Variables that were set",
    example: { myVar: "value", count: 42 },
  },

  function: {
    type: "unknown",
    description: "Transform function output",
    example: { transformed: true, data: [] },
  },

  filter: {
    type: "array",
    description: "Filtered items",
    items: { type: "unknown" },
    example: [{ id: 1 }, { id: 3 }],
  },

  split: {
    type: "object",
    description: "Split operation context",
    properties: {
      item: {
        type: "unknown",
        description: "Current split item",
      },
      index: {
        type: "number",
        description: "Current item index",
        example: 0,
      },
      total: {
        type: "number",
        description: "Total items after split",
        example: 5,
      },
    },
  },

  aggregate: {
    type: "object",
    description: "Aggregated result",
    properties: {
      items: {
        type: "array",
        description: "All aggregated items",
        items: { type: "unknown" },
      },
      count: {
        type: "number",
        description: "Number of items aggregated",
        example: 10,
      },
    },
  },

  // ===========================================================================
  // OTHERS
  // ===========================================================================

  wait: {
    type: "object",
    description: "Wait completion info",
    properties: {
      waitedMs: {
        type: "number",
        description: "Actual milliseconds waited",
        example: 5000,
      },
      resumedAt: {
        type: "string",
        description: "When execution resumed",
        example: "2026-02-06T14:30:05Z",
      },
    },
  },
};

/**
 * Get the output schema for a node subtype
 */
export function getNodeOutputSchema(
  subType: string,
): NodeOutputSchema | undefined {
  return nodeOutputSchemas[subType];
}

/**
 * Get a flattened list of all available paths from a schema
 */
export function getSchemaPathse(
  schema: NodeOutputSchema,
  prefix: string = "",
): Array<{ path: string; schema: NodeOutputSchema }> {
  const paths: Array<{ path: string; schema: NodeOutputSchema }> = [];

  if (schema.type === "object" && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push({ path: fullPath, schema: propSchema });

      // Recurse into nested objects
      if (propSchema.type === "object" && propSchema.properties) {
        paths.push(...getSchemaPathse(propSchema, fullPath));
      }
    }
  }

  return paths;
}
