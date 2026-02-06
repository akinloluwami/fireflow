import { useState, useEffect, useRef } from "react";
import { TamboProvider } from "@tambo-ai/react";
import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { WorkflowChat } from "./WorkflowChat";
import { useWorkflowStore } from "@/lib/workflow/store";
import { workflowComponents } from "@/lib/workflow/tambo-components";
import { workflowTools } from "@/lib/workflow/tambo-tools";
import { nodeDefinitions } from "@/lib/workflow/node-definitions";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Undo,
  Redo,
  Sparkles,
  Zap,
  Rocket,
  Pause,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  Check,
  Cloud,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

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
  } = useWorkflowStore();

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isWaitingForTrigger, setIsWaitingForTrigger] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [localWorkflowName, setLocalWorkflowName] = useState(workflow.name);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutionIdRef = useRef<string | null>(null);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Validate nodes whenever the workflow changes
  useEffect(() => {
    validateNodes();
  }, [workflow.nodes, validateNodes]);

  // Sync local workflow name when workflow changes externally
  useEffect(() => {
    setLocalWorkflowName(workflow.name);
  }, [workflow.name]);

  // Auto-save workflow when it changes
  useEffect(() => {
    if (!workflowId) return;

    setSaveStatus("saving");

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            nodes: workflow.nodes,
            edges: workflow.edges,
            status: workflow.status,
          }),
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus("idle");
      }
    }, 1000);

    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [
    workflow.name,
    workflow.description,
    workflow.nodes,
    workflow.edges,
    workflowId,
  ]);

  // Determine if the workflow has a trigger that requires waiting for an external event
  const triggerNode = workflow.nodes.find((n) => n.type === "trigger");
  const requiresExternalTrigger =
    triggerNode?.subType === "webhook" ||
    triggerNode?.subType === "form-submission";

  // Check if there are validation errors
  const hasErrors = hasValidationErrors();

  // Poll for execution completion when waiting for trigger
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

    // Start polling
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/workflows/${workflowId}/executions/latest`,
        );
        const data = await res.json();

        console.log(
          "[Polling] Latest execution:",
          data.execution?.id,
          "Status:",
          data.execution?.status,
        );
        console.log("[Polling] Last known ID:", lastExecutionIdRef.current);

        if (data.execution) {
          const execution = data.execution;
          const isNewExecution = execution.id !== lastExecutionIdRef.current;

          // Check if execution is done (completed or failed)
          if (
            isNewExecution &&
            (execution.status === "completed" || execution.status === "failed")
          ) {
            console.log("[Polling] New completed execution detected!");
            // Update ref first so we don't trigger again
            lastExecutionIdRef.current = execution.id;

            // Execution finished
            setIsWaitingForTrigger(false);
            setExecutionResult({
              status: execution.status === "completed" ? "success" : "failed",
              executionId: execution.id,
              message:
                execution.status === "completed"
                  ? "Workflow executed successfully!"
                  : execution.error || "Workflow execution failed",
            });

            // Revert to draft if was testing
            if (workflow.status === "testing") {
              useWorkflowStore.getState().setWorkflow({
                ...workflow,
                status: "draft",
              });
            }

            // Clear result after 5 seconds
            setTimeout(() => setExecutionResult(null), 5000);
          } else if (
            isNewExecution &&
            (execution.status === "running" || execution.status === "pending")
          ) {
            // New execution is in progress - DON'T update ref yet, wait for completion
            console.log(
              "[Polling] New execution in progress, waiting for completion...",
            );
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1500); // Poll every 1.5 seconds

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isWaitingForTrigger, workflowId, workflow]);

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

    // If trigger requires external event, toggle waiting state
    if (requiresExternalTrigger) {
      if (isWaitingForTrigger) {
        // Stop waiting - revert to draft if we were in testing mode
        setIsWaitingForTrigger(false);
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

      // Start waiting for trigger - set status to "testing" if not already active
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
      setIsWaitingForTrigger(true);
      return;
    }

    // For manual/schedule triggers, execute immediately
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testData: {} }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Workflow executed!\n\nExecution ID: ${data.executionId}`);
      } else {
        alert(`❌ Execution failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      alert("❌ Failed to execute workflow");
    } finally {
      setIsExecuting(false);
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
      <ReactFlowProvider>
        <div className="flex flex-col h-screen bg-gray-50">
          {/* Top Bar */}
          <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 z-10">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <Link to="/workflows" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900">FireFlow</span>
              </Link>

              <div className="w-px h-5 bg-gray-200" />

              {/* Workflow name */}
              <input
                ref={nameInputRef}
                type="text"
                value={localWorkflowName}
                onChange={(e) => setLocalWorkflowName(e.target.value)}
                onBlur={() => {
                  if (localWorkflowName.trim()) {
                    useWorkflowStore
                      .getState()
                      .updateWorkflowMeta(
                        localWorkflowName.trim(),
                        workflow.description,
                      );
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    nameInputRef.current?.blur();
                  } else if (e.key === "Escape") {
                    setLocalWorkflowName(workflow.name);
                    nameInputRef.current?.blur();
                  }
                }}
                className="px-2 py-1 text-sm font-medium text-gray-700 bg-transparent border border-transparent 
                           rounded hover:border-gray-200 focus:border-accent focus:outline-none 
                           transition-colors min-w-[280px]"
                placeholder="Workflow name"
              />
            </div>

            {/* Center section - Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={historyIndex < 0}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <Undo size={16} className="text-gray-500" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <Redo size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
              {/* Save Status */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check size={12} className="text-green-600" />
                    <span className="text-green-600">Saved</span>
                  </>
                )}
                {saveStatus === "idle" && (
                  <>
                    <Cloud size={12} />
                    <span>All changes saved</span>
                  </>
                )}
              </div>

              <div className="w-px h-5 bg-gray-200" />

              {/* Status badge */}
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
          </header>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Node Palette */}
            <div
              className={`
                flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden bg-white border-r border-gray-200
                ${isPanelOpen ? "w-60" : "w-0"}
              `}
            >
              <NodePalette />
            </div>

            {/* Toggle button for palette */}
            <button
              onClick={togglePanel}
              className="flex-shrink-0 w-4 flex items-center justify-center bg-gray-50 
                         hover:bg-gray-100 border-r border-gray-200 transition-colors"
            >
              {isPanelOpen ? (
                <ChevronLeft size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )}
            </button>

            {/* Canvas */}
            <div className="flex-1 relative bg-[#fafafa]">
              <WorkflowCanvas />

              {/* Floating stats */}
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

            {/* Right Sidebar - Config Panel */}
            {selectedNodeId && (
              <div className="flex-shrink-0 w-72 overflow-hidden bg-white border-l border-gray-200">
                <NodeConfigPanel />
              </div>
            )}

            {/* Chat Panel */}
            {isChatOpen && <WorkflowChat />}

            {/* Execute Workflow Button - Bottom Center */}
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
                <button
                  onClick={handleExecute}
                  disabled={
                    isExecuting || workflow.nodes.length === 0 || hasErrors
                  }
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white 
                             rounded-lg shadow-lg disabled:opacity-50 
                             disabled:cursor-not-allowed transition-all hover:shadow-xl
                             ${hasErrors ? "bg-gray-400" : "bg-accent hover:bg-accent-hover"}`}
                  title={
                    hasErrors
                      ? "Fix node configuration errors before executing"
                      : undefined
                  }
                >
                  <Play size={16} />
                  {isExecuting ? "Executing..." : "Execute workflow"}
                </button>
              )}
            </div>

            {/* Chat toggle when closed */}
            {!isChatOpen && (
              <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 p-3.5 bg-accent text-white rounded-full 
                           shadow-lg hover:bg-accent-hover transition-colors z-50"
                title="AI Assistant"
              >
                <Sparkles size={20} />
              </button>
            )}
          </div>
        </div>
      </ReactFlowProvider>
    </TamboProvider>
  );
}
