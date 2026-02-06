import type { NodeDefinition } from "./types";

// =============================================================================
// Node Definitions - Catalog of all available nodes
// =============================================================================

export const nodeDefinitions: NodeDefinition[] = [
  // ---------------------------------------------------------------------------
  // TRIGGER NODES (Green)
  // ---------------------------------------------------------------------------
  {
    type: "trigger",
    subType: "webhook",
    label: "Webhook",
    description: "Trigger workflow via HTTP request",
    icon: "webhook",
    color: "#10b981",
    defaultConfig: {
      method: "POST",
      path: "/webhook",
      authentication: "none",
    },
  },
  {
    type: "trigger",
    subType: "schedule",
    label: "Schedule",
    description: "Run on a schedule (cron)",
    icon: "clock",
    color: "#10b981",
    defaultConfig: {
      cron: "0 9 * * *",
      timezone: "UTC",
    },
  },
  {
    type: "trigger",
    subType: "manual",
    label: "Manual Trigger",
    description: "Manually start workflow",
    icon: "play",
    color: "#10b981",
    defaultConfig: {},
  },

  {
    type: "trigger",
    subType: "form-submission",
    label: "Form Submitted",
    description: "Trigger on form submission",
    icon: "file-text",
    color: "#10b981",
    defaultConfig: {
      formId: "",
    },
  },

  // ---------------------------------------------------------------------------
  // ACTION NODES (Blue)
  // ---------------------------------------------------------------------------
  {
    type: "action",
    subType: "http-request",
    label: "HTTP Request",
    description: "Make an API call",
    icon: "globe",
    color: "#3b82f6",
    defaultConfig: {
      method: "GET",
      url: "",
      headers: {},
      body: "",
    },
  },
  {
    type: "action",
    subType: "send-email",
    label: "Send Email",
    description: "Send an email message",
    icon: "send",
    color: "#3b82f6",
    defaultConfig: {
      to: "",
      subject: "",
      body: "",
    },
  },
  {
    type: "action",
    subType: "send-slack",
    label: "Send Slack",
    description: "Post message to Slack",
    icon: "message-square",
    color: "#4A154B",
    defaultConfig: {
      channel: "",
      message: "",
    },
  },
  {
    type: "action",
    subType: "send-discord",
    label: "Send Discord",
    description: "Post message to Discord",
    icon: "message-circle",
    color: "#5865F2",
    defaultConfig: {
      guildId: "",
      channelId: "",
      message: "",
    },
  },
  {
    type: "action",
    subType: "database-query",
    label: "Database Query",
    description: "Execute SQL query",
    icon: "database",
    color: "#3b82f6",
    defaultConfig: {
      query: "",
      connection: "",
    },
  },
  {
    type: "action",
    subType: "code",
    label: "Run Code",
    description: "Execute custom code",
    icon: "code",
    color: "#3b82f6",
    defaultConfig: {
      language: "javascript",
      code: "// Your code here\nreturn data;",
    },
  },

  // ---------------------------------------------------------------------------
  // CONDITION NODES (Amber)
  // ---------------------------------------------------------------------------
  {
    type: "condition",
    subType: "if-else",
    label: "If/Else",
    description: "Branch based on condition",
    icon: "git-branch",
    color: "#f59e0b",
    defaultConfig: {
      field: "",
      operator: "equals",
      value: "",
    },
  },
  {
    type: "condition",
    subType: "switch",
    label: "Switch",
    description: "Multi-way branching",
    icon: "git-merge",
    color: "#f59e0b",
    defaultConfig: {
      field: "",
      cases: [],
    },
  },
  {
    type: "condition",
    subType: "loop",
    label: "Loop",
    description: "Iterate over items",
    icon: "repeat",
    color: "#f59e0b",
    defaultConfig: {
      items: "",
    },
  },
  {
    type: "condition",
    subType: "merge",
    label: "Merge",
    description: "Combine branches",
    icon: "git-pull-request",
    color: "#f59e0b",
    defaultConfig: {
      mode: "wait-all",
    },
  },

  // ---------------------------------------------------------------------------
  // TRANSFORM NODES (Purple)
  // ---------------------------------------------------------------------------
  {
    type: "transform",
    subType: "set-variable",
    label: "Set Variable",
    description: "Set or modify data",
    icon: "edit-3",
    color: "#8b5cf6",
    defaultConfig: {
      variables: {},
    },
  },
  {
    type: "transform",
    subType: "function",
    label: "Transform",
    description: "Transform data with code",
    icon: "cpu",
    color: "#8b5cf6",
    defaultConfig: {
      expression: "",
    },
  },
  {
    type: "transform",
    subType: "filter",
    label: "Filter",
    description: "Filter array items",
    icon: "filter",
    color: "#8b5cf6",
    defaultConfig: {
      condition: "",
    },
  },
  {
    type: "transform",
    subType: "split",
    label: "Split",
    description: "Split into items",
    icon: "scissors",
    color: "#8b5cf6",
    defaultConfig: {
      field: "",
    },
  },
  {
    type: "transform",
    subType: "aggregate",
    label: "Aggregate",
    description: "Combine items",
    icon: "layers",
    color: "#8b5cf6",
    defaultConfig: {
      operation: "array",
    },
  },

  // ---------------------------------------------------------------------------
  // OTHERS (Gray)
  // ---------------------------------------------------------------------------
  {
    type: "others",
    subType: "wait",
    label: "Wait",
    description: "Delay execution",
    icon: "timer",
    color: "#6b7280",
    defaultConfig: {
      duration: 1000,
      unit: "ms",
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getNodeDefinition(
  type: string,
  subType: string,
): NodeDefinition | undefined {
  return nodeDefinitions.find(
    (def) => def.type === type && def.subType === subType,
  );
}

export function getNodesByCategory(category: string): NodeDefinition[] {
  return nodeDefinitions.filter((def) => def.type === category);
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    trigger: "#10b981",
    action: "#3b82f6",
    condition: "#f59e0b",
    transform: "#8b5cf6",
    others: "#6b7280",
  };
  return colors[category] || "#6b7280";
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    trigger: "Triggers",
    action: "Actions",
    condition: "Logic",
    transform: "Transform",
    others: "Others",
  };
  return labels[category] || category;
}
