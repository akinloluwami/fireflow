import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeIcon } from "../icons";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  Trash2,
  Copy,
  GitBranch,
  Check,
  X,
  AlertTriangle,
  Repeat,
  ArrowRight,
  CornerDownRight,
} from "lucide-react";
import type { NodeData, ConditionSubType } from "@/lib/workflow/types";

interface SwitchCase {
  id: string;
  value: string;
  label?: string;
}

interface ConditionNodeProps {
  id: string;
  data: NodeData & { icon?: string; subType?: ConditionSubType };
  selected?: boolean;
}

function ConditionNodeComponent({ id, data, selected }: ConditionNodeProps) {
  const { removeNode, duplicateNode, selectNode, nodeErrors } =
    useWorkflowStore();
  const [showTooltip, setShowTooltip] = useState(false);

  const errors = nodeErrors[id] || [];
  const hasErrors = errors.length > 0;
  const subType = data.subType || "if-else";

  // For switch nodes, get the cases from config (using type assertion for dynamic config)
  const configAny = data.config as Record<string, unknown> | undefined;
  const switchCases = (configAny?.cases as SwitchCase[] | undefined) || [];
  const hasDefault = (configAny?.hasDefault as boolean) || false;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateNode(id);
  };

  // Render branch indicators based on subType
  const renderBranchIndicators = () => {
    if (subType === "loop") {
      return (
        <div className="mx-2 mb-2 space-y-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded border border-amber-100">
            <Repeat size={10} className="text-amber-600" />
            <span className="text-[9px] text-amber-600 font-medium">
              Each Item
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded border border-blue-100">
            <ArrowRight size={10} className="text-blue-500" />
            <span className="text-[9px] text-blue-500 font-medium">Done</span>
          </div>
        </div>
      );
    }

    if (subType === "switch") {
      const displayCases = switchCases.slice(0, 3);
      const remainingCount = switchCases.length - 3;

      return (
        <div className="mx-2 mb-2 space-y-1">
          {displayCases.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 rounded border border-purple-100"
            >
              <CornerDownRight size={10} className="text-purple-500" />
              <span className="text-[9px] text-purple-600 font-medium truncate">
                {c.label || c.value || `Case ${i + 1}`}
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded border border-gray-200">
              <span className="text-[9px] text-gray-500 font-medium">
                +{remainingCount} more
              </span>
            </div>
          )}
          {hasDefault && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
              <ArrowRight size={10} className="text-gray-500" />
              <span className="text-[9px] text-gray-600 font-medium">
                Default
              </span>
            </div>
          )}
        </div>
      );
    }

    // Default: if-else
    return (
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
    );
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

      {/* Branch indicators - dynamic based on subType */}
      {renderBranchIndicators()}

      {/* Validation Error Indicator */}
      {hasErrors && (
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-red-200 cursor-pointer">
            <AlertTriangle size={14} className="text-red-500" />
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute top-7 left-1/2 -translate-x-1/2 z-50 w-52">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2.5">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  Issues:
                </p>
                <ul className="text-[11px] text-gray-600 space-y-1">
                  {errors.map((error, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-red-400">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Output Handles - dynamic based on subType */}
      {subType === "loop" && (
        <>
          {/* Body handle - for each iteration */}
          <Handle
            type="source"
            position={Position.Right}
            id="body"
            className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white transition-colors"
            style={{ top: "40%" }}
          />
          {/* Done handle - after loop completes */}
          <Handle
            type="source"
            position={Position.Right}
            id="done"
            className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white transition-colors"
            style={{ top: "70%" }}
          />
        </>
      )}

      {subType === "switch" && (
        <>
          {/* Render handles for each case */}
          {switchCases.slice(0, 5).map((c, i) => (
            <Handle
              key={c.id}
              type="source"
              position={Position.Right}
              id={c.id}
              className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-white transition-colors"
              style={{ top: `${25 + i * 15}%` }}
            />
          ))}
          {/* Default handle if enabled */}
          {hasDefault && (
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white transition-colors"
              style={{ top: `${25 + Math.min(switchCases.length, 5) * 15}%` }}
            />
          )}
        </>
      )}

      {subType === "if-else" && (
        <>
          {/* True handle */}
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white transition-colors"
            style={{ top: "40%" }}
          />
          {/* False handle */}
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-white transition-colors"
            style={{ top: "70%" }}
          />
        </>
      )}
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
