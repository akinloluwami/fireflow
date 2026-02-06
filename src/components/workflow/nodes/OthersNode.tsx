import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Trash2, Copy, AlertTriangle } from "lucide-react";
import type { NodeData } from "@/lib/workflow/types";

interface OthersNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function OthersNodeComponent({ id, data, selected }: OthersNodeProps) {
  const { removeNode, duplicateNode, selectNode, nodeErrors } =
    useWorkflowStore();
  const [showTooltip, setShowTooltip] = useState(false);

  const errors = nodeErrors[id] || [];
  const hasErrors = errors.length > 0;

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
        ${selected ? "ring-2 ring-gray-500 ring-offset-1 shadow-md" : "hover:shadow-md"}
        ${hasErrors ? "border-amber-400" : ""}
      `}
      style={{ borderTopWidth: "2px", borderTopColor: "#6b7280" }}
      onClick={() => selectNode(id)}
    >
      {/* Validation Error Indicator */}
      {hasErrors && (
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-amber-200 cursor-pointer">
            <AlertTriangle size={14} className="text-amber-500" />
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute top-7 left-1/2 -translate-x-1/2 z-50 w-52">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2.5">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  Issues:
                </p>
                <ul className="space-y-1">
                  {errors.map((error, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-amber-600 flex items-start gap-1.5"
                    >
                      <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 pt-4 pb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100">
          <NodeIcon
            name={data.icon || "more-horizontal"}
            size={14}
            className="text-gray-600"
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

      {/* Utility indicator */}
      <div className="mx-2 mb-2 px-2 py-1 bg-gray-50 rounded border border-gray-100">
        <span className="text-[9px] text-gray-500 font-medium">
          Utility node
        </span>
      </div>

      {/* Actions */}
      <div
        className={`
          absolute -top-6 right-0 flex gap-0.5 transition-opacity duration-150
          opacity-0 group-hover:opacity-100
          ${selected ? "opacity-100" : ""}
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
        id="input"
        className="!w-2.5 !h-2.5 !bg-gray-300 !border-2 !border-white transition-colors hover:!bg-gray-500"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-2.5 !h-2.5 !bg-gray-500 !border-2 !border-white transition-colors"
      />
    </div>
  );
}

export const OthersNode = memo(OthersNodeComponent);
