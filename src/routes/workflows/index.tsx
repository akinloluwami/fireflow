import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow/types";
import { Plus, Zap, MoreVertical, Trash2, Edit, Loader2 } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: string;
  userId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const Route = createFileRoute("/workflows/")({
  component: WorkflowsListPage,
});

function WorkflowsListPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthPending && !session?.user) {
      navigate({ to: "/" });
    }
  }, [isAuthPending, session, navigate]);

  useEffect(() => {
    if (session?.user) {
      loadWorkflows();
    }
  }, [session?.user]);

  async function loadWorkflows() {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workflows?userId=${session.user.id}`);
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateWorkflow() {
    if (!session?.user?.id) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Workflow",
          userId: session.user.id,
        }),
      });
      const { id } = await res.json();
      navigate({ to: "/workflow/$id", params: { id } });
    } catch (error) {
      console.error("Failed to create workflow:", error);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteWorkflow(id: string) {
    if (!session?.user?.id) return;
    try {
      await fetch(`/api/workflows/${id}?userId=${session.user.id}`, {
        method: "DELETE",
      });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
    setMenuOpen(null);
  }

  if (isAuthPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-accent rounded-full" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              FireFlow
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              My Workflows
            </h1>
            <p className="text-gray-500 mt-1">
              Create and manage your automation workflows
            </p>
          </div>
          <button
            onClick={handleCreateWorkflow}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-2xl hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Workflow
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-accent rounded-full" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Zap className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              No workflows yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first workflow to get started
            </p>
            <button
              onClick={handleCreateWorkflow}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group relative"
              >
                <Link
                  to="/workflow/$id"
                  params={{ id: workflow.id }}
                  className="block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                      <Zap className="w-5 h-5 text-accent" />
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        workflow.status === "active"
                          ? "bg-green-100 text-green-700"
                          : workflow.status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 truncate">
                    {workflow.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {workflow.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{workflow.nodes.length} nodes</span>
                    <span>
                      Updated{" "}
                      {workflow.updatedAt
                        ? new Date(workflow.updatedAt).toLocaleDateString()
                        : "never"}
                    </span>
                  </div>
                </Link>

                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(
                        menuOpen === workflow.id ? null : workflow.id,
                      );
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                  {menuOpen === workflow.id && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-30">
                      <Link
                        to="/workflow/$id"
                        params={{ id: workflow.id }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteWorkflow(workflow.id);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
