import { createFileRoute } from "@tanstack/react-router";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";

export const Route = createFileRoute("/workflows/")({
  component: WorkflowsPage,
});

function WorkflowsPage() {
  // TODO: Get API key from environment or auth
  const tamboApiKey = import.meta.env.VITE_TAMBO_API_KEY || "";

  if (!tamboApiKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
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

  return <WorkflowBuilder tamboApiKey={tamboApiKey} />;
}
