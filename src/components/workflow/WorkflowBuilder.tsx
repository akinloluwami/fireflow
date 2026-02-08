import { useState, useEffect, useRef, useCallback } from "react";
import { TamboProvider } from "@tambo-ai/react";
import { ReactFlowProvider } from "@xyflow/react";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { WorkflowChat } from "./WorkflowChat";
import { ChatThreadSync } from "./ChatThreadSync";
import { ExecutionPanel } from "./execution";
import { useWorkflowStore } from "@/lib/workflow/store";
import { workflowComponents } from "@/lib/workflow/tambo-components";
import { workflowTools } from "@/lib/workflow/tambo-tools";
import { nodeDefinitions } from "@/lib/workflow/node-definitions";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Rocket,
  Pause,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  Activity,
  ChevronDown,
  MousePointer,
  Webhook,
  Clock,
} from "lucide-react";
import { TallyIcon } from "@/components/icons/tally";

interface WorkflowBuilderProps {
  tamboApiKey: string;
  workflowId?: string;
}

interface ExecutionResult {
  status: "success" | "failed";
  executionId: string;
  message?: string;
}

export function WorkflowBuilder({
  tamboApiKey,
  workflowId,
}: WorkflowBuilderProps) {
  const {
    workflow,
    selectedNodeId,
    isPanelOpen,
    isChatOpen,
    togglePanel,
    toggleChat,
    undo,
    redo,
    history,
    historyIndex,
    validateNodes,
    hasValidationErrors,
    execution,
    startExecution,
    updateNodeStatus,
    setExecutionComplete,
  } = useWorkflowStore();

  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isWaitingForTrigger, setIsWaitingForTrigger] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutionIdRef = useRef<string | null>(null);

  // Multiple trigger support
  const [selectedTriggerId, setSelectedTriggerId] = useState<string | null>(
    null,
  );
  const [showTriggerDropdown, setShowTriggerDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowTriggerDropdown(false);
      }
    };
    if (showTriggerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTriggerDropdown]);

  // Config panel resizing
  const [configPanelWidth, setConfigPanelWidth] = useState(320);
  const isResizingRef = useRef(false);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex >= 0) {
          undo();
        }
      }

      // Redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          redo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, historyIndex, history.length]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;

      const startX = e.clientX;
      const startWidth = configPanelWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = startX - e.clientX;
        const newWidth = Math.min(Math.max(startWidth + delta, 280), 600);
        setConfigPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [configPanelWidth],
  );

  // Validate nodes whenever the workflow changes
  useEffect(() => {
    validateNodes();
  }, [workflow.nodes, validateNodes]);

  // Get all trigger nodes
  const triggerNodes = workflow.nodes.filter((n) => n.type === "trigger");

  // Auto-select first trigger if none selected or selected one was deleted
  useEffect(() => {
    if (triggerNodes.length > 0) {
      const selectedExists = triggerNodes.some(
        (t) => t.id === selectedTriggerId,
      );
      if (!selectedTriggerId || !selectedExists) {
        setSelectedTriggerId(triggerNodes[0].id);
      }
    } else {
      setSelectedTriggerId(null);
    }
  }, [triggerNodes, selectedTriggerId]);

  // Get the currently selected trigger
  const selectedTrigger = triggerNodes.find((t) => t.id === selectedTriggerId);
  const requiresExternalTrigger =
    selectedTrigger?.subType === "webhook" ||
    selectedTrigger?.subType === "form-submission";

  // Check if there are validation errors
  const hasErrors = hasValidationErrors();

  // Poll for webhook/form trigger events when waiting
  useEffect(() => {
    if (!isWaitingForTrigger || !workflowId) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Capture the current latest execution ID so we can detect new ones
    const captureInitialExecution = async () => {
      try {
        const res = await fetch(
          `/api/workflows/${workflowId}/executions/latest`,
        );
        const data = await res.json();
        lastExecutionIdRef.current = data.execution?.id || null;
      } catch {
        lastExecutionIdRef.current = null;
      }
    };
    captureInitialExecution();

    // Poll for new executions (triggered by webhook)
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/workflows/${workflowId}/executions/latest`,
        );
        const data = await res.json();

        if (data.execution) {
          const exec = data.execution;
          const isNewExecution = exec.id !== lastExecutionIdRef.current;

          if (isNewExecution) {
            // New execution detected from webhook!
            lastExecutionIdRef.current = exec.id;
            startExecution(exec.id);
            setIsWaitingForTrigger(false);
            setIsExecuting(true); // Show "Executing..." state

            // Reset node statuses - the regular execution polling will take over
            workflow.nodes.forEach((node) => {
              updateNodeStatus(node.id, "idle");
            });
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [
    isWaitingForTrigger,
    workflowId,
    workflow.nodes,
    startExecution,
    updateNodeStatus,
  ]);

  // Poll execution API for real-time node status updates
  const executionPollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only poll when we have an active execution
    if (!execution.isRunning || !execution.executionId) {
      if (executionPollingRef.current) {
        clearInterval(executionPollingRef.current);
        executionPollingRef.current = null;
      }
      return;
    }

    const pollExecution = async () => {
      try {
        const res = await fetch(`/api/executions/${execution.executionId}`);
        if (!res.ok) return;

        const data = await res.json();

        // Update node statuses from API
        if (data.nodeStatuses) {
          for (const [nodeId, status] of Object.entries(data.nodeStatuses)) {
            const output = data.nodeOutputs?.[nodeId];
            const error = data.nodeErrors?.[nodeId];
            updateNodeStatus(
              nodeId,
              status as
                | "idle"
                | "pending"
                | "running"
                | "success"
                | "failed"
                | "skipped",
              output,
              error,
            );
          }
        }

        // Check if execution completed
        if (
          data.execution?.status === "completed" ||
          data.execution?.status === "failed"
        ) {
          // Only show result once - check if we're still in running state
          if (execution.isRunning) {
            setExecutionComplete(data.execution.status === "completed");
            setIsExecuting(false);

            setExecutionResult({
              status:
                data.execution.status === "completed" ? "success" : "failed",
              executionId: data.execution.id,
              message:
                data.execution.status === "completed"
                  ? "Workflow executed successfully!"
                  : data.execution.error || "Workflow execution failed",
            });
            setTimeout(() => setExecutionResult(null), 5000);
          }
        }
      } catch (error) {
        console.error("Execution polling error:", error);
      }
    };

    // Poll immediately, then every 500ms
    pollExecution();
    executionPollingRef.current = setInterval(pollExecution, 500);

    return () => {
      if (executionPollingRef.current) {
        clearInterval(executionPollingRef.current);
        executionPollingRef.current = null;
      }
    };
  }, [
    execution.isRunning,
    execution.executionId,
    updateNodeStatus,
    setExecutionComplete,
  ]);

  const handlePublish = async () => {
    if (!workflowId) return;
    setIsPublishing(true);
    try {
      const newStatus = workflow.status === "active" ? "draft" : "active";
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflow.name,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
          status: newStatus,
        }),
      });
      if (res.ok) {
        useWorkflowStore.getState().setWorkflow({
          ...workflow,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error("Failed to publish workflow:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExecute = async () => {
    if (!workflowId || hasErrors) return;

    // For webhook/form triggers, wait for actual event instead of executing immediately
    if (requiresExternalTrigger) {
      if (isWaitingForTrigger) {
        // Stop waiting
        setIsWaitingForTrigger(false);
        workflow.nodes.forEach((node) => {
          updateNodeStatus(node.id, "idle");
        });

        // Revert to draft if in testing mode
        if (workflow.status === "testing") {
          try {
            await fetch(`/api/workflows/${workflowId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: workflow.name,
                description: workflow.description,
                nodes: workflow.nodes,
                edges: workflow.edges,
                status: "draft",
              }),
            });
            useWorkflowStore.getState().setWorkflow({
              ...workflow,
              status: "draft",
            });
          } catch (error) {
            console.error("Failed to revert workflow status:", error);
          }
        }
        return;
      }

      // Start waiting for trigger event - set workflow to "testing" mode
      if (workflow.status !== "active") {
        try {
          const res = await fetch(`/api/workflows/${workflowId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: workflow.name,
              description: workflow.description,
              nodes: workflow.nodes,
              edges: workflow.edges,
              status: "testing",
            }),
          });
          if (res.ok) {
            useWorkflowStore.getState().setWorkflow({
              ...workflow,
              status: "testing",
            });
          }
        } catch (error) {
          console.error("Failed to set testing status:", error);
          return;
        }
      }

      // Show visual feedback - selected trigger node is pending, waiting for event
      if (selectedTrigger) {
        updateNodeStatus(selectedTrigger.id, "pending");
      }

      setIsWaitingForTrigger(true);
      return;
    }

    // For manual/schedule triggers, execute immediately
    setIsExecuting(true);

    try {
      const res = await fetch(`/api/workflows/${workflowId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testData: {},
          triggerId: selectedTriggerId, // Pass the selected trigger to start from
        }),
      });
      const data = await res.json();

      if (res.ok && data.executionId) {
        // Start execution with real ID - polling will handle updates
        startExecution(data.executionId);
      } else {
        // Execution failed to start
        setIsExecuting(false);
        setExecutionResult({
          status: "failed",
          executionId: data.executionId || "",
          message: data.error || "Execution failed to start",
        });
        setTimeout(() => setExecutionResult(null), 5000);
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      setIsExecuting(false);
      setExecutionResult({
        status: "failed",
        executionId: "",
        message: "Failed to execute workflow",
      });
      setTimeout(() => setExecutionResult(null), 5000);
    }
  };

  // Context helper for Tambo - provides current workflow state
  const contextHelpers = {
    currentWorkflow: () => ({
      name: workflow.name,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
      nodes: workflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        subType: n.subType,
        label: n.data.label,
      })),
    }),
    availableNodes: () =>
      nodeDefinitions.map((def) => ({
        type: def.type,
        subType: def.subType,
        label: def.label,
        description: def.description,
      })),
  };

  return (
    <TamboProvider
      apiKey={tamboApiKey}
      components={workflowComponents}
      tools={workflowTools}
      contextHelpers={contextHelpers}
    >
      <ChatThreadSync />
      <ReactFlowProvider>
        <div className="flex flex-col h-full bg-gray-50">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 z-10">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  workflow.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {workflow.status === "active" ? "Live" : "Draft"}
              </span>

              <button
                onClick={handlePublish}
                disabled={
                  isPublishing ||
                  workflow.nodes.length === 0 ||
                  (workflow.status !== "active" && hasErrors)
                }
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  workflow.status === "active"
                    ? "text-orange-600 border border-orange-200 hover:bg-orange-50"
                    : hasErrors
                      ? "bg-gray-400 text-white"
                      : "text-white bg-green-600 hover:bg-green-700"
                }`}
                title={
                  hasErrors && workflow.status !== "active"
                    ? "Fix node configuration errors before publishing"
                    : undefined
                }
              >
                {workflow.status === "active" ? (
                  <>
                    <Pause size={14} />
                    {isPublishing ? "Pausing..." : "Pause"}
                  </>
                ) : (
                  <>
                    <Rocket size={14} />
                    {isPublishing ? "Publishing..." : "Publish"}
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Execution status */}
              {executionResult && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg ${
                    executionResult.status === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {executionResult.status === "success" ? (
                    <CheckCircle size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}
                  <span className="truncate max-w-40">
                    {executionResult.message}
                  </span>
                </div>
              )}

              {/* Execution panel toggle */}
              <div className="relative group/tooltip">
                <button
                  onClick={() => setIsExecutionPanelOpen(!isExecutionPanelOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    isExecutionPanelOpen
                      ? "bg-accent text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <Activity size={16} />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all delay-500 pointer-events-none z-50">
                  Last Execution
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
                </div>
              </div>

              <div className="w-px h-5 bg-gray-200" />

              {/* AI Chat toggle */}
              <button
                onClick={toggleChat}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isChatOpen
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Sparkles size={14} />
                AI Assistant
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div
              className={`
                shrink-0 transition-all duration-300 ease-in-out overflow-hidden bg-white border-r border-gray-200
                ${isPanelOpen ? "w-60" : "w-0"}
              `}
            >
              <NodePalette />
            </div>

            <button
              onClick={togglePanel}
              className="shrink-0 w-4 flex items-center justify-center bg-gray-50 
                         hover:bg-gray-100 border-r border-gray-200 transition-colors"
            >
              {isPanelOpen ? (
                <ChevronLeft size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )}
            </button>

            <div className="flex-1 relative bg-[#fafafa]">
              <WorkflowCanvas />

              <div className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  {
                    workflow.nodes.filter((n) => n.type === "trigger").length
                  }{" "}
                  triggers
                </span>
                <span className="text-gray-200">•</span>
                <span>{workflow.nodes.length} nodes</span>
                <span className="text-gray-200">•</span>
                <span>{workflow.edges.length} edges</span>
              </div>
            </div>

            {selectedNodeId && (
              <div
                className="shrink-0 overflow-hidden bg-white border-l border-gray-200 relative group"
                style={{ width: configPanelWidth }}
              >
                {/* Resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-accent/30 transition-colors z-10"
                  onMouseDown={handleResizeStart}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedNodeId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="h-full"
                  >
                    <NodeConfigPanel />
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            <AnimatePresence>{isChatOpen && <WorkflowChat />}</AnimatePresence>

            {/* Execution Panel */}
            <ExecutionPanel
              isOpen={isExecutionPanelOpen}
              onClose={() => setIsExecutionPanelOpen(false)}
              onRun={handleExecute}
              onStop={() => {
                setIsWaitingForTrigger(false);
                setIsExecuting(false);
                setExecutionComplete(false);
                workflow.nodes.forEach((node) => {
                  updateNodeStatus(node.id, "idle");
                });
              }}
              isWaitingForTrigger={isWaitingForTrigger}
            />

            {/* Execution status toast */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
              {executionResult ? (
                <div
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg shadow-lg ${
                    executionResult.status === "success"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {executionResult.status === "success" ? (
                    <CheckCircle size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  <span>{executionResult.message}</span>
                </div>
              ) : isWaitingForTrigger ? (
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 
                                  bg-white rounded-lg shadow-lg border border-gray-200"
                  >
                    <Loader2 size={16} className="animate-spin text-accent" />
                    <span>Waiting for trigger event...</span>
                  </div>
                  <button
                    onClick={handleExecute}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-white 
                               bg-red-500 rounded-lg shadow-lg hover:bg-red-600 transition-all"
                    title="Stop waiting"
                  >
                    <Square size={14} fill="white" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Trigger dropdown */}
                  <AnimatePresence>
                    {showTriggerDropdown && triggerNodes.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                      >
                        {triggerNodes.map((trigger, index) => {
                          const isSelected = trigger.id === selectedTriggerId;
                          const TriggerIcon =
                            trigger.subType === "manual"
                              ? MousePointer
                              : trigger.subType === "webhook"
                                ? Webhook
                                : trigger.subType === "form-submission"
                                  ? TallyIcon
                                  : Clock;
                          return (
                            <motion.button
                              key={trigger.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: index * 0.03,
                                duration: 0.15,
                              }}
                              onClick={() => {
                                setSelectedTriggerId(trigger.id);
                                setShowTriggerDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 transition-colors ${
                                isSelected ? "bg-gray-100" : ""
                              }`}
                            >
                              <TriggerIcon
                                size={16}
                                className="text-gray-500"
                              />
                              <span className="text-gray-900 text-sm">
                                {trigger.subType === "manual"
                                  ? "from Manual Trigger"
                                  : `from ${trigger.data.label}`}
                              </span>
                              {isSelected && (
                                <CheckCircle
                                  size={16}
                                  className="ml-auto text-accent"
                                />
                              )}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-stretch">
                    <button
                      onClick={handleExecute}
                      disabled={
                        isExecuting ||
                        workflow.nodes.length === 0 ||
                        hasErrors ||
                        triggerNodes.length === 0
                      }
                      className={`flex flex-col items-start px-5 py-2 text-sm font-medium text-white 
                                 shadow-lg disabled:opacity-50 
                                 disabled:cursor-not-allowed transition-all hover:shadow-xl
                                 ${triggerNodes.length > 1 ? "rounded-l-lg" : "rounded-lg"}
                                 ${hasErrors ? "bg-gray-400" : "bg-accent hover:bg-accent-hover"}`}
                      title={
                        hasErrors
                          ? "Fix node configuration errors before executing"
                          : triggerNodes.length === 0
                            ? "Add a trigger node to execute"
                            : undefined
                      }
                    >
                      {isExecuting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Executing...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Play size={16} />
                            <span>Execute workflow</span>
                          </div>
                          {triggerNodes.length > 1 && selectedTrigger && (
                            <span className="text-xs text-white/70 ml-6">
                              from{" "}
                              {selectedTrigger.subType === "manual"
                                ? "Manual Trigger"
                                : selectedTrigger.data.label}
                            </span>
                          )}
                        </>
                      )}
                    </button>

                    {/* Trigger selector dropdown button */}
                    {triggerNodes.length > 1 && (
                      <button
                        onClick={() =>
                          setShowTriggerDropdown(!showTriggerDropdown)
                        }
                        disabled={isExecuting}
                        className={`flex items-center px-2 text-white 
                                   rounded-r-lg shadow-lg border-l border-white/20
                                   disabled:opacity-50 transition-all
                                   ${hasErrors ? "bg-gray-400" : "bg-accent hover:bg-accent-hover"}`}
                        title="Select trigger"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${showTriggerDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ReactFlowProvider>
    </TamboProvider>
  );
}
