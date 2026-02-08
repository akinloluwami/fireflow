import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeCategory,
  NodeSubType,
  NodeConfig,
} from "./types";
import { getNodeDefinition } from "./node-definitions";

interface WorkflowState {
  // Current workflow
  workflow: Workflow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // UI state
  isPanelOpen: boolean;
  isChatOpen: boolean;

  // Validation errors per node
  nodeErrors: Record<string, string[]>;

  // History for undo/redo
  history: Workflow[];
  historyIndex: number;
}

interface WorkflowActions {
  // Workflow actions
  setWorkflow: (workflow: Workflow) => void;
  updateWorkflowMeta: (name: string, description?: string) => void;
  resetWorkflow: () => void;
  setChatThreadId: (threadId: string) => void;

  // Node actions
  addNode: (
    type: NodeCategory,
    subType: NodeSubType,
    position: { x: number; y: number },
    config?: Partial<NodeConfig>,
  ) => string;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  updateNodeConfig: (nodeId: string, config: Partial<NodeConfig>) => void;
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => string | null;

  // Edge actions
  addEdge: (
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => string;
  removeEdge: (edgeId: string) => void;
  updateEdge: (edgeId: string, updates: Partial<WorkflowEdge>) => void;

  // Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  // UI
  togglePanel: () => void;
  toggleChat: () => void;
  setIsPanelOpen: (isOpen: boolean) => void;
  setIsChatOpen: (isOpen: boolean) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Bulk operations (for AI)
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  applyWorkflowChanges: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;

  // Validation
  validateNodes: () => boolean;
  clearNodeErrors: () => void;
  getNodeErrors: (nodeId: string) => string[];
  hasValidationErrors: () => boolean;
}

type WorkflowStore = WorkflowState & WorkflowActions;

const createEmptyWorkflow = (): Workflow => ({
  id: uuid(),
  name: "Untitled Workflow",
  description: "",
  nodes: [],
  edges: [],
  status: "draft",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const initialState: WorkflowState = {
  workflow: createEmptyWorkflow(),
  selectedNodeId: null,
  selectedEdgeId: null,
  isPanelOpen: false,
  isChatOpen: false,
  nodeErrors: {},
  history: [],
  historyIndex: -1,
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  ...initialState,

  setWorkflow: (workflow) => {
    set({ workflow, selectedNodeId: null, selectedEdgeId: null });
  },

  updateWorkflowMeta: (name, description) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        name,
        description,
        updatedAt: new Date(),
      },
    }));
  },

  resetWorkflow: () => {
    set({
      workflow: createEmptyWorkflow(),
      selectedNodeId: null,
      selectedEdgeId: null,
      history: [],
      historyIndex: -1,
    });
  },

  setChatThreadId: (threadId) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        chatThreadId: threadId,
        updatedAt: new Date(),
      },
    }));
  },

  addNode: (type, subType, position, config) => {
    const definition = getNodeDefinition(type, subType);
    const nodeId = uuid();

    const newNode: WorkflowNode = {
      id: nodeId,
      type,
      subType,
      position,
      data: {
        label: definition?.label || subType,
        description: definition?.description,
        config: { ...definition?.defaultConfig, ...config } as NodeConfig,
        icon: definition?.icon,
      },
    };

    set((state) => {
      get().saveToHistory();
      return {
        workflow: {
          ...state.workflow,
          nodes: [...state.workflow.nodes, newNode],
          updatedAt: new Date(),
        },
      };
    });

    return nodeId;
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node,
        ),
        updatedAt: new Date(),
      },
    }));
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: { ...node.data.config, ...config },
                },
              }
            : node,
        ),
        updatedAt: new Date(),
      },
    }));
  },

  updateNodePosition: (nodeId, position) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((node) =>
          node.id === nodeId ? { ...node, position } : node,
        ),
      },
    }));
  },

  removeNode: (nodeId) => {
    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.filter((node) => node.id !== nodeId),
        edges: state.workflow.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
        updatedAt: new Date(),
      },
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  duplicateNode: (nodeId) => {
    const state = get();
    const node = state.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const newNodeId = uuid();
    const newNode: WorkflowNode = {
      ...node,
      id: newNodeId,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: {
        ...node.data,
        label: `${node.data.label} (copy)`,
      },
    };

    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, newNode],
        updatedAt: new Date(),
      },
    }));

    return newNodeId;
  },

  addEdge: (source, target, sourceHandle, targetHandle) => {
    const edgeId = uuid();

    // Prevent duplicate edges
    const exists = get().workflow.edges.some(
      (e) => e.source === source && e.target === target,
    );
    if (exists) return edgeId;

    const newEdge: WorkflowEdge = {
      id: edgeId,
      source,
      target,
      sourceHandle,
      targetHandle,
      animated: true,
    };

    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        edges: [...state.workflow.edges, newEdge],
        updatedAt: new Date(),
      },
    }));

    return edgeId;
  },

  removeEdge: (edgeId) => {
    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        edges: state.workflow.edges.filter((edge) => edge.id !== edgeId),
        updatedAt: new Date(),
      },
      selectedEdgeId:
        state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    }));
  },

  updateEdge: (edgeId, updates) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        edges: state.workflow.edges.map((edge) =>
          edge.id === edgeId ? { ...edge, ...updates } : edge,
        ),
        updatedAt: new Date(),
      },
    }));
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },

  togglePanel: () => {
    set((state) => ({ isPanelOpen: !state.isPanelOpen }));
  },

  toggleChat: () => {
    set((state) => ({ isChatOpen: !state.isChatOpen }));
  },

  setIsPanelOpen: (isOpen) => {
    set({ isPanelOpen: isOpen });
  },

  setIsChatOpen: (isOpen) => {
    set({ isChatOpen: isOpen });
  },

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.workflow)));
      return {
        history: newHistory.slice(-50), // Keep last 50 states
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex < 0) return state;
      const workflow = state.history[state.historyIndex];
      return {
        workflow,
        historyIndex: state.historyIndex - 1,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const workflow = state.history[state.historyIndex + 1];
      return {
        workflow,
        historyIndex: state.historyIndex + 1,
      };
    });
  },

  setNodes: (nodes) => {
    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes,
        updatedAt: new Date(),
      },
    }));
  },

  setEdges: (edges) => {
    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        edges,
        updatedAt: new Date(),
      },
    }));
  },

  applyWorkflowChanges: (nodes, edges) => {
    get().saveToHistory();
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes,
        edges,
        updatedAt: new Date(),
      },
    }));
  },

  validateNodes: () => {
    const { workflow } = get();
    const nodeErrors: Record<string, string[]> = {};

    for (const node of workflow.nodes) {
      const config = (node.data.config || {}) as Record<string, unknown>;
      const errors: string[] = [];

      // Skip trigger nodes for now
      if (node.type === "trigger") continue;

      // Check Discord action
      if (node.subType === "send-discord") {
        if (!config.channelId) {
          errors.push("Channel is required");
        }
        if (!config.message) {
          errors.push("Message is required");
        }
      }

      // Check Slack action
      if (node.subType === "send-slack") {
        if (!config.channel) {
          errors.push("Channel is required");
        }
        if (!config.message) {
          errors.push("Message is required");
        }
      }

      // Check Email action
      if (node.subType === "send-email") {
        if (!config.to) {
          errors.push("Recipient email is required");
        }
        if (!config.subject) {
          errors.push("Subject is required");
        }
      }

      // Check HTTP Request
      if (node.subType === "http-request") {
        if (!config.url) {
          errors.push("URL is required");
        }
      }

      // Check If-Else condition
      if (node.subType === "if-else") {
        if (!config.field && !config.condition) {
          errors.push("Condition is required");
        }
      }

      // Check Sentiment Analysis
      if (node.subType === "sentiment-analysis") {
        if (!config.credentialId) {
          errors.push("API credentials are required");
        }
        if (!config.text) {
          errors.push("Text input is required");
        }
      }

      if (errors.length > 0) {
        nodeErrors[node.id] = errors;
      }
    }

    set({ nodeErrors });
    return Object.keys(nodeErrors).length === 0;
  },

  clearNodeErrors: () => {
    set({ nodeErrors: {} });
  },

  getNodeErrors: (nodeId: string) => {
    return get().nodeErrors[nodeId] || [];
  },

  hasValidationErrors: () => {
    return Object.keys(get().nodeErrors).length > 0;
  },
}));
