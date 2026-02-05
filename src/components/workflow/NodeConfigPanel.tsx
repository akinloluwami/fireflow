import { useWorkflowStore } from "@/lib/workflow/store";
import { getNodeDefinition } from "@/lib/workflow/node-definitions";
import { NodeIcon } from "./icons";
import { X, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

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
        <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <NodeIcon name="cpu" size={24} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">
          No node selected
        </h3>
        <p className="text-xs text-gray-400">
          Select a node to configure its settings
        </p>
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
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
          rows={6}
          className="w-full px-3 py-2 text-sm font-mono bg-gray-900 text-gray-100 border border-gray-700 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                     placeholder:text-gray-500"
          placeholder={`Enter ${key}...`}
        />
      );
    }

    if (key === "cron") {
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={stringValue}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="0 9 * * *"
          />
          <p className="text-xs text-gray-400">
            Format: minute hour day month weekday
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
        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
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
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: `${definition.color}15` }}
        >
          <NodeIcon
            name={definition.icon}
            size={20}
            style={{ color: definition.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">
            {selectedNode.data.label}
          </h3>
          <p className="text-xs text-gray-500">{definition.description}</p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Config Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(localConfig).map(([key, value]) => {
          // Skip complex objects for now
          if (typeof value === "object" && value !== null) return null;

          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {formatFieldLabel(key)}
              </label>
              {renderConfigField(key, value)}
            </div>
          );
        })}

        {Object.keys(localConfig).length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No configuration options available
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                     bg-blue-500 text-white text-sm font-medium rounded-lg
                     hover:bg-blue-600 transition-colors"
        >
          <Save size={16} />
          Save Changes
        </button>
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                     bg-red-50 text-red-600 text-sm font-medium rounded-lg
                     hover:bg-red-100 transition-colors"
        >
          <Trash2 size={16} />
          Delete Node
        </button>
      </div>
    </div>
  );
}
