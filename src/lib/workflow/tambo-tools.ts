import type { TamboTool } from "@tambo-ai/react";
import { z } from "zod";
import { useWorkflowStore } from "./store";
import { nodeDefinitions } from "./node-definitions";
import type { NodeCategory, NodeSubType } from "./types";

export const getCurrentWorkflowTool: TamboTool = {
  name: "getCurrentWorkflow",
  description:
    "Get the current workflow state including all nodes and edges. Use this to understand what exists before making modifications.",
  tool: () => {
    const { workflow } = useWorkflowStore.getState();
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
      nodes: workflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        subType: n.subType,
        label: n.data.label,
        position: n.position,
      })),
      edges: workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      })),
    };
  },
  inputSchema: z.object({}),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    nodeCount: z.number(),
    edgeCount: z.number(),
    nodes: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        subType: z.string(),
        label: z.string(),
        position: z.object({ x: z.number(), y: z.number() }),
      }),
    ),
    edges: z.array(
      z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        sourceHandle: z.string().optional(),
      }),
    ),
  }),
};

export const getAvailableNodesTool: TamboTool = {
  name: "getAvailableNodes",
  description:
    "Get a list of all available node types that can be added to workflows. Use this to understand what nodes are available.",
  tool: () => {
    return nodeDefinitions.map((def) => ({
      type: def.type,
      subType: def.subType,
      label: def.label,
      description: def.description,
    }));
  },
  inputSchema: z.object({}),
  outputSchema: z.array(
    z.object({
      type: z.string(),
      subType: z.string(),
      label: z.string(),
      description: z.string(),
    }),
  ),
};

export const addNodeTool: TamboTool = {
  name: "addNode",
  description:
    "Add a new node to the workflow. Specify the node type, subType, position, and optionally connect it to an existing node.",
  tool: ({
    type,
    subType,
    position,
    label,
    configJson,
    connectFromNodeId,
    connectFromHandle,
  }: {
    type: NodeCategory;
    subType: NodeSubType;
    position: { x: number; y: number };
    label?: string;
    configJson?: string;
    connectFromNodeId?: string;
    connectFromHandle?: string;
  }) => {
    const { addNode, addEdge, updateNode } = useWorkflowStore.getState();

    // Parse config from JSON string
    let config: Record<string, unknown> | undefined;
    if (configJson) {
      try {
        config = JSON.parse(configJson);
      } catch {
        config = undefined;
      }
    }

    const nodeId = addNode(type, subType, position, config);

    if (label) {
      updateNode(nodeId, { data: { label, config: config || {} } } as any);
    }

    if (connectFromNodeId) {
      addEdge(connectFromNodeId, nodeId, connectFromHandle);
    }

    return { success: true, nodeId };
  },
  inputSchema: z.object({
    type: z.enum(["trigger", "action", "condition", "transform"]),
    subType: z
      .string()
      .describe('The specific node subType like "webhook", "http-request"'),
    position: z.object({
      x: z.number().describe("X position on canvas"),
      y: z.number().describe("Y position on canvas"),
    }),
    label: z.string().optional().describe("Custom label for the node"),
    configJson: z
      .string()
      .optional()
      .describe(
        'Node configuration as JSON string, e.g. {"url": "https://api.example.com"}',
      ),
    connectFromNodeId: z
      .string()
      .optional()
      .describe("ID of node to connect from"),
    connectFromHandle: z
      .string()
      .optional()
      .describe('Handle ID (e.g., "true" or "false" for conditions)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    nodeId: z.string(),
  }),
};

export const removeNodeTool: TamboTool = {
  name: "removeNode",
  description:
    "Remove a node from the workflow by its ID. Also removes connected edges.",
  tool: ({ nodeId }: { nodeId: string }) => {
    const { removeNode, workflow } = useWorkflowStore.getState();
    const exists = workflow.nodes.some((n) => n.id === nodeId);

    if (!exists) {
      return { success: false, error: "Node not found" };
    }

    removeNode(nodeId);
    return { success: true };
  },
  inputSchema: z.object({
    nodeId: z.string().describe("ID of the node to remove"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
};

export const connectNodesTool: TamboTool = {
  name: "connectNodes",
  description: "Create a connection (edge) between two nodes.",
  tool: ({
    sourceId,
    targetId,
    sourceHandle,
  }: {
    sourceId: string;
    targetId: string;
    sourceHandle?: string;
  }) => {
    const { addEdge } = useWorkflowStore.getState();
    const edgeId = addEdge(sourceId, targetId, sourceHandle);
    return { success: true, edgeId };
  },
  inputSchema: z.object({
    sourceId: z.string().describe("ID of the source node"),
    targetId: z.string().describe("ID of the target node"),
    sourceHandle: z
      .string()
      .optional()
      .describe('Source handle (e.g., "true" or "false" for conditions)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    edgeId: z.string(),
  }),
};

export const updateNodeConfigTool: TamboTool = {
  name: "updateNodeConfig",
  description: "Update the configuration of an existing node.",
  tool: ({
    nodeId,
    configJson,
    label,
  }: {
    nodeId: string;
    configJson?: string;
    label?: string;
  }) => {
    const { updateNodeConfig, updateNode, workflow } =
      useWorkflowStore.getState();
    const exists = workflow.nodes.some((n) => n.id === nodeId);

    if (!exists) {
      return { success: false, error: "Node not found" };
    }

    // Parse config from JSON string
    if (configJson) {
      try {
        const config = JSON.parse(configJson);
        updateNodeConfig(nodeId, config);
      } catch {
        return { success: false, error: "Invalid JSON in configJson" };
      }
    }

    if (label) {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (node) {
        updateNode(nodeId, {
          data: { ...node.data, label },
        });
      }
    }

    return { success: true };
  },
  inputSchema: z.object({
    nodeId: z.string().describe("ID of the node to update"),
    configJson: z
      .string()
      .optional()
      .describe(
        'Configuration updates as JSON string, e.g. {"url": "https://new-url.com"}',
      ),
    label: z.string().optional().describe("New label"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
};

export const clearWorkflowTool: TamboTool = {
  name: "clearWorkflow",
  description:
    "Clear all nodes and edges from the current workflow. Start fresh.",
  tool: () => {
    const { resetWorkflow } = useWorkflowStore.getState();
    resetWorkflow();
    return { success: true };
  },
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
  }),
};

export const updateWorkflowMetaTool: TamboTool = {
  name: "updateWorkflowMeta",
  description: "Update the workflow name and description.",
  tool: ({ name, description }: { name: string; description?: string }) => {
    const { updateWorkflowMeta } = useWorkflowStore.getState();
    updateWorkflowMeta(name, description);
    return { success: true };
  },
  inputSchema: z.object({
    name: z.string().describe("New workflow name"),
    description: z.string().optional().describe("New workflow description"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
};

export const workflowTools: TamboTool[] = [
  getCurrentWorkflowTool,
  getAvailableNodesTool,
  addNodeTool,
  removeNodeTool,
  connectNodesTool,
  updateNodeConfigTool,
  clearWorkflowTool,
  updateWorkflowMetaTool,
];
