import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Trash2, Copy } from "lucide-react";
import type { NodeData, NodeCategory } from "@/lib/workflow/types";

interface BaseNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
  type: NodeCategory;
  color: string;
  hasInputHandle?: boolean;
  hasOutputHandle?: boolean;
  outputHandles?: { id: string; label?: string }[];
}

function BaseNodeComponent({
  id,
  data,
  selected,
  color,
  hasInputHandle = true,
  hasOutputHandle = true,
  outputHandles,
}: BaseNodeProps) {
  const { removeNode, duplicateNode, selectNode } = useWorkflowStore();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateNode(id);
  };

  return (
    <div
      className={`
        relative min-w-[160px] rounded-lg bg-white border border-gray-200
        transition-all duration-150
        ${selected ? "ring-2 ring-offset-1 shadow-md" : "hover:shadow-md"}
      `}
      style={{
        borderTopWidth: "2px",
        borderTopColor: color,
        ["--tw-ring-color" as string]: color,
      }}
      onClick={() => selectNode(id)}
    >
      {/* Input Handle */}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-gray-300 !border-2 !border-white transition-colors hover:!bg-gray-500"
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100"
        style={{ color }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ backgroundColor: `${color}10` }}
        >
          <NodeIcon name={data.icon || "code"} size={14} />
        </div>
        <span className="font-medium text-xs text-gray-700 truncate flex-1">
          {data.label}
        </span>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-2.5 py-1.5">
          <p className="text-[10px] text-gray-400 line-clamp-2">
            {data.description}
          </p>
        </div>
      )}

      {/* Actions (visible on select) */}
      <div
        className={`
          absolute -top-7 right-0 flex gap-0.5 transition-opacity duration-150
          ${selected ? "opacity-100" : "opacity-0"}
        `}
      >
        <button
          onClick={handleDuplicate}
          className="p-1 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Duplicate"
        >
          <Copy size={12} className="text-gray-500" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 bg-white rounded border border-gray-200 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={12} className="text-red-400" />
        </button>
      </div>

      {/* Output Handles */}
      {hasOutputHandle && !outputHandles && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !bg-gray-300 !border-2 !border-white transition-colors hover:!bg-gray-500"
        />
      )}

      {/* Multiple output handles (for conditions) */}
      {outputHandles?.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Right}
          id={handle.id}
          className="!w-2.5 !h-2.5 !border-2 !border-white transition-colors"
          style={{
            top: `${30 + index * 25}%`,
            backgroundColor: handle.id === "true" ? "#10b981" : "#ef4444",
          }}
        />
      ))}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
