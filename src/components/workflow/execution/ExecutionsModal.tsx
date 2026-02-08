import { useState, useEffect } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Execution {
  id: string;
  status: string;
  triggerData: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ExecutionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

export function ExecutionsModal({
  isOpen,
  onClose,
  workflowId,
  workflowName,
}: ExecutionsModalProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/executions?limit=${pageSize}&offset=${page * pageSize}`,
      );
      const data = await res.json();
      if (res.ok) {
        setExecutions(data.executions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch executions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExecutions();
    }
  }, [isOpen, page, workflowId]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return "In progress";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          color: "text-emerald-500",
          bg: "bg-emerald-50",
          label: "Completed",
        };
      case "failed":
        return {
          icon: XCircle,
          color: "text-red-500",
          bg: "bg-red-50",
          label: "Failed",
        };
      case "running":
        return {
          icon: Loader2,
          color: "text-blue-500",
          bg: "bg-blue-50",
          label: "Running",
        };
      default:
        return {
          icon: Clock,
          color: "text-amber-500",
          bg: "bg-amber-50",
          label: "Pending",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Execution History
            </h2>
            <p className="text-sm text-gray-500">{workflowName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchExecutions}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw
                size={18}
                className={`text-gray-500 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <Link
              to="/app/workflow/$id/executions"
              params={{ id: workflowId }}
              search={{ executionId: undefined }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              View All
              <ExternalLink size={14} />
            </Link>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && executions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No executions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Run your workflow to see execution history
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((execution) => {
                const statusConfig = getStatusConfig(execution.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <Link
                    key={execution.id}
                    to="/app/workflow/$id/executions"
                    params={{ id: workflowId }}
                    search={{ executionId: execution.id }}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                          <StatusIcon
                            size={18}
                            className={`${statusConfig.color} ${
                              execution.status === "running"
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {statusConfig.label}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {execution.id.slice(0, 8)}...
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(execution.startedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {getDuration(
                            execution.startedAt,
                            execution.completedAt,
                          )}
                        </p>
                        {execution.error && (
                          <p className="text-xs text-red-500 truncate max-w-48">
                            {execution.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <p className="text-sm text-gray-500">
              Showing {page * pageSize + 1}-
              {Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
