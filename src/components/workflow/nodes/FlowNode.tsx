import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
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
}: FlowNodeProps) {
  const { removeNode, duplicateNode, selectNode, nodeErrors, execution } =
    useWorkflowStore();
  const [showActions, setShowActions] = useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);

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
      onClick={() => selectNode(id)}
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
          relative w-[72px] h-[72px] 
          flex items-center justify-center
          transition-all duration-150 cursor-pointer
          bg-white shadow-sm
          ${isTrigger ? "rounded-l-full rounded-r-2xl" : "rounded-2xl"}
          ${selected ? "ring-2 ring-offset-2 ring-offset-gray-50 shadow-md" : "hover:shadow-md"}
          ${!selected && !isTrigger && getStatusRingClass()}
          ${getStatusAnimationClass()}
        `}
        style={{
          borderWidth:
            isTrigger && getStatusBorderColor() && !selected ? "3px" : "2px",
          borderStyle: "solid",
          borderColor: selected
            ? color
            : isTrigger && getStatusBorderColor() && !selected
              ? getStatusBorderColor()!
              : "#e5e7eb",
          ["--tw-ring-color" as string]: selected ? color : undefined,
        }}
      >
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-10 h-10 ${isTrigger ? "rounded-l-full rounded-r-xl" : "rounded-xl"}`}
          style={{ backgroundColor: `${color}15` }}
        >
          <NodeIcon name={data.icon || "code"} size={24} style={{ color }} />
        </div>

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
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Execution Error:
                  </p>
                  <p className="text-[11px] text-gray-600">{executionError}</p>
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

      {/* Label below node */}
      <div className="mt-2 text-center max-w-[120px]">
        <p className="text-xs font-medium text-gray-700 truncate">
          {data.label}
        </p>
      </div>
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
