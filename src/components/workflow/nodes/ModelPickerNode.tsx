import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Trash2, Copy, AlertTriangle, Sparkles } from "lucide-react";
import { SiOpenai, SiGooglegemini, SiVercel } from "react-icons/si";
import { XAIIcon } from "@/components/icons/xai";
import type {
  NodeData,
  ModelPickerNodeConfig,
  AIProvider,
} from "@/lib/workflow/types";

interface ModelPickerNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

// Provider icon component
function ProviderIcon({
  provider,
  size = 24,
}: {
  provider?: AIProvider;
  size?: number;
}) {
  switch (provider) {
    case "openai":
      return <SiOpenai size={size} className="text-white" />;
    case "xai":
      return <XAIIcon size={size} className="text-white" />;
    case "gemini":
      return <SiGooglegemini size={size} className="text-white" />;
    case "vercel-ai-gateway":
      return <SiVercel size={size} className="text-white" />;
    default:
      return <Sparkles size={size} className="text-gray-400" />;
  }
}

function ModelPickerNodeComponent({
  id,
  data,
  selected,
}: ModelPickerNodeProps) {
  const { removeNode, duplicateNode, selectNode, nodeErrors } =
    useWorkflowStore();
  const [showActions, setShowActions] = useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);

  const errors = nodeErrors[id] || [];
  const hasErrors = errors.length > 0;

  const modelConfig = data.config as ModelPickerNodeConfig;
  const provider = modelConfig?.provider;

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

      {/* Model Output Handle (top) - connects to AI nodes */}
      <Handle
        type="source"
        position={Position.Top}
        id="model"
        className="!w-2.5 !h-2.5 !rotate-45 !bg-gray-500 !border !border-gray-600 !rounded-none !-top-1"
      />

      {/* Main Node Body - smaller circular style */}
      <div
        className={`
          relative w-[56px] h-[56px] 
          flex items-center justify-center
          transition-all duration-150 cursor-pointer
          bg-gray-700 shadow-sm rounded-full
          ${selected ? "ring-2 ring-offset-2 ring-offset-gray-50 ring-gray-500 shadow-md" : "hover:shadow-md"}
        `}
      >
        {/* Provider Icon */}
        <div className="flex items-center justify-center">
          <ProviderIcon provider={provider} size={24} />
        </div>

        {/* Validation Errors */}
        {hasErrors && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full 
                          flex items-center justify-center border-2 border-white shadow-sm cursor-help"
            onMouseEnter={() => setShowErrorTooltip(true)}
            onMouseLeave={() => setShowErrorTooltip(false)}
          >
            <AlertTriangle size={8} className="text-white" />

            {/* Error Tooltip */}
            {showErrorTooltip && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 w-40">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                  <p className="text-[10px] font-medium text-gray-700 mb-1">
                    Issues:
                  </p>
                  <ul className="text-[10px] text-gray-600 space-y-0.5">
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
      <div className="mt-1.5 text-center max-w-[100px]">
        <p className="text-[10px] font-medium text-gray-600 truncate">
          {data.label}
        </p>
      </div>
    </div>
  );
}

export const ModelPickerNode = memo(ModelPickerNodeComponent);
