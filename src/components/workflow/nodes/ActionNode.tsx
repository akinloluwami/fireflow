import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Trash2, Copy, Cog } from "lucide-react";
import type { NodeData } from "@/lib/workflow/types";

interface ActionNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function ActionNodeComponent({ id, data, selected }: ActionNodeProps) {
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
        group relative min-w-[200px] rounded-2xl bg-gradient-to-br from-blue-50 to-white
        shadow-lg border border-blue-100
        transition-all duration-200 ease-out
        ${selected ? "ring-2 ring-blue-500 ring-offset-2 shadow-blue-100" : "hover:shadow-xl hover:shadow-blue-50"}
      `}
      onClick={() => selectNode(id)}
    >
      {/* Glow effect */}
      <div
        className={`
          absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl opacity-0
          blur transition-opacity duration-300
          ${selected ? "opacity-20" : "group-hover:opacity-10"}
        `}
      />

      {/* Content */}
      <div className="relative">
        {/* Badge */}
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-blue-500 rounded-full flex items-center gap-1">
          <Cog size={10} className="text-white" />
          <span className="text-[10px] font-semibold text-white uppercase tracking-wide">
            Action
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
            <NodeIcon
              name={data.icon || "code"}
              size={20}
              className="text-white"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">
              {data.label}
            </h3>
            {data.description && (
              <p className="text-xs text-gray-500 truncate">
                {data.description}
              </p>
            )}
          </div>
        </div>

        {/* Config preview */}
        <div className="mx-3 mb-3 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
          <span className="text-[11px] text-blue-700 font-medium">
            Click to configure
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className={`
          absolute -top-3 -right-3 flex gap-1 transition-all duration-150
          ${selected ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"}
        `}
      >
        <button
          onClick={handleDuplicate}
          className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors border border-gray-100"
          title="Duplicate"
        >
          <Copy size={12} className="text-gray-600" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors border border-gray-100"
          title="Delete"
        >
          <Trash2 size={12} className="text-red-500" />
        </button>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-blue-500 !border-[3px] !border-white !shadow-md transition-transform hover:!scale-110"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-blue-500 !border-[3px] !border-white !shadow-md transition-transform hover:!scale-110"
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
