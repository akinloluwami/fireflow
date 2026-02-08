import {
  createFileRoute,
  Outlet,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { useWorkflowStore } from "@/lib/workflow/store";
import { Loader2, Check, Cloud, PenLine, History } from "lucide-react";

export const Route = createFileRoute("/app_/workflow/$id")({
  head: () => ({
    meta: [{ title: "Workflow | FireFlow" }],
  }),
  component: WorkflowLayout,
});

function WorkflowLayout() {
  const { id } = Route.useParams();
  const location = useLocation();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const { workflow, setWorkflow } = useWorkflowStore();
  const isLoadingRef = useRef(false);
  const loadedWorkflowIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  const [localWorkflowName, setLocalWorkflowName] = useState(workflow.name);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Check if this workflow is already loaded (survives HMR)
  const isWorkflowLoaded = workflow.id === id && workflow.nodes !== undefined;

  // Determine active tab from URL
  const isExecutionsTab = location.pathname.endsWith("/executions");

  // Sync local name when workflow changes
  useEffect(() => {
    setLocalWorkflowName(workflow.name);
  }, [workflow.name]);

  // Load workflow
  useEffect(() => {
    if (!session?.user?.id || isLoadingRef.current) return;
    if (isWorkflowLoaded && loadedWorkflowIdRef.current === id) return;

    async function loadWorkflow() {
      isLoadingRef.current = true;
      try {
        const res = await fetch(`/api/workflows/${id}`);
        if (!res.ok) {
          window.location.href = "/app/workflows";
          return;
        }
        const data = await res.json();
        setWorkflow({
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          nodes: data.nodes,
          edges: data.edges,
          status: data.status as "draft" | "active" | "paused" | "error",
          createdAt: data.createdAt || undefined,
          updatedAt: data.updatedAt || undefined,
          chatThreadId: data.chatThreadId || undefined,
        });
        lastSavedRef.current = JSON.stringify({
          nodes: data.nodes,
          edges: data.edges,
          name: data.name,
        });
        loadedWorkflowIdRef.current = id;
      } catch (error) {
        console.error("Failed to load workflow:", error);
        window.location.href = "/app/workflows";
      } finally {
        isLoadingRef.current = false;
      }
    }

    loadWorkflow();
  }, [id, session?.user?.id, setWorkflow, isWorkflowLoaded]);

  // Auto-save on changes
  const saveWorkflow = useCallback(async () => {
    if (!session?.user?.id || !isWorkflowLoaded) return;

    const currentState = JSON.stringify({
      nodes: workflow.nodes,
      edges: workflow.edges,
      name: workflow.name,
      chatThreadId: workflow.chatThreadId,
    });

    if (currentState === lastSavedRef.current) return;

    setSaveStatus("saving");
    try {
      await fetch(`/api/workflows/${workflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflow.name,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
          chatThreadId: workflow.chatThreadId,
        }),
      });
      lastSavedRef.current = currentState;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      setSaveStatus("idle");
    }
  }, [workflow, session?.user?.id, isWorkflowLoaded]);

  // Debounced auto-save
  useEffect(() => {
    if (!isWorkflowLoaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    workflow.nodes,
    workflow.edges,
    workflow.name,
    workflow.description,
    workflow.chatThreadId,
    saveWorkflow,
    isWorkflowLoaded,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isAuthPending || !isWorkflowLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with Tabs */}
      <header className="grid grid-cols-3 items-center px-4 h-14 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center gap-4">
          <Link to="/app/workflows" className="flex items-center gap-2">
            <img src="/logo.png" alt="FireFlow Logo" className="w-5" />
            <span className="font-semibold text-gray-900">FireFlow</span>
          </Link>

          <div className="w-px h-5 bg-gray-200" />

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
                       transition-colors min-w-64 max-w-96"
            placeholder="Workflow name"
          />
        </div>

        {/* Tabs - centered */}
        <div className="flex items-center justify-center">
          <div className="relative flex items-center bg-accent/10 p-1 rounded-full ring-1 ring-accent/30">
            <Link
              to="/app/workflow/$id"
              params={{ id }}
              className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors"
            >
              {!isExecutionsTab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-accent rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <PenLine
                size={14}
                className={`relative z-10 ${!isExecutionsTab ? "text-white" : "text-gray-500"}`}
              />
              <span
                className={`relative z-10 ${!isExecutionsTab ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Editor
              </span>
            </Link>
            <Link
              to="/app/workflow/$id/executions"
              params={{ id }}
              search={{ executionId: undefined }}
              className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors"
            >
              {isExecutionsTab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-accent rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <History
                size={14}
                className={`relative z-10 ${isExecutionsTab ? "text-white" : "text-gray-500"}`}
              />
              <span
                className={`relative z-10 ${isExecutionsTab ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Executions
              </span>
            </Link>
          </div>
        </div>

        {/* Right side - Save status */}
        <div className="flex items-center justify-end gap-1.5 text-xs text-gray-500">
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
      </header>

      {/* Content - Outlet for child routes */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
