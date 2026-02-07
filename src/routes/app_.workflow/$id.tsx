import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { useWorkflowStore } from "@/lib/workflow/store";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app_/workflow/$id")({
  head: () => ({
    meta: [{ title: "Edit Workflow | FireFlow" }],
  }),
  component: WorkflowEditorPage,
});

function WorkflowEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const { workflow, setWorkflow } = useWorkflowStore();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    console.log("[Workflow] Load effect:", {
      userId: session?.user?.id,
      isLoading: isLoadingRef.current,
      hasLoaded: hasLoadedRef.current,
      isAuthPending,
    });

    if (!session?.user?.id || isLoadingRef.current || hasLoadedRef.current)
      return;

    async function loadWorkflow() {
      isLoadingRef.current = true;
      console.log("[Workflow] Fetching workflow:", id);
      try {
        const res = await fetch(`/api/workflows/${id}`);
        console.log("[Workflow] Response:", res.status, res.ok);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[Workflow] Load failed:", errorData);
          navigate({ to: "/app/workflows" });
          return;
        }
        const data = await res.json();
        console.log(
          "[Workflow] Loaded:",
          data.name,
          "chatThreadId:",
          data.chatThreadId,
        );
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
        hasLoadedRef.current = true;
      } catch (error) {
        console.error("Failed to load workflow:", error);
        navigate({ to: "/app/workflows" });
      } finally {
        isLoadingRef.current = false;
      }
    }

    loadWorkflow();
  }, [id, session?.user?.id, setWorkflow, navigate, isAuthPending]);

  // Auto-save on changes
  const saveWorkflow = useCallback(async () => {
    if (!session?.user?.id || !hasLoadedRef.current) return;

    const currentState = JSON.stringify({
      nodes: workflow.nodes,
      edges: workflow.edges,
      name: workflow.name,
      chatThreadId: workflow.chatThreadId,
    });

    // Don't save if nothing changed
    if (currentState === lastSavedRef.current) return;

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
    } catch (error) {
      console.error("Failed to save workflow:", error);
    }
  }, [workflow, session?.user?.id]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasLoadedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow();
    }, 1000); // Save after 1 second of inactivity

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
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasLoadedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Auth redirect - only redirect if we're sure auth is complete and no user
  useEffect(() => {
    // Give the session a moment to settle after OAuth redirect
    if (!isAuthPending && !session?.user) {
      const timeout = setTimeout(() => {
        // Double-check after a short delay
        if (!session?.user) {
          navigate({ to: "/" });
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isAuthPending, session, navigate]);

  if (isAuthPending || !hasLoadedRef.current) {
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

  const tamboApiKey = import.meta.env.VITE_TAMBO_API_KEY || "";

  if (!tamboApiKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Tambo API Key Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please add your Tambo API key to the environment variables.
          </p>
          <code className="block p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
            VITE_TAMBO_API_KEY=your_api_key
          </code>
        </div>
      </div>
    );
  }

  return <WorkflowBuilder tamboApiKey={tamboApiKey} workflowId={id} />;
}
