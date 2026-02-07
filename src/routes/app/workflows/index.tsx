import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow/types";
import {
  Plus,
  Zap,
  MoreVertical,
  Trash2,
  Edit,
  Loader2,
  Sparkles,
  Clock,
  ArrowRight,
} from "lucide-react";

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

export const Route = createFileRoute("/app/workflows/")({
  head: () => ({
    meta: [{ title: "Workflows | FireFlow" }],
  }),
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
      navigate({ to: "/app/workflow/$id", params: { id } });
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

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Workflows
            </h1>
            <p className="text-gray-500">
              Create and manage your automation workflows
            </p>
          </div>
          <button
            onClick={handleCreateWorkflow}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50"
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
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin w-10 h-10 border-3 border-gray-200 border-t-accent rounded-full mb-4" />
            <p className="text-gray-400 text-sm">Loading workflows...</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-linear-to-br from-accent/10 to-purple-100 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Start automating
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create your first workflow and let AI help you build powerful
              automations in minutes.
            </p>
            <button
              onClick={handleCreateWorkflow}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                to="/app/workflow/$id"
                params={{ id: workflow.id }}
                className="group bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-300 hover:bg-gray-50/50 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-accent/10 to-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-accent" />
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        workflow.status === "active"
                          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                          : workflow.status === "error"
                            ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                            : "bg-gray-50 text-gray-500 ring-1 ring-gray-200"
                      }`}
                    >
                      {workflow.status === "active" ? "Live" : workflow.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1.5 truncate group-hover:text-accent transition-colors">
                    {workflow.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-10">
                    {workflow.description || "No description"}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {workflow.nodes.length} nodes
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {workflow.updatedAt
                          ? new Date(workflow.updatedAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(menuOpen === workflow.id ? null : workflow.id);
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>

                {menuOpen === workflow.id && (
                  <div
                    className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl py-1.5 z-20 min-w-32"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Link
                      to="/app/workflow/$id"
                      params={{ id: workflow.id }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteWorkflow(workflow.id);
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
