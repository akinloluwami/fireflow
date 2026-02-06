import { memo, useCallback } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  getBezierPath,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Webhook, GitBranch, Send, Timer, Check } from "lucide-react";
import { SiSlack } from "react-icons/si";
import type { ReactNode } from "react";

interface DemoNodeData {
  label: string;
  icon: ReactNode;
  color: string;
  description: string;
  isTrigger?: boolean;
  [key: string]: unknown;
}

function DemoNodeComponent({ data, selected }: NodeProps<Node<DemoNodeData>>) {
  const { label, icon, color, isTrigger } = data;

  return (
    <div className="relative flex flex-col items-center pt-1">
      <div
        className={`
          relative w-18 h-18 
          flex items-center justify-center
          transition-all duration-150 cursor-pointer
          bg-white border-2 shadow-sm
          ${isTrigger ? "rounded-l-full rounded-r-2xl" : "rounded-2xl"}
          ${selected ? "ring-2 ring-offset-2 ring-offset-gray-50 shadow-md" : "hover:shadow-md"}
        `}
        style={{
          borderColor: selected ? color : "#e5e7eb",
          ["--tw-ring-color" as string]: color,
        }}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 ${isTrigger ? "rounded-l-full rounded-r-xl" : "rounded-xl"}`}
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </div>

        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="w-3! h-3! bg-gray-300! border-2! border-white! -left-1.5!"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
          />
        )}

        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3! h-3! border-2! border-white! -right-1.5!"
          style={{
            backgroundColor: color,
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
        />

        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full 
                        flex items-center justify-center border-2 border-white shadow-sm"
        >
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
      </div>

      <div className="mt-2 text-center max-w-30">
        <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
      </div>
    </div>
  );
}

function DemoConditionNodeComponent({
  data,
  selected,
}: NodeProps<Node<DemoNodeData>>) {
  const { label, icon, color } = data;

  return (
    <div className="relative flex flex-col items-center pt-1">
      <div
        className={`
          relative w-18 h-18 
          flex items-center justify-center
          transition-all duration-150 cursor-pointer
          bg-white border-2 shadow-sm rounded-2xl
          ${selected ? "ring-2 ring-offset-2 ring-offset-gray-50 shadow-md" : "hover:shadow-md"}
        `}
        style={{
          borderColor: selected ? color : "#e5e7eb",
          ["--tw-ring-color" as string]: color,
        }}
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3! h-3! bg-gray-300! border-2! border-white! -left-1.5!"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        />

        <div
          className="absolute right-0 translate-x-full flex items-center"
          style={{ top: "30%" }}
        >
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="relative! transform-none! w-3! h-3! border-2! border-white!"
            style={{
              backgroundColor: "#10b981",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          />
          <span className="ml-1.5 text-[10px] text-gray-500 whitespace-nowrap font-medium">
            Yes
          </span>
        </div>

        <div
          className="absolute right-0 translate-x-full flex items-center"
          style={{ top: "70%" }}
        >
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="relative! transform-none! w-3! h-3! border-2! border-white!"
            style={{
              backgroundColor: "#ef4444",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          />
          <span className="ml-1.5 text-[10px] text-gray-500 whitespace-nowrap font-medium">
            No
          </span>
        </div>

        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full 
                        flex items-center justify-center border-2 border-white shadow-sm"
        >
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
      </div>

      <div className="mt-2 text-center max-w-30">
        <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
      </div>
    </div>
  );
}

const DemoNode = memo(DemoNodeComponent);
const DemoConditionNode = memo(DemoConditionNodeComponent);

function DemoEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  let edgeColor = "#94a3b8";
  if (sourceHandleId === "true") edgeColor = "#10b981";
  else if (sourceHandleId === "false") edgeColor = "#ef4444";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />
      <circle r="3" fill={edgeColor}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}

const DemoEdge = memo(DemoEdgeComponent);

const demoNodeTypes = {
  demo: DemoNode,
  demoCondition: DemoConditionNode,
};

const demoEdgeTypes = {
  demo: DemoEdge,
};

const sampleNodes: Node<DemoNodeData>[] = [
  {
    id: "1",
    type: "demo",
    position: { x: 0, y: 120 },
    data: {
      label: "Webhook",
      description: "Trigger via HTTP request",
      icon: <Webhook size={24} style={{ color: "#10b981" }} />,
      color: "#10b981",
      isTrigger: true,
    },
  },
  {
    id: "2",
    type: "demoCondition",
    position: { x: 200, y: 120 },
    data: {
      label: "If / Else",
      description: "Check priority",
      icon: <GitBranch size={24} style={{ color: "#f59e0b" }} />,
      color: "#f59e0b",
    },
  },
  {
    id: "3",
    type: "demo",
    position: { x: 440, y: 120 },
    data: {
      label: "Wait",
      description: "Delay 5 seconds",
      icon: <Timer size={24} style={{ color: "#6b7280" }} />,
      color: "#6b7280",
    },
  },
  {
    id: "4",
    type: "demo",
    position: { x: 660, y: 40 },
    data: {
      label: "Send Email",
      description: "Notify the team",
      icon: <Send size={24} style={{ color: "#3b82f6" }} />,
      color: "#3b82f6",
    },
  },
  {
    id: "5",
    type: "demo",
    position: { x: 660, y: 200 },
    data: {
      label: "Slack",
      description: "Post to #general",
      icon: <SiSlack size={22} style={{ color: "#4A154B" }} />,
      color: "#4A154B",
    },
  },
];

const sampleEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    sourceHandle: "output",
    targetHandle: "input",
    type: "demo",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
  },
  {
    id: "e2-3-true",
    source: "2",
    target: "3",
    sourceHandle: "true",
    targetHandle: "input",
    type: "demo",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
  },
  {
    id: "e2-3-false",
    source: "2",
    target: "3",
    sourceHandle: "false",
    targetHandle: "input",
    type: "demo",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    sourceHandle: "output",
    targetHandle: "input",
    type: "demo",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
  },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    sourceHandle: "output",
    targetHandle: "input",
    type: "demo",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
  },
];

const BOUNDS = { minX: -20, minY: 0, maxX: 680, maxY: 260 };

export function DemoWorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(sampleNodes);
  const [edges, , onEdgesChange] = useEdgesState(sampleEdges);

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const clampedX = Math.max(
        BOUNDS.minX,
        Math.min(BOUNDS.maxX, node.position.x),
      );
      const clampedY = Math.max(
        BOUNDS.minY,
        Math.min(BOUNDS.maxY, node.position.y),
      );

      if (clampedX !== node.position.x || clampedY !== node.position.y) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, position: { x: clampedX, y: clampedY } }
              : n,
          ),
        );
      }
    },
    [setNodes],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const clampedX = Math.max(
        BOUNDS.minX,
        Math.min(BOUNDS.maxX, node.position.x),
      );
      const clampedY = Math.max(
        BOUNDS.minY,
        Math.min(BOUNDS.maxY, node.position.y),
      );

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, position: { x: clampedX, y: clampedY } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  return (
    <section className="px-6 pb-20 pt-8">
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ height: 560 }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={demoNodeTypes}
            edgeTypes={demoEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.05, minZoom: 1.2, maxZoom: 1.2 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable
            autoPanOnNodeDrag={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            minZoom={1.2}
            maxZoom={1.2}
          ></ReactFlow>
        </div>
      </div>
    </section>
  );
}
