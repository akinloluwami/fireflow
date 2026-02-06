import { useWorkflowStore } from "@/lib/workflow/store";
import { getNodeDefinition } from "@/lib/workflow/node-definitions";
import { NodeIcon } from "./icons";
import { X, Trash2, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  TriggerConfig,
  SlackConfig,
  DiscordConfig,
  WaitConfig,
  ConditionConfig,
  SwitchConfig,
  LoopConfig,
  HttpRequestConfig,
  EmailConfig,
  SetVariableConfig,
  CodeConfig,
  FilterConfig,
  FunctionConfig,
  SplitConfig,
  AggregateConfig,
} from "./config";

type SaveStatus = "idle" | "saving" | "saved";

export function NodeConfigPanel() {
  const {
    workflow,
    selectedNodeId,
    selectNode,
    updateNodeConfig,
    updateNode,
    removeNode,
  } = useWorkflowStore();

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId);
  const definition = selectedNode
    ? getNodeDefinition(selectedNode.type, selectedNode.subType)
    : null;

  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [localLabel, setLocalLabel] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const isInitialMount = useRef(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Sync local config and label when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setLocalConfig(selectedNode.data.config as Record<string, unknown>);
      setLocalLabel(selectedNode.data.label || "");
      isInitialMount.current = true;
      setSaveStatus("idle");
    }
  }, [selectedNode?.id]);

  // Auto-save with debounce when localConfig changes
  useEffect(() => {
    // Skip initial mount to avoid saving on load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!selectedNode) return;

    setSaveStatus("saving");

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the save
    debounceRef.current = setTimeout(() => {
      updateNodeConfig(selectedNode.id, localConfig);
      setSaveStatus("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localConfig, selectedNode?.id, updateNodeConfig]);

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

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLabel(e.target.value);
  };

  const handleLabelConfirm = () => {
    if (selectedNode && localLabel.trim()) {
      updateNode(selectedNode.id, {
        data: { ...selectedNode.data, label: localLabel.trim() },
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    labelInputRef.current?.blur();
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLabelConfirm();
    } else if (e.key === "Escape") {
      setLocalLabel(selectedNode?.data.label || "");
      labelInputRef.current?.blur();
    }
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
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: `${definition.color}10` }}
        >
          <NodeIcon
            name={definition.icon}
            size={16}
            style={{ color: definition.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={labelInputRef}
            type="text"
            value={localLabel}
            onChange={handleLabelChange}
            onBlur={handleLabelConfirm}
            onKeyDown={handleLabelKeyDown}
            className="w-full text-sm font-medium text-gray-800 bg-transparent border-0 
                       focus:outline-none focus:ring-0 px-0 py-0.5
                       hover:bg-gray-50 focus:bg-gray-50 rounded transition-colors"
            placeholder="Node name..."
          />
          <p className="text-[10px] text-gray-400 truncate">
            {definition.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Save Status */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Loader2 size={10} className="animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[10px] text-green-600">
              <Check size={10} />
              Saved
            </span>
          )}
          <button
            onClick={() => selectNode(null)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
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
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "send-discord" && (
          <DiscordConfig
            config={localConfig}
            onChange={handleChange}
            workflowId={workflow.id}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "wait" && (
          <WaitConfig config={localConfig} onChange={handleChange} />
        )}

        {selectedNode.subType === "if-else" && (
          <ConditionConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "switch" && (
          <SwitchConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "loop" && (
          <LoopConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "http-request" && (
          <HttpRequestConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "send-email" && (
          <EmailConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "set-variable" && (
          <SetVariableConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "code" && (
          <CodeConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "filter" && (
          <FilterConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "function" && (
          <FunctionConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "split" && (
          <SplitConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {selectedNode.subType === "aggregate" && (
          <AggregateConfig
            config={localConfig}
            onChange={handleChange}
            nodeId={selectedNode.id}
          />
        )}

        {/* Generic config for other node types */}
        {selectedNode.type !== "trigger" &&
          selectedNode.subType !== "send-slack" &&
          selectedNode.subType !== "send-discord" &&
          selectedNode.subType !== "wait" &&
          selectedNode.subType !== "if-else" &&
          selectedNode.subType !== "switch" &&
          selectedNode.subType !== "loop" &&
          selectedNode.subType !== "http-request" &&
          selectedNode.subType !== "send-email" &&
          selectedNode.subType !== "set-variable" &&
          selectedNode.subType !== "code" &&
          selectedNode.subType !== "filter" &&
          selectedNode.subType !== "function" &&
          selectedNode.subType !== "split" &&
          selectedNode.subType !== "aggregate" &&
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
          selectedNode.subType !== "if-else" &&
          selectedNode.subType !== "switch" &&
          selectedNode.subType !== "loop" &&
          selectedNode.subType !== "http-request" &&
          selectedNode.subType !== "send-email" &&
          selectedNode.subType !== "set-variable" &&
          selectedNode.subType !== "code" &&
          selectedNode.subType !== "filter" &&
          selectedNode.subType !== "function" &&
          selectedNode.subType !== "split" &&
          selectedNode.subType !== "aggregate" &&
          Object.keys(localConfig).length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              No configuration options
            </p>
          )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-100">
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
