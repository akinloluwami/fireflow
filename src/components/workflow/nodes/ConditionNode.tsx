import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Trash2, Copy, GitBranch, Check, X } from "lucide-react";
import type { NodeData } from "@/lib/workflow/types";

interface ConditionNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function ConditionNodeComponent({ id, data, selected }: ConditionNodeProps) {
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
        group relative min-w-[160px] rounded-lg bg-white border border-gray-200
        transition-all duration-150
        ${selected ? "ring-2 ring-amber-500 ring-offset-1 shadow-md" : "hover:shadow-md"}
      `}
      style={{ borderTopWidth: "2px", borderTopColor: "#f59e0b" }}
      onClick={() => selectNode(id)}
    >
      {/* Badge */}
      <div className="absolute -top-2 left-2.5 px-1.5 py-0.5 bg-amber-500 rounded flex items-center gap-0.5">
        <GitBranch size={8} className="text-white" />
        <span className="text-[9px] font-medium text-white uppercase tracking-wide">
          Logic
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 pt-4 pb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-50">
          <NodeIcon
            name={data.icon || "git-branch"}
            size={14}
            className="text-amber-600"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-gray-700 truncate">
            {data.label}
          </h3>
          {data.description && (
            <p className="text-[10px] text-gray-400 truncate">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Branch indicators */}
      <div className="mx-2 mb-2 space-y-1">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100">
          <Check size={10} className="text-emerald-600" />
          <span className="text-[9px] text-emerald-600 font-medium">True</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 rounded border border-red-100">
          <X size={10} className="text-red-500" />
          <span className="text-[9px] text-red-500 font-medium">False</span>
        </div>
      </div>

      {/* Actions */}
      <div
        className={`
          absolute -top-6 right-0 flex gap-0.5 transition-opacity duration-150
          ${selected ? "opacity-100" : "opacity-0"}
        `}
      >
        <button
          onClick={handleDuplicate}
          className="p-1 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Duplicate"
        >
          <Copy size={10} className="text-gray-500" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 bg-white rounded border border-gray-200 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={10} className="text-red-400" />
        </button>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-gray-300 !border-2 !border-white transition-colors hover:!bg-gray-500"
      />

      {/* Output Handles - True (top) and False (bottom) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white transition-colors"
        style={{ top: "40%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-white transition-colors"
        style={{ top: "70%" }}
      />
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
