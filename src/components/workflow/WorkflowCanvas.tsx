import { useCallback, useRef, useMemo } from "react";
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
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { WorkflowEdge } from "./edges/WorkflowEdge";
import { useWorkflowStore } from "@/lib/workflow/store";
import { getCategoryColor } from "@/lib/workflow/node-definitions";
import type { NodeCategory, NodeSubType } from "@/lib/workflow/types";
import { useEffect } from "react";

const edgeTypes = {
  workflow: WorkflowEdge,
};

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
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
  } = useWorkflowStore();

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

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const { screenToFlowPosition } = useReactFlow();

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
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: "workflow",
          animated: true,
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-gray-50"
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
    </div>
  );
}
