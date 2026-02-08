import { memo, useState } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  Trash2,
  Copy,
  AlertTriangle,
  Check,
  Loader2,
  Clock,
  XCircle,
  SkipForward,
  Plus,
} from "lucide-react";
import type {
  NodeData,
  NodeCategory,
  NodeExecutionStatus,
} from "@/lib/workflow/types";

interface FlowNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
  type: NodeCategory;
  color: string;
  hasInputHandle?: boolean;
  hasOutputHandle?: boolean;
  outputHandles?: { id: string; label?: string; color?: string }[];
  inputHandles?: { id: string; label: string; required?: boolean }[];
  showLabelInside?: boolean;
}

function FlowNodeComponent({
  id,
  data,
  selected,
  type,
  color,
  hasInputHandle = true,
  hasOutputHandle = true,
  outputHandles,
  inputHandles,
  showLabelInside = false,
}: FlowNodeProps) {
  const {
    removeNode,
    duplicateNode,
    selectNode,
    nodeErrors,
    execution,
    workflow,
    addNode,
    addEdge,
    removeEdge,
  } = useWorkflowStore();
  const [showActions, setShowActions] = useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const reactFlow = useReactFlow();

  const errors = nodeErrors[id] || [];
  const hasErrors = errors.length > 0;

  // Get execution status from store
  const executionStatus: NodeExecutionStatus =
    execution.nodeStatuses[id] || "idle";
  const executionError = execution.nodeErrors[id];

  const isRunning = executionStatus === "running";
  const isSuccess = executionStatus === "success";
  const isFailed = executionStatus === "failed";
  const isPending = executionStatus === "pending";
  const isSkipped = executionStatus === "skipped";

  const isTrigger = type === "trigger";

  // Status border/shadow colors - use shadow for triggers (follows shape), ring for regular nodes
  const getStatusBorderColor = () => {
    switch (executionStatus) {
      case "running":
        return "#60a5fa"; // blue-400
      case "success":
        return "#34d399"; // emerald-400
      case "failed":
        return "#f87171"; // red-400
      case "pending":
        return "#fcd34d"; // amber-300
      case "skipped":
        return "#d1d5db"; // gray-300
      default:
        return null;
    }
  };

  const getStatusRingClass = () => {
    if (isTrigger) return ""; // Triggers use inline style instead
    switch (executionStatus) {
      case "running":
        return "ring-2 ring-blue-400 ring-offset-2 animate-pulse";
      case "success":
        return "ring-2 ring-emerald-400 ring-offset-2";
      case "failed":
        return "ring-2 ring-red-400 ring-offset-2";
      case "pending":
        return "ring-2 ring-amber-300 ring-offset-2 opacity-75";
      case "skipped":
        return "ring-2 ring-gray-300 ring-offset-2 opacity-50";
      default:
        return "";
    }
  };

  const getStatusAnimationClass = () => {
    if (executionStatus === "running") return "animate-pulse";
    if (executionStatus === "pending") return "animate-pulse";
    return "";
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateNode(id);
  };

  // Check if a model-picker is already connected to a specific handle
  const isHandleConnected = (handleId: string) => {
    return workflow.edges.some(
      (edge) => edge.target === id && edge.targetHandle === handleId,
    );
  };

  // Find the connected model-picker node for a handle
  const getConnectedModelPicker = (handleId: string) => {
    const edge = workflow.edges.find(
      (e) => e.target === id && e.targetHandle === handleId,
    );
    if (!edge) return null;
    return workflow.nodes.find(
      (n) => n.id === edge.source && n.subType === "model-picker",
    );
  };

  // Create a model-picker node and connect it
  const handleCreateModelPicker = (e: React.MouseEvent, handleId: string) => {
    e.stopPropagation();
    e.preventDefault();

    // Get current node position from React Flow
    const currentNode = reactFlow.getNode(id);
    if (!currentNode) return;

    // Position the model picker below the parent node
    const modelPickerPosition = {
      x: currentNode.position.x,
      y: currentNode.position.y + 180,
    };

    // Add the model-picker node
    const newNodeId = addNode("sub", "model-picker", modelPickerPosition);

    // Connect the model-picker to this node
    if (newNodeId) {
      // addEdge takes (source, target, sourceHandle, targetHandle)
      addEdge(newNodeId, id, "model", handleId);

      // Use setTimeout to ensure the node is created before selecting it
      setTimeout(() => {
        selectNode(newNodeId);
      }, 0);
    }

    setShowModelPicker(false);
  };

  // Calculate vertical positions for multiple output handles
  const getHandlePosition = (index: number, total: number) => {
    if (total === 1) return "50%";
    const spacing = 60 / (total + 1);
    return `${20 + spacing * (index + 1)}%`;
  };

  return (
    <div
      className="relative flex flex-col items-center pt-5"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={(e) => {
        // Don't select this node if click was on a nodrag element (like the + button)
        const target = e.target as HTMLElement;
        if (target.closest(".nodrag")) {
          return;
        }
        selectNode(id);
      }}
    >
      {/* Actions - Shown on hover/select */}
      <div
        className={`
          absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5 z-20
          transition-opacity duration-150
          ${showActions || selected ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <button
          onClick={handleDuplicate}
          className="p-0.5 hover:text-gray-700 transition-colors"
          title="Duplicate"
        >
          <Copy size={10} className="text-gray-400 hover:text-gray-600" />
        </button>
        <button
          onClick={handleDelete}
          className="p-0.5 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={10} className="text-gray-400 hover:text-red-500" />
        </button>
      </div>

      {/* Main Node Body */}
      <div
        className={`
          relative ${showLabelInside ? "min-w-[140px] px-3 py-4" : "w-[72px] h-[72px]"} 
          flex items-center ${showLabelInside ? "gap-3" : "justify-center"}
          transition-all duration-150 cursor-pointer
          bg-white
          ${isTrigger ? "rounded-l-full rounded-r-2xl" : "rounded-2xl"}
          ${selected ? "ring-2 ring-offset-2 ring-offset-gray-50" : ""}
          ${!selected && !isTrigger && getStatusRingClass()}
          ${getStatusAnimationClass()}
        `}
        style={{
          borderWidth: selected
            ? "2px"
            : isTrigger && getStatusBorderColor()
              ? "3px"
              : "2px",
          borderStyle: "solid",
          borderColor: selected
            ? color
            : isTrigger && getStatusBorderColor() && !selected
              ? getStatusBorderColor()!
              : "#d1d5db",
          ["--tw-ring-color" as string]: selected ? color : undefined,
        }}
      >
        {/* Icon */}
        <div
          className={`flex items-center justify-center ${showLabelInside ? "w-8 h-8" : "w-10 h-10"} ${isTrigger ? "rounded-l-full rounded-r-xl" : "rounded-xl"}`}
          style={{ backgroundColor: `${color}25` }}
        >
          <NodeIcon
            name={data.icon || "code"}
            size={showLabelInside ? 20 : 24}
            style={{ color }}
          />
        </div>

        {/* Label inside node */}
        {showLabelInside && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-700 leading-tight">
              {data.label.split(" ")[0]}
            </span>
            {data.label.split(" ").length > 1 && (
              <span className="text-xs font-medium text-gray-700 leading-tight">
                {data.label.split(" ").slice(1).join(" ")}
              </span>
            )}
          </div>
        )}

        {/* Input Handle */}
        {hasInputHandle && (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="!w-3 !h-3 !bg-gray-300 !border-2 !border-white 
                       !-left-1.5 transition-colors hover:!bg-gray-400"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
          />
        )}

        {/* Single Output Handle */}
        {hasOutputHandle && !outputHandles && (
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="!w-3 !h-3 !border-2 !border-white 
                       !-right-1.5 transition-colors"
            style={{
              backgroundColor: color,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          />
        )}

        {/* Multiple Output Handles with Labels */}
        {outputHandles?.map((handle, index) => (
          <div
            key={handle.id}
            className="absolute right-0 translate-x-full flex items-center"
            style={{ top: getHandlePosition(index, outputHandles.length) }}
          >
            <Handle
              type="source"
              position={Position.Right}
              id={handle.id}
              className="!relative !transform-none !w-3 !h-3 !border-2 !border-white"
              style={{
                backgroundColor:
                  handle.color ||
                  (handle.id === "true" ? "#10b981" : "#ef4444"),
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            />
            {handle.label && (
              <span className="ml-1.5 text-[10px] text-gray-500 whitespace-nowrap font-medium">
                {handle.label}
              </span>
            )}
          </div>
        ))}

        {/* Execution Status Indicators */}
        {isRunning && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm"
          >
            <Loader2 size={12} className="text-white animate-spin" />
          </div>
        )}

        {isSuccess && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm"
          >
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
        )}

        {isFailed && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm cursor-help"
            onMouseEnter={() => setShowErrorTooltip(true)}
            onMouseLeave={() => setShowErrorTooltip(false)}
          >
            <XCircle size={12} className="text-white" />

            {/* Execution Error Tooltip */}
            {showErrorTooltip && executionError && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-48">
                <div className="bg-white rounded-lg shadow-lg border border-red-200 p-2">
                  <p className="text-xs font-medium text-red-700">
                    Execution failed
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    See execution details for more info
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {isPending && execution.isRunning && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm"
          >
            <Clock size={10} className="text-white" />
          </div>
        )}

        {isSkipped && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-400 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm"
          >
            <SkipForward size={10} className="text-white" />
          </div>
        )}

        {/* Validation Errors (shown when not executing) */}
        {hasErrors && !execution.isRunning && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm cursor-help"
            onMouseEnter={() => setShowErrorTooltip(true)}
            onMouseLeave={() => setShowErrorTooltip(false)}
          >
            <AlertTriangle size={10} className="text-white" />

            {/* Error Tooltip */}
            {showErrorTooltip && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-48">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Issues:
                  </p>
                  <ul className="text-[11px] text-gray-600 space-y-0.5">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Input Handles (for sub-node connections like Model) */}
      {inputHandles && inputHandles.length > 0 && (
        <div className="flex flex-col items-center mt-1">
          {inputHandles.map((handle) => {
            const connected = isHandleConnected(handle.id);
            const connectedNode = getConnectedModelPicker(handle.id);

            return (
              <div
                key={handle.id}
                className="flex flex-col items-center relative"
              >
                {/* Handle positioned on the diamond (for receiving connections) */}
                <Handle
                  type="target"
                  position={Position.Bottom}
                  id={handle.id}
                  className="!w-4 !h-4 !bg-transparent !border-0"
                  style={{
                    position: "absolute",
                    top: "0px",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                />

                {/* Diamond connector at top */}
                <div
                  className="w-2.5 h-2.5 rotate-45 bg-gray-300 border border-gray-400"
                  style={{ marginBottom: "-5px" }}
                />

                {/* Dashed line */}
                <div
                  className="w-px h-4"
                  style={{
                    borderRight: "1px dashed #d1d5db",
                  }}
                />

                {/* Label */}
                <span className="text-[10px] text-gray-500 mb-1">
                  {handle.label}
                  {handle.required && <span className="text-red-500">*</span>}
                </span>

                {/* Plus button when not connected */}
                {!connected && (
                  <div
                    className="nodrag nopan"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleCreateModelPicker(e, handle.id);
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-700 
                                 flex items-center justify-center transition-colors
                                 shadow-sm border-2 border-gray-700 cursor-pointer"
                      title="Add AI Model"
                    >
                      <Plus size={14} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Label below node - only when not showing inside */}
      {!showLabelInside && (
        <div className="mt-2 text-center max-w-[120px]">
          <p className="text-xs font-medium text-gray-700 truncate">
            {data.label}
          </p>
        </div>
      )}
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
