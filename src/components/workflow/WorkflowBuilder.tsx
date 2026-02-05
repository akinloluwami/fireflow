import { useState } from "react";
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
  Save,
  Play,
  ChevronLeft,
  ChevronRight,
  Undo,
  Redo,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface WorkflowBuilderProps {
  tamboApiKey: string;
}

export function WorkflowBuilder({ tamboApiKey }: WorkflowBuilderProps) {
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
  } = useWorkflowStore();

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement save to database
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
  };

  const handleRun = () => {
    // TODO: Implement workflow execution
    console.log("Running workflow:", workflow);
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
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900">FireFlow</span>
              </Link>

              <div className="w-px h-5 bg-gray-200" />

              {/* Workflow name */}
              <input
                type="text"
                value={workflow.name}
                onChange={(e) =>
                  useWorkflowStore
                    .getState()
                    .updateWorkflowMeta(e.target.value, workflow.description)
                }
                className="px-2 py-1 text-sm font-medium text-gray-700 bg-transparent border border-transparent 
                           rounded hover:border-gray-200 focus:border-accent focus:outline-none 
                           transition-colors min-w-[180px]"
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 
                           border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleRun}
                disabled={workflow.nodes.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white 
                           bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 
                           disabled:cursor-not-allowed transition-colors"
              >
                <Play size={14} />
                Run
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
                  {workflow.nodes.filter((n) => n.type === "trigger").length}{" "}
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
