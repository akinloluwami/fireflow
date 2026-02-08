import { useState } from "react";
import {
  X,
  Play,
  Square,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { NodeExecutionStatus } from "@/lib/workflow/types";

interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: () => void;
  onStop?: () => void;
  isWaitingForTrigger?: boolean;
}

const statusConfig: Record<
  NodeExecutionStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  idle: {
    icon: Clock,
    color: "text-gray-400",
    bg: "bg-gray-100",
    label: "Idle",
  },
  pending: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    label: "Pending",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-50",
    label: "Running",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    label: "Success",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    label: "Failed",
  },
  skipped: {
    icon: ChevronRight,
    color: "text-gray-400",
    bg: "bg-gray-50",
    label: "Skipped",
  },
};

export function ExecutionPanel({
  isOpen,
  onClose,
  onRun,
  onStop,
  isWaitingForTrigger,
}: ExecutionPanelProps) {
  const { workflow, execution, resetExecution } = useWorkflowStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Get execution duration
  const getDuration = () => {
    if (!execution.startedAt) return null;
    const end = execution.completedAt || new Date();
    const ms = end.getTime() - execution.startedAt.getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Count statuses
  const statusCounts = {
    success: Object.values(execution.nodeStatuses).filter(
      (s) => s === "success",
    ).length,
    failed: Object.values(execution.nodeStatuses).filter((s) => s === "failed")
      .length,
    skipped: Object.values(execution.nodeStatuses).filter(
      (s) => s === "skipped",
    ).length,
    pending: Object.values(execution.nodeStatuses).filter(
      (s) => s === "pending",
    ).length,
    running: Object.values(execution.nodeStatuses).filter(
      (s) => s === "running",
    ).length,
  };

  // Sort nodes by execution order - trigger first, then by workflow order
  const orderedNodes = [...workflow.nodes].sort((a, b) => {
    // Trigger always comes first
    if (a.type === "trigger") return -1;
    if (b.type === "trigger") return 1;

    // Then sort by status - running/completed before pending/idle
    const statusOrder: Record<NodeExecutionStatus, number> = {
      running: 0,
      success: 1,
      failed: 2,
      pending: 3,
      skipped: 4,
      idle: 5,
    };
    const statusA = execution.nodeStatuses[a.id] || "idle";
    const statusB = execution.nodeStatuses[b.id] || "idle";
    return statusOrder[statusA] - statusOrder[statusB];
  });

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-gray-400" />
          <h3 className="text-sm font-normal text-gray-500">Last Execution</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        {execution.isRunning || isWaitingForTrigger ? (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            <Play size={14} />
            Run
          </button>
        )}
        {(execution.executionId ||
          Object.keys(execution.nodeStatuses).length > 0) && (
          <button
            onClick={resetExecution}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>

      {/* Status Summary */}
      {execution.startedAt && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Duration</span>
            <span className="font-medium text-gray-800">{getDuration()}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            {statusCounts.success > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={12} /> {statusCounts.success}
              </span>
            )}
            {statusCounts.failed > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle size={12} /> {statusCounts.failed}
              </span>
            )}
            {statusCounts.running > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 size={12} className="animate-spin" />{" "}
                {statusCounts.running}
              </span>
            )}
            {statusCounts.pending > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock size={12} /> {statusCounts.pending}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {orderedNodes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No nodes in workflow
          </div>
        ) : !execution.startedAt && !isWaitingForTrigger ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Click "Run" to execute the workflow
          </div>
        ) : isWaitingForTrigger ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-50 rounded-full mb-3">
              <Loader2 size={24} className="text-amber-500 animate-spin" />
            </div>
            <p className="text-gray-700 font-medium mb-1">
              Waiting for trigger event...
            </p>
            <p className="text-gray-500 text-xs">
              Send a request to the webhook URL to trigger this workflow
            </p>
          </div>
        ) : (
          <div className="p-2">
            {orderedNodes.map((node) => {
              const status = execution.nodeStatuses[node.id] || "idle";
              const config = statusConfig[status];
              const StatusIcon = config.icon;
              const output = execution.nodeOutputs[node.id];
              const error = execution.nodeErrors[node.id];
              const isExpanded = expandedNodes.has(node.id);
              const hasDetails = output !== undefined || error;

              return (
                <div
                  key={node.id}
                  className={`
                    mb-2 rounded-lg border transition-colors
                    ${status === "running" ? "border-blue-200 bg-blue-50/50" : "border-gray-200"}
                  `}
                >
                  <button
                    onClick={() => hasDetails && toggleNodeExpanded(node.id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                    disabled={!hasDetails}
                  >
                    <div className={`p-1.5 rounded-lg ${config.bg}`}>
                      <StatusIcon
                        size={14}
                        className={`${config.color} ${status === "running" ? "animate-spin" : ""}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {node.data.label}
                      </p>
                      <p className="text-xs text-gray-500">{node.subType}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
                    >
                      {config.label}
                    </span>
                    {hasDetails &&
                      (isExpanded ? (
                        <ChevronDown size={14} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400" />
                      ))}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && hasDetails && (
                    <div className="px-3 pb-3 pt-0">
                      {error && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-md mb-2">
                          <p className="text-xs font-medium text-red-700 mb-1">
                            Error
                          </p>
                          <p className="text-xs text-red-600 font-mono break-all">
                            {error}
                          </p>
                        </div>
                      )}
                      {output !== undefined && (
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            Output
                          </p>
                          <pre className="text-xs text-gray-600 font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {typeof output === "object"
                              ? JSON.stringify(output, null, 2)
                              : String(output)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
