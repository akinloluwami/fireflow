import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";

function WorkflowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  sourceHandleId,
}: EdgeProps) {
  const { removeEdge, selectEdge } = useWorkflowStore();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge color based on source handle (for conditions)
  let edgeColor = "#94a3b8"; // Default gray
  if (sourceHandleId === "true") {
    edgeColor = "#10b981"; // Green for true
  } else if (sourceHandleId === "false") {
    edgeColor = "#ef4444"; // Red for false
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeEdge(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#3b82f6" : edgeColor,
          strokeWidth: selected ? 3 : 2,
          transition: "stroke 0.2s, stroke-width 0.2s",
        }}
        interactionWidth={20}
      />

      {/* Animated flow indicator */}
      <circle r="4" fill={edgeColor}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>

      {/* Delete button on hover/select */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleDelete}
            className={`
              p-1.5 rounded-full bg-white shadow-lg border border-gray-200
              transition-all duration-150 hover:bg-red-50 hover:border-red-200
              ${selected ? "opacity-100 scale-100" : "opacity-0 scale-90 hover:opacity-100 hover:scale-100"}
            `}
            title="Delete connection"
          >
            <X size={12} className="text-red-500" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const WorkflowEdge = memo(WorkflowEdgeComponent);
