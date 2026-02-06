import { useWorkflowStore } from "@/lib/workflow/store";
import { getNodeDefinition } from "@/lib/workflow/node-definitions";
import { NodeIcon } from "./icons";
import { X, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
  TriggerConfig,
  SlackConfig,
  DiscordConfig,
  WaitConfig,
} from "./config";

export function NodeConfigPanel() {
  const { workflow, selectedNodeId, selectNode, updateNodeConfig, removeNode } =
    useWorkflowStore();

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId);
  const definition = selectedNode
    ? getNodeDefinition(selectedNode.type, selectedNode.subType)
    : null;

  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (selectedNode) {
      setLocalConfig(selectedNode.data.config as Record<string, unknown>);
    }
  }, [selectedNode]);

  if (!selectedNode || !definition) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50">
        <div className="w-12 h-12 mb-3 rounded-lg bg-gray-100 flex items-center justify-center">
          <NodeIcon name="cpu" size={20} className="text-gray-400" />
        </div>
        <h3 className="text-xs font-medium text-gray-500 mb-0.5">
          No node selected
        </h3>
        <p className="text-[10px] text-gray-400">Select a node to configure</p>
      </div>
    );
  }

  const handleChange = (key: string, value: unknown) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateNodeConfig(selectedNode.id, localConfig);
  };

  const handleDelete = () => {
    removeNode(selectedNode.id);
  };

  const renderConfigField = (key: string, value: unknown) => {
    const stringValue = String(value ?? "");

    // Handle different field types based on key name
    if (key === "method") {
      return (
        <select
          value={stringValue}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      );
    }

    if (key === "operator") {
      return (
        <select
          value={stringValue}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          <option value="equals">Equals</option>
          <option value="not-equals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="greater">Greater Than</option>
          <option value="less">Less Than</option>
        </select>
      );
    }

    if (key === "code" || key === "body" || key === "query") {
      return (
        <textarea
          value={stringValue}
          onChange={(e) => handleChange(key, e.target.value)}
          rows={5}
          className="w-full px-2.5 py-1.5 text-xs font-mono bg-gray-900 text-gray-100 border border-gray-700 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                     placeholder:text-gray-500"
          placeholder={`Enter ${key}...`}
        />
      );
    }

    if (key === "cron") {
      return (
        <div className="space-y-1">
          <input
            type="text"
            value={stringValue}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
            placeholder="0 9 * * *"
          />
          <p className="text-[10px] text-gray-400">
            minute hour day month weekday
          </p>
        </div>
      );
    }

    // Default text input
    return (
      <input
        type={typeof value === "number" ? "number" : "text"}
        value={stringValue}
        onChange={(e) =>
          handleChange(
            key,
            typeof value === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                   placeholder:text-gray-400"
        placeholder={`Enter ${key}...`}
      />
    );
  };

  const formatFieldLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/[-_]/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 border-b border-gray-100">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: `${definition.color}10` }}
        >
          <NodeIcon
            name={definition.icon}
            size={16}
            style={{ color: definition.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-800 truncate">
            {selectedNode.data.label}
          </h3>
          <p className="text-[10px] text-gray-400 truncate">
            {definition.description}
          </p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Config Fields */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Specialized configs for specific node types */}
        {selectedNode.type === "trigger" && (
          <TriggerConfig
            workflowId={workflow.id}
            subType={selectedNode.subType}
            config={localConfig}
            onChange={handleChange}
          />
        )}

        {selectedNode.subType === "send-slack" && (
          <SlackConfig
            config={localConfig}
            onChange={handleChange}
            workflowId={workflow.id}
          />
        )}

        {selectedNode.subType === "send-discord" && (
          <DiscordConfig
            config={localConfig}
            onChange={handleChange}
            workflowId={workflow.id}
          />
        )}

        {selectedNode.subType === "wait" && (
          <WaitConfig config={localConfig} onChange={handleChange} />
        )}

        {/* Generic config for other node types */}
        {selectedNode.type !== "trigger" &&
          selectedNode.subType !== "send-slack" &&
          selectedNode.subType !== "send-discord" &&
          selectedNode.subType !== "wait" &&
          Object.entries(localConfig).map(([key, value]) => {
            // Skip complex objects for now
            if (typeof value === "object" && value !== null) return null;

            return (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {formatFieldLabel(key)}
                </label>
                {renderConfigField(key, value)}
              </div>
            );
          })}

        {selectedNode.type !== "trigger" &&
          selectedNode.subType !== "send-slack" &&
          selectedNode.subType !== "send-discord" &&
          selectedNode.subType !== "wait" &&
          Object.keys(localConfig).length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              No configuration options
            </p>
          )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-100 space-y-1.5">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 
                     bg-accent text-white text-xs font-medium rounded-md
                     hover:bg-accent-hover transition-colors"
        >
          <Save size={14} />
          Save Changes
        </button>
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 
                     bg-red-50 text-red-600 text-xs font-medium rounded-md
                     hover:bg-red-100 transition-colors"
        >
          <Trash2 size={14} />
          Delete Node
        </button>
      </div>
    </div>
  );
}
