import { createFileRoute } from "@tanstack/react-router";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";

export const Route = createFileRoute("/app_/workflow/$id/")({
  component: WorkflowEditorPage,
});

function WorkflowEditorPage() {
  const { id } = Route.useParams();
  const tamboApiKey = import.meta.env.VITE_TAMBO_API_KEY || "";

  if (!tamboApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
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
