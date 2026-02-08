import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Timer,
  Play,
  AlertCircle,
  SkipForward,
  Activity,
  Hash,
  ArrowRight,
  Copy,
  Check,
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
          bg: "bg-emerald-500",
          bgLight: "bg-emerald-50",
          border: "border-emerald-200",
          ring: "ring-emerald-500/20",
          label: "Completed",
        };
      case "failed":
        return {
          icon: XCircle,
          color: "text-red-500",
          bg: "bg-red-500",
          bgLight: "bg-red-50",
          border: "border-red-200",
          ring: "ring-red-500/20",
          label: "Failed",
        };
      case "running":
        return {
          icon: Play,
          color: "text-blue-500",
          bg: "bg-blue-500",
          bgLight: "bg-blue-50",
          border: "border-blue-200",
          ring: "ring-blue-500/20",
          label: "Running",
        };
      case "skipped":
        return {
          icon: SkipForward,
          color: "text-gray-400",
          bg: "bg-gray-400",
          bgLight: "bg-gray-50",
          border: "border-gray-200",
          ring: "ring-gray-400/20",
          label: "Skipped",
        };
      default:
        return {
          icon: Clock,
          color: "text-amber-500",
          bg: "bg-amber-500",
          bgLight: "bg-amber-50",
          border: "border-amber-200",
          ring: "ring-amber-500/20",
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

  const [copiedId, setCopiedId] = useState(false);
  const copyExecutionId = () => {
    if (selectedExecution) {
      navigator.clipboard.writeText(selectedExecution.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const completed = executions.filter(
      (e) => e.status === "completed" || e.status === "success",
    ).length;
    const failed = executions.filter((e) => e.status === "failed").length;
    const running = executions.filter((e) => e.status === "running").length;
    return { completed, failed, running };
  }, [executions]);

  // Format relative time
  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Executions List - Left Sidebar */}
      <div className="w-[340px] border-r border-gray-200/80 bg-white flex flex-col shadow-sm">
        {/* Stats Header */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/20">
                <Activity size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Executions</h2>
                <p className="text-xs text-gray-500">{total} runs total</p>
              </div>
            </div>
            <motion.button
              onClick={fetchExecutions}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-400 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
            </motion.button>
          </div>

          {/* Mini Stats */}
          {executions.length > 0 && (
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {stats.completed}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-0.5">Completed</p>
              </div>
              <div className="flex-1 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-1.5">
                  <XCircle size={12} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-700">
                    {stats.failed}
                  </span>
                </div>
                <p className="text-[10px] text-red-600 mt-0.5">Failed</p>
              </div>
              <div className="flex-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-1.5">
                  <Play size={12} className="text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">
                    {stats.running}
                  </span>
                </div>
                <p className="text-[10px] text-blue-600 mt-0.5">Running</p>
              </div>
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-accent/20"></div>
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Loading executions...
              </p>
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-inner">
                <Zap className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-700 font-medium">No executions yet</p>
              <p className="text-gray-400 text-sm text-center mt-1">
                Trigger your workflow to see execution history
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {executions.map((execution, index) => {
                const statusConfig = getStatusConfig(execution.status);
                const StatusIcon = statusConfig.icon;
                const isSelected = selectedExecution?.id === execution.id;

                return (
                  <motion.button
                    key={execution.id}
                    onClick={() => setSelectedExecution(execution)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full text-left p-3.5 rounded-xl transition-all relative overflow-hidden ${
                      isSelected
                        ? "bg-gradient-to-r from-accent to-accent/90 text-white shadow-lg shadow-accent/25"
                        : "bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    {/* Execution number badge */}
                    <div
                      className={`absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono ${
                        isSelected ? "text-white/50" : "text-gray-300"
                      }`}
                    >
                      <Hash size={10} />
                      {total - (page * pageSize + index)}
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? "bg-white/20"
                            : `${statusConfig.bgLight} ring-1 ${statusConfig.ring}`
                        }`}
                      >
                        <StatusIcon
                          size={16}
                          className={`${isSelected ? "text-white" : statusConfig.color} ${
                            execution.status === "running" ? "animate-spin" : ""
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}
                          >
                            {statusConfig.label}
                          </p>
                          {execution.status === "running" && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] font-medium text-blue-600">
                              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                              Live
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1 ${isSelected ? "text-white/70" : "text-gray-500"}`}
                        >
                          {getRelativeTime(execution.startedAt)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between mt-3 pt-2.5 border-t ${
                        isSelected ? "border-white/20" : "border-gray-100"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-xs ${isSelected ? "text-white/60" : "text-gray-400"}`}
                      >
                        <Timer size={12} />
                        <span>
                          {getDuration(
                            execution.startedAt,
                            execution.completedAt,
                          )}
                        </span>
                      </div>
                      <ArrowRight
                        size={14}
                        className={
                          isSelected ? "text-white/40" : "text-gray-300"
                        }
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <motion.button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              Prev
            </motion.button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    page === i
                      ? "bg-accent text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <motion.button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </motion.button>
          </div>
        )}
      </div>

      {/* Execution Details - Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedExecution ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-inner">
                  <Activity className="w-12 h-12 text-gray-300" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ArrowRight size={16} className="text-accent" />
                </div>
              </div>
              <p className="text-gray-700 font-semibold mt-6">
                Select an execution
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Click on an execution to view detailed trace
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedExecution.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-y-auto"
            >
              {/* Execution Header */}
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const statusConfig = getStatusConfig(
                        selectedExecution.status,
                      );
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div
                          className={`p-3 rounded-2xl ${statusConfig.bg} shadow-lg`}
                        >
                          <StatusIcon size={24} className="text-white" />
                        </div>
                      );
                    })()}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {getStatusConfig(selectedExecution.status).label}
                        </h3>
                        {selectedExecution.status === "running" && (
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            In Progress
                          </span>
                        )}
                      </div>
                      <button
                        onClick={copyExecutionId}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent font-mono mt-1 transition-colors"
                      >
                        {copiedId ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                        <span>
                          {selectedExecution.id.slice(0, 12)}...
                          {selectedExecution.id.slice(-6)}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedExecution.startedAt)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 justify-end">
                      <Timer size={14} />
                      <span className="font-mono">
                        {getDuration(
                          selectedExecution.startedAt,
                          selectedExecution.completedAt,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Error Banner */}
                {selectedExecution.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-2xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-xl flex-shrink-0">
                        <AlertCircle size={20} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-red-700">
                          Execution Failed
                        </p>
                        <p className="text-sm text-red-600 mt-1 font-mono break-all">
                          {selectedExecution.error}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      Execution Timeline
                    </h4>
                    <span className="px-2.5 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full">
                      {nodeExecutions.length} nodes
                    </span>
                  </div>

                  {isLoadingDetails ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-accent/20"></div>
                        <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
                      </div>
                    </div>
                  ) : nodeExecutions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No node execution data</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent"></div>

                      <div className="space-y-3">
                        {nodeExecutions.map((nodeExec, index) => {
                          const statusConfig = getStatusConfig(nodeExec.status);
                          const StatusIcon = statusConfig.icon;
                          const isExpanded = expandedNodes.has(nodeExec.id);

                          return (
                            <motion.div
                              key={nodeExec.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="relative"
                            >
                              {/* Timeline dot */}
                              <div
                                className={`absolute left-0 top-4 w-[46px] flex justify-center z-10`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full ${statusConfig.bg} ring-4 ring-white shadow`}
                                ></div>
                              </div>

                              <div className="ml-14">
                                <div
                                  className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
                                    isExpanded
                                      ? "shadow-lg border-gray-200"
                                      : "border-gray-100 hover:shadow-md hover:border-gray-200"
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleNode(nodeExec.id)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors"
                                  >
                                    <div
                                      className={`p-2.5 rounded-xl ${statusConfig.bgLight}`}
                                    >
                                      <StatusIcon
                                        size={18}
                                        className={`${statusConfig.color} ${
                                          nodeExec.status === "running"
                                            ? "animate-spin"
                                            : ""
                                        }`}
                                      />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <p className="font-semibold text-gray-900">
                                        {nodeExec.nodeId}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {statusConfig.label}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {nodeExec.duration && (
                                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2.5 py-1 rounded-lg">
                                          {nodeExec.duration}
                                        </span>
                                      )}
                                      <motion.div
                                        animate={{
                                          rotate: isExpanded ? 180 : 0,
                                        }}
                                        className="p-1 rounded-lg bg-gray-100"
                                      >
                                        <ChevronDown
                                          size={16}
                                          className="text-gray-500"
                                        />
                                      </motion.div>
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                                          {nodeExec.error && (
                                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                              <p className="text-xs font-semibold text-red-700 mb-1.5">
                                                Error Message
                                              </p>
                                              <p className="text-xs text-red-600 font-mono bg-red-100/50 p-2 rounded-lg">
                                                {nodeExec.error}
                                              </p>
                                            </div>
                                          )}

                                          <div className="grid grid-cols-2 gap-4">
                                            {nodeExec.input !== null &&
                                              nodeExec.input !== undefined && (
                                                <div>
                                                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    Input
                                                  </p>
                                                  <pre className="text-xs bg-gray-900 text-emerald-400 p-4 rounded-xl overflow-x-auto max-h-56 font-mono scrollbar-thin">
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
                                                <div>
                                                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    Output
                                                  </p>
                                                  <pre className="text-xs bg-gray-900 text-emerald-400 p-4 rounded-xl overflow-x-auto max-h-56 font-mono scrollbar-thin">
                                                    {JSON.stringify(
                                                      nodeExec.output,
                                                      null,
                                                      2,
                                                    )}
                                                  </pre>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
