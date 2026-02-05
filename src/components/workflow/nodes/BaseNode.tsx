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
        relative min-w-[180px] rounded-xl bg-white shadow-lg
        transition-all duration-200 ease-out
        ${selected ? "ring-2 ring-offset-2" : "hover:shadow-xl"}
      `}
      style={{
        borderTop: `3px solid ${color}`,
        ["--tw-ring-color" as string]: color,
      }}
      onClick={() => selectNode(id)}
    >
      {/* Input Handle */}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white transition-colors hover:!bg-gray-600"
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100"
        style={{ color }}
      >
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <NodeIcon name={data.icon || "code"} size={16} />
        </div>
        <span className="font-semibold text-sm text-gray-800 truncate flex-1">
          {data.label}
        </span>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-3 py-2">
          <p className="text-xs text-gray-500 line-clamp-2">
            {data.description}
          </p>
        </div>
      )}

      {/* Actions (visible on hover/select) */}
      <div
        className={`
          absolute -top-8 right-0 flex gap-1 transition-opacity duration-150
          ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
      >
        <button
          onClick={handleDuplicate}
          className="p-1.5 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
          title="Duplicate"
        >
          <Copy size={14} className="text-gray-600" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 bg-white rounded-md shadow-md hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>

      {/* Output Handles */}
      {hasOutputHandle && !outputHandles && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white transition-colors hover:!bg-gray-600"
        />
      )}

      {/* Multiple output handles (for conditions) */}
      {outputHandles?.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Right}
          id={handle.id}
          className="!w-3 !h-3 !border-2 !border-white transition-colors hover:!bg-gray-600"
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
