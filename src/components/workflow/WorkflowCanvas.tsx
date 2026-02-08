import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type Viewport,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Sparkles, Grid3X3, X, Keyboard } from "lucide-react";

import { nodeTypes } from "./nodes";
import { WorkflowEdge } from "./edges/WorkflowEdge";
import { useWorkflowStore } from "@/lib/workflow/store";
import { getCategoryColor } from "@/lib/workflow/node-definitions";
import type { NodeCategory, NodeSubType } from "@/lib/workflow/types";
import {
  getEditorSettings,
  saveViewportDebounced,
} from "@/lib/workflow/editor-settings";

const edgeTypes = {
  workflow: WorkflowEdge,
};

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const {
    workflow,
    selectedNodeId,
    addNode,
    addEdge: storeAddEdge,
    updateNodePosition,
    selectNode,
    selectEdge,
    clearSelection,
    setIsPanelOpen,
    setIsChatOpen,
    saveToHistory,
  } = useWorkflowStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number };
  } | null>(null);

  // Animation state for tidy
  const [isTidying, setIsTidying] = useState(false);

  // Keyboard shortcuts help modal
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as HTMLElement)
      ) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu]);

  // Convert workflow nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          subType: node.subType,
        },
        selected: node.id === selectedNodeId,
      })),
    [workflow.nodes, selectedNodeId],
  );

  // Convert workflow edges to React Flow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: "workflow",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
        },
      })),
    [workflow.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes from store
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Sync edges from store
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        storeAddEdge(
          params.source,
          params.target,
          params.sourceHandle ?? undefined,
          params.targetHandle ?? undefined,
        );
      }
    },
    [storeAddEdge],
  );

  // Handle node position changes
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition],
  );

  // Handle node drag start - save history for undo and close context menu
  const onNodeDragStart = useCallback(() => {
    saveToHistory();
    setContextMenu(null);
  }, [saveToHistory]);

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      setContextMenu(null);
    },
    [selectNode],
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
      setContextMenu(null);
    },
    [selectEdge],
  );

  // Handle pane click (deselect and close context menu)
  const onPaneClick = useCallback(() => {
    clearSelection();
    setContextMenu(null);
  }, [clearSelection]);

  // Handle move start (pan) - close context menu
  const onMoveStart = useCallback(() => {
    setContextMenu(null);
  }, []);

  const { screenToFlowPosition } = useReactFlow();

  // Track if initial viewport has been restored
  const viewportRestoredRef = useRef<string | null>(null);

  // Get saved viewport settings (for initial load - no animation)
  const savedSettings = useMemo(() => {
    if (!workflow.id) return null;
    return getEditorSettings(workflow.id);
  }, [workflow.id]);

  const hasSavedViewport = !!savedSettings?.viewport;

  // Mark viewport as restored once workflow loads
  useEffect(() => {
    if (workflow.id && viewportRestoredRef.current !== workflow.id) {
      viewportRestoredRef.current = workflow.id;
    }
  }, [workflow.id]);

  // Save viewport on move end (debounced)
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (workflow.id && viewportRestoredRef.current === workflow.id) {
        saveViewportDebounced(workflow.id, viewport);
      }
    },
    [workflow.id],
  );

  // Handle right-click context menu
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition,
      });
    },
    [screenToFlowPosition],
  );

  // Tidy up workflow - arrange nodes in layers based on dependencies
  const tidyUpWorkflow = useCallback(() => {
    const nodeCount = workflow.nodes.length;
    if (nodeCount === 0) return;

    // Enable animation
    setIsTidying(true);

    const spacing = { x: 250, y: 120 };
    const startX = 100;
    const startY = 100;

    // Separate model-picker nodes (sub nodes) - they should be positioned below their connected parent
    const modelPickerNodes = workflow.nodes.filter(
      (n) => n.subType === "model-picker",
    );
    const regularNodes = workflow.nodes.filter(
      (n) => n.subType !== "model-picker",
    );

    // Build adjacency map for regular nodes only
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    regularNodes.forEach((node) => {
      outgoingEdges.set(node.id, []);
      incomingEdges.set(node.id, []);
    });

    workflow.edges.forEach((edge) => {
      // Only count edges between regular nodes
      if (outgoingEdges.has(edge.source) && incomingEdges.has(edge.target)) {
        outgoingEdges.get(edge.source)?.push(edge.target);
        incomingEdges.get(edge.target)?.push(edge.source);
      }
    });

    // Find root nodes (nodes with no incoming edges - typically triggers)
    const rootNodes = regularNodes.filter(
      (node) => (incomingEdges.get(node.id)?.length || 0) === 0,
    );

    // Build layers using BFS from root nodes
    const layers: string[][] = [];
    const visited = new Set<string>();
    let currentLayer = rootNodes.map((n) => n.id);

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      currentLayer.forEach((id) => visited.add(id));

      const nextLayer: string[] = [];
      currentLayer.forEach((nodeId) => {
        const children = outgoingEdges.get(nodeId) || [];
        children.forEach((childId) => {
          if (!visited.has(childId) && !nextLayer.includes(childId)) {
            // Only add to next layer if all parents are visited
            const parents = incomingEdges.get(childId) || [];
            if (parents.every((p) => visited.has(p))) {
              nextLayer.push(childId);
            }
          }
        });
      });

      // Handle nodes that couldn't be added due to unvisited parents
      if (nextLayer.length === 0) {
        const remaining = regularNodes.filter((n) => !visited.has(n.id));
        if (remaining.length > 0) {
          nextLayer.push(remaining[0].id);
        }
      }

      currentLayer = nextLayer;
    }

    // Add any orphan regular nodes (not connected to anything)
    const orphans = regularNodes.filter((n) => !visited.has(n.id));
    if (orphans.length > 0) {
      layers.push(orphans.map((n) => n.id));
    }

    // Track positioned nodes for model picker placement
    const nodePositions = new Map<string, { x: number; y: number }>();

    // Position regular nodes based on layers (left to right)
    const regularNodeCount = regularNodes.length;
    layers.forEach((layer, layerIndex) => {
      const layerHeight = layer.length * spacing.y;
      const layerStartY =
        startY +
        (regularNodeCount > layer.length
          ? ((regularNodeCount * spacing.y) / 2 - layerHeight) / 2
          : 0);

      layer.forEach((nodeId, nodeIndex) => {
        // Center nodes vertically in their layer
        const y = layerStartY + nodeIndex * spacing.y;
        const x = startX + layerIndex * spacing.x;
        updateNodePosition(nodeId, { x, y });
        nodePositions.set(nodeId, { x, y });
      });
    });

    // Position model-picker nodes below their connected parent nodes
    modelPickerNodes.forEach((modelPicker) => {
      // Find the node this model picker connects to
      const connectedEdge = workflow.edges.find(
        (edge) => edge.source === modelPicker.id,
      );

      if (connectedEdge) {
        const parentPos = nodePositions.get(connectedEdge.target);
        if (parentPos) {
          // Position below the parent node, slightly offset
          updateNodePosition(modelPicker.id, {
            x: parentPos.x,
            y: parentPos.y + 100,
          });
          return;
        }
      }

      // If no connected parent found, place at the bottom left
      updateNodePosition(modelPicker.id, {
        x: startX,
        y: startY + regularNodeCount * spacing.y + 50,
      });
    });

    // Disable animation after transition completes
    setTimeout(() => setIsTidying(false), 500);

    setContextMenu(null);
  }, [workflow.nodes, workflow.edges, updateNodePosition]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Tab: Open node picker
      if (e.key === "Tab") {
        e.preventDefault();
        setIsPanelOpen(true);
      }

      // C: Open chat
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsChatOpen(true);
      }

      // T: Tidy up workflow
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        tidyUpWorkflow();
      }

      // ?: Show keyboard shortcuts
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // Escape: Close shortcuts modal
      if (e.key === "Escape" && showShortcuts) {
        e.preventDefault();
        setShowShortcuts(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsPanelOpen, setIsChatOpen, tidyUpWorkflow, showShortcuts]);

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/fireflow-node");
      if (!data) return;

      const { nodeType, subType } = JSON.parse(data) as {
        nodeType: NodeCategory;
        subType: NodeSubType;
      };

      // Use screenToFlowPosition for accurate placement accounting for zoom/pan
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Offset to center the node on cursor
      position.x -= 80;
      position.y -= 40;

      addNode(nodeType, subType, position);
    },
    [addNode, screenToFlowPosition],
  );

  // Mini-map node color
  const nodeColor = (node: Node): string => {
    return getCategoryColor(node.type || "action");
  };

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: "workflow",
          animated: true,
        }}
        defaultViewport={savedSettings?.viewport}
        fitView={!hasSavedViewport}
        fitViewOptions={{
          padding: 0.2,
        }}
        proOptions={{ hideAttribution: true }}
        className={`bg-gray-50 ${isTidying ? "tidying-nodes" : ""}`}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />

        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="bg-white! border! border-gray-200! rounded-xl! shadow-lg!"
        />

        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white! border! border-gray-200! rounded-xl! shadow-lg!"
        />

        {nodes.length === 0 && (
          <Panel position="top-center" className="top-1/2! -translate-y-1/2!">
            <div className="flex items-center gap-6">
              <button
                className="flex flex-col items-center gap-3 group"
                onClick={() => {
                  setIsPanelOpen(true);
                }}
              >
                <div
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 
                                flex items-center justify-center bg-gray-50/50
                                group-hover:border-gray-400 group-hover:bg-gray-100/50 transition-colors"
                >
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  Add first step...
                </span>
              </button>

              <span className="text-sm text-gray-400">or</span>

              <button
                className="flex flex-col items-center gap-3 group"
                onClick={() => {
                  setIsChatOpen(true);
                }}
              >
                <div
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 
                                flex items-center justify-center bg-gray-50/50
                                group-hover:border-accent group-hover:bg-accent/5 transition-colors"
                >
                  <svg
                    className="w-8 h-8 text-gray-400 group-hover:text-accent transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 font-medium group-hover:text-accent transition-colors">
                  Build with AI
                </span>
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[180px] overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                setIsPanelOpen(true);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            >
              <Plus size={16} className="text-gray-500" />
              <span className="flex-1">Add Node</span>
              <span className="text-xs text-gray-400">Tab</span>
            </button>
            <button
              onClick={() => {
                setIsChatOpen(true);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            >
              <Sparkles size={16} className="text-accent" />
              <span className="flex-1">Build with AI</span>
              <span className="text-xs text-gray-400">C</span>
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={tidyUpWorkflow}
              disabled={workflow.nodes.length === 0}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Grid3X3 size={16} className="text-gray-500" />
              <span className="flex-1">Tidy Up Workflow</span>
              <span className="text-xs text-gray-400">T</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[400px] max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <Keyboard size={20} className="text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Navigation
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Open node picker</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        Tab
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Open AI chat</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        C
                      </kbd>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Editing
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Undo</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        ⌘Z
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Redo</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        ⌘Y
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Tidy up workflow</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        T
                      </kbd>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Execution
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Execute workflow</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        E
                      </kbd>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Help
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        Show keyboard shortcuts
                      </span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                        ?
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">
                    Esc
                  </kbd>{" "}
                  to close
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
