import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Execution {
  id: string;
  status: string;
  triggerData: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface NodeExecution {
  id: string;
  nodeId: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: string | null;
}

export const Route = createFileRoute("/app_/workflow/$id/executions")({
  head: () => ({
    meta: [{ title: "Executions | FireFlow" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    executionId: search.executionId as string | undefined,
  }),
  component: ExecutionsPage,
});

function ExecutionsPage() {
  const { id: workflowId } = Route.useParams();
  const { executionId: selectedExecutionId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const [workflowName, setWorkflowName] = useState("Workflow");
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(
    null,
  );
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch workflow name
  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const res = await fetch(`/api/workflows/${workflowId}`);
        if (res.ok) {
          const data = await res.json();
          setWorkflowName(data.name);
        }
      } catch (error) {
        console.error("Failed to fetch workflow:", error);
      }
    }
    if (session?.user) {
      fetchWorkflow();
    }
  }, [workflowId, session?.user]);

  // Fetch executions list
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

        // Auto-select first execution or the one from URL
        if (data.executions.length > 0 && !selectedExecution) {
          const toSelect = selectedExecutionId
            ? data.executions.find(
                (e: Execution) => e.id === selectedExecutionId,
              ) || data.executions[0]
            : data.executions[0];
          setSelectedExecution(toSelect);
        }
      }
    } catch (error) {
      console.error("Failed to fetch executions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchExecutions();
    }
  }, [session?.user, page, workflowId]);

  // Fetch execution details when selected
  useEffect(() => {
    if (!selectedExecution) {
      setNodeExecutions([]);
      return;
    }

    async function fetchDetails() {
      setIsLoadingDetails(true);
      try {
        const res = await fetch(`/api/executions/${selectedExecution!.id}`);
        const data = await res.json();
        if (res.ok && data.nodeExecutions) {
          setNodeExecutions(data.nodeExecutions);
        }
      } catch (error) {
        console.error("Failed to fetch execution details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }

    fetchDetails();
  }, [selectedExecution?.id]);

  // Auth redirect
  useEffect(() => {
    if (!isAuthPending && !session?.user) {
      navigate({ to: "/" });
    }
  }, [isAuthPending, session, navigate]);

  if (isAuthPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return "In progress";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-500",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          label: "Completed",
        };
      case "failed":
        return {
          icon: XCircle,
          color: "text-red-500",
          bg: "bg-red-50",
          border: "border-red-200",
          label: "Failed",
        };
      case "running":
        return {
          icon: Loader2,
          color: "text-blue-500",
          bg: "bg-blue-50",
          border: "border-blue-200",
          label: "Running",
        };
      case "skipped":
        return {
          icon: ChevronRight,
          color: "text-gray-400",
          bg: "bg-gray-50",
          border: "border-gray-200",
          label: "Skipped",
        };
      default:
        return {
          icon: Clock,
          color: "text-amber-500",
          bg: "bg-amber-50",
          border: "border-amber-200",
          label: "Pending",
        };
    }
  };

  const toggleNode = (nodeId: string) => {
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

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Executions List */}
          <div className="w-1/3 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-gray-700">
                {total} Execution{total !== 1 ? "s" : ""}
              </h2>
              <button
                onClick={fetchExecutions}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No executions yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {executions.map((execution) => {
                    const statusConfig = getStatusConfig(execution.status);
                    const StatusIcon = statusConfig.icon;
                    const isSelected = selectedExecution?.id === execution.id;

                    return (
                      <button
                        key={execution.id}
                        onClick={() => setSelectedExecution(execution)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? `${statusConfig.border} ${statusConfig.bg} shadow-sm`
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon
                            size={16}
                            className={`${statusConfig.color} ${
                              execution.status === "running"
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {statusConfig.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(execution.startedAt)}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {getDuration(
                              execution.startedAt,
                              execution.completedAt,
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Execution Details */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {!selectedExecution ? (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">
                  Select an execution to view details
                </p>
              </div>
            ) : (
              <>
                {/* Details Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Execution Details
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {selectedExecution.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {formatDate(selectedExecution.startedAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Duration:{" "}
                        {getDuration(
                          selectedExecution.startedAt,
                          selectedExecution.completedAt,
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedExecution.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Error</p>
                      <p className="text-sm text-red-600 mt-1">
                        {selectedExecution.error}
                      </p>
                    </div>
                  )}
                </div>

                {/* Node Executions */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Node Executions
                  </h4>

                  {isLoadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : nodeExecutions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No node execution data available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {nodeExecutions.map((nodeExec) => {
                        const statusConfig = getStatusConfig(nodeExec.status);
                        const StatusIcon = statusConfig.icon;
                        const isExpanded = expandedNodes.has(nodeExec.id);

                        return (
                          <div
                            key={nodeExec.id}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <button
                              onClick={() => toggleNode(nodeExec.id)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                            >
                              <StatusIcon
                                size={14}
                                className={`${statusConfig.color} ${
                                  nodeExec.status === "running"
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                              <span className="flex-1 text-left text-sm font-medium text-gray-900">
                                {nodeExec.nodeId}
                              </span>
                              <span className="text-xs text-gray-500">
                                {nodeExec.duration || "-"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp
                                  size={14}
                                  className="text-gray-400"
                                />
                              ) : (
                                <ChevronDown
                                  size={14}
                                  className="text-gray-400"
                                />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
                                {nodeExec.error && (
                                  <div className="mt-3 p-2 bg-red-50 rounded-md">
                                    <p className="text-xs font-medium text-red-700">
                                      Error
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">
                                      {nodeExec.error}
                                    </p>
                                  </div>
                                )}
                                {nodeExec.input !== null &&
                                  nodeExec.input !== undefined && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-gray-600 mb-1">
                                        Input
                                      </p>
                                      <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-x-auto max-h-32">
                                        {JSON.stringify(
                                          nodeExec.input,
                                          null,
                                          2,
                                        )}
                                      </pre>
                                    </div>
                                  )}
                                {nodeExec.output !== null &&
                                  nodeExec.output !== undefined && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-gray-600 mb-1">
                                        Output
                                      </p>
                                      <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-x-auto max-h-32">
                                        {JSON.stringify(
                                          nodeExec.output,
                                          null,
                                          2,
                                        )}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
