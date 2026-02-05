import { useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
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
import type {
  NodeCategory,
  NodeSubType,
  WorkflowNode,
} from "@/lib/workflow/types";
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

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/vibeflow-node");
      if (!data) return;

      const { nodeType, subType } = JSON.parse(data) as {
        nodeType: NodeCategory;
        subType: NodeSubType;
      };

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      addNode(nodeType, subType, position);
    },
    [addNode],
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
        {/* Background grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />

        {/* Controls */}
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="!bg-white !border !border-gray-200 !rounded-xl !shadow-lg"
        />

        {/* Mini-map */}
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-white !border !border-gray-200 !rounded-xl !shadow-lg"
        />

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="!top-1/2 !-translate-y-1/2">
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-1">
                Start building your workflow
              </h3>
              <p className="text-xs text-gray-400 max-w-[200px]">
                Drag nodes from the left panel or describe your workflow in
                natural language
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
