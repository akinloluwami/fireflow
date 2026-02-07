import { createFileRoute } from "@tanstack/react-router";
import { Key, Plus, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/credentials/")({
  component: CredentialsPage,
});

function CredentialsPage() {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Credentials
            </h1>
            <p className="text-gray-500">
              Manage database connections, API keys, and other secrets
            </p>
          </div>
          <button
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Credential
          </button>
        </div>

        <div className="text-center py-24 px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-linear-to-br from-accent/10 to-purple-100 flex items-center justify-center">
            <Key className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            No credentials yet
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Create credentials to securely store database connections, API keys,
            and other secrets for use in your workflows.
          </p>
          <button
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Create your first credential
          </button>
        </div>
      </main>
    </div>
  );
}
