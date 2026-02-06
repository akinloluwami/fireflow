import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Trash2, Copy, AlertTriangle, Check } from "lucide-react";
import type { NodeData, NodeCategory } from "@/lib/workflow/types";

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
  const { removeNode, duplicateNode, selectNode, nodeErrors } =
    useWorkflowStore();
  const [showActions, setShowActions] = useState(false);

  const errors = nodeErrors[id] || [];
  const hasErrors = errors.length > 0;
  const isSuccess = data.executionStatus === "success";
  const isTrigger = type === "trigger";

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
          bg-white border-2 shadow-sm
          ${isTrigger ? "rounded-l-full rounded-r-2xl" : "rounded-2xl"}
          ${selected ? "ring-2 ring-offset-2 ring-offset-gray-50 shadow-md" : "hover:shadow-md"}
        `}
        style={{
          borderColor: selected ? color : "#e5e7eb",
          ["--tw-ring-color" as string]: color,
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

        {/* Status Indicators */}
        {isSuccess && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm"
          >
            <Check size={10} className="text-white" strokeWidth={3} />
          </div>
        )}

        {hasErrors && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm"
          >
            <AlertTriangle size={10} className="text-white" />
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
