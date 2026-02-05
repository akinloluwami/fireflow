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
  Settings,
  ChevronLeft,
  ChevronRight,
  Undo,
  Redo,
  Sparkles,
  Menu,
} from "lucide-react";

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
        <div className="flex flex-col h-screen bg-gray-100">
          {/* Top Bar */}
          <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm z-10">
            {/* Left section */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
                </div>
                <span className="font-bold text-lg text-gray-800">
                  VibeFlow
                </span>
              </div>

              <div className="w-px h-6 bg-gray-200 mx-2" />

              {/* Workflow name */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={workflow.name}
                  onChange={(e) =>
                    useWorkflowStore
                      .getState()
                      .updateWorkflowMeta(e.target.value, workflow.description)
                  }
                  className="px-2 py-1 text-sm font-medium text-gray-700 bg-transparent border border-transparent 
                             rounded hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 
                             focus:ring-blue-500 transition-all min-w-[150px]"
                  placeholder="Workflow name"
                />
              </div>
            </div>

            {/* Center section - Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={historyIndex < 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={18} className="text-gray-600" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white 
                           border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleRun}
                disabled={workflow.nodes.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white 
                           bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 
                           hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Play size={16} />
                Run
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings size={18} className="text-gray-600" />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Node Palette */}
            <div
              className={`
                flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
                ${isPanelOpen ? "w-64" : "w-0"}
              `}
            >
              <NodePalette />
            </div>

            {/* Toggle button for palette */}
            <button
              onClick={togglePanel}
              className="flex-shrink-0 w-5 flex items-center justify-center bg-gray-100 
                         hover:bg-gray-200 border-x border-gray-200 transition-colors"
            >
              {isPanelOpen ? (
                <ChevronLeft size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
            </button>

            {/* Canvas */}
            <div className="flex-1 relative">
              <WorkflowCanvas />

              {/* Floating stats */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 text-xs text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {
                    workflow.nodes.filter((n) => n.type === "trigger").length
                  }{" "}
                  triggers
                </span>
                <span className="text-gray-300">|</span>
                <span>{workflow.nodes.length} nodes</span>
                <span className="text-gray-300">|</span>
                <span>{workflow.edges.length} connections</span>
              </div>
            </div>

            {/* Right Sidebar - Config Panel */}
            {selectedNodeId && (
              <div className="flex-shrink-0 w-80 overflow-hidden">
                <NodeConfigPanel />
              </div>
            )}

            {/* Chat Panel */}
            {isChatOpen && <WorkflowChat />}

            {/* Chat toggle when closed */}
            {!isChatOpen && (
              <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-purple-500 
                           text-white rounded-full shadow-lg hover:shadow-xl transition-all
                           hover:scale-105 active:scale-95 z-50"
              >
                <Sparkles size={24} />
              </button>
            )}
          </div>
        </div>
      </ReactFlowProvider>
    </TamboProvider>
  );
}
