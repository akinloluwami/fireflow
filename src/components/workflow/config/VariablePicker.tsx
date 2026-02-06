import { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Search,
  Database,
  Zap,
  Box,
  Loader2,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  getUpstreamNodes,
  getTriggerNode,
  getNodeDisplayName,
} from "@/lib/workflow/upstream-nodes";
import {
  getNodeOutputSchema,
  type NodeOutputSchema,
} from "@/lib/workflow/node-schemas";
import { buildVariablePath } from "@/lib/workflow/variable-resolver";

interface VariablePickerProps {
  nodeId: string;
  onSelect: (variablePath: string) => void;
  onClose?: () => void;
}

interface TreeNode {
  key: string;
  path: string[];
  schema: NodeOutputSchema;
  source: "trigger" | "nodes" | "loop";
  nodeId?: string;
  children?: TreeNode[];
}

export function VariablePicker({
  nodeId,
  onSelect,
  onClose,
}: VariablePickerProps) {
  const { workflow } = useWorkflowStore();
  const [search, setSearch] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(["trigger"]),
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<{
    triggerData?: Record<string, unknown>;
    nodeOutputs?: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch latest execution data to get actual values
  useEffect(() => {
    const fetchExecutionData = async () => {
      try {
        const res = await fetch(
          `/api/workflows/${workflow.id}/executions/latest`,
        );
        const data = await res.json();
        if (data.execution) {
          setExecutionData({
            triggerData: data.execution.triggerData as Record<string, unknown>,
            nodeOutputs: data.execution.nodeOutputs as Record<string, unknown>,
          });
        }
      } catch (error) {
        console.error("Failed to fetch execution data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutionData();
  }, [workflow.id]);

  // Build tree from actual data, falling back to schema
  function buildTreeFromData(
    data: unknown,
    schema: NodeOutputSchema | undefined,
    parentPath: string[],
    source: "trigger" | "nodes" | "loop",
    nodeId?: string,
  ): TreeNode[] {
    if (data === null || data === undefined) {
      // Fall back to schema if no data
      if (schema?.type === "object" && schema.properties) {
        return Object.entries(schema.properties).map(([key, propSchema]) => ({
          key,
          path: [...parentPath, key],
          schema: propSchema,
          source,
          nodeId,
          children: buildTreeFromData(
            undefined,
            propSchema,
            [...parentPath, key],
            source,
            nodeId,
          ),
        }));
      }
      return [];
    }

    if (typeof data === "object" && !Array.isArray(data)) {
      return Object.entries(data as Record<string, unknown>)
        .filter(([key]) => !key.startsWith("_")) // Filter out internal fields like _meta
        .map(([key, value]) => {
          const propSchema = schema?.properties?.[key];
          const inferredSchema: NodeOutputSchema = propSchema || {
            type:
              typeof value === "object"
                ? Array.isArray(value)
                  ? "array"
                  : "object"
                : (typeof value as NodeOutputSchema["type"]),
            description: "",
            example: value,
          };

          return {
            key,
            path: [...parentPath, key],
            schema: { ...inferredSchema, example: value },
            source,
            nodeId,
            children:
              typeof value === "object" &&
              value !== null &&
              !Array.isArray(value)
                ? buildTreeFromData(
                    value,
                    inferredSchema,
                    [...parentPath, key],
                    source,
                    nodeId,
                  )
                : undefined,
          };
        });
    }

    return [];
  }

  // Build the tree of available variables
  const variableTree = useMemo(() => {
    const tree: { trigger?: TreeNode; nodes: TreeNode[] } = { nodes: [] };

    // Add trigger node
    const triggerNode = getTriggerNode(workflow);
    if (triggerNode) {
      const schema = getNodeOutputSchema(triggerNode.subType);
      if (schema) {
        // Use actual trigger data if available, otherwise fall back to schema
        const triggerData = executionData?.triggerData;
        tree.trigger = {
          key: "trigger",
          path: [],
          schema,
          source: "trigger",
          children: triggerData
            ? buildTreeFromData(triggerData, schema, [], "trigger")
            : buildChildren(schema, [], "trigger"),
        };
      }
    }

    // Add upstream nodes
    const upstreamNodes = getUpstreamNodes(workflow, nodeId);
    for (const { node } of upstreamNodes) {
      if (node.type === "trigger") continue; // Already handled

      // Check if this is a loop node - its variables should use {{ loop.xxx }} syntax
      const isLoopNode = node.subType === "loop";

      // Pass node config for dynamic schema generation (e.g., set-variable)
      const nodeConfig = node.data.config as
        | Record<string, unknown>
        | undefined;
      const schema = getNodeOutputSchema(node.subType, nodeConfig);
      if (schema) {
        // Use actual node output if available
        const nodeOutput = executionData?.nodeOutputs?.[node.id] as
          | Record<string, unknown>
          | undefined;

        // For loop nodes, use "loop" source so it generates {{ loop.item }} syntax
        const source = isLoopNode ? "loop" : "nodes";

        tree.nodes.push({
          key: node.id,
          path: [],
          schema,
          source,
          nodeId: node.id,
          children: nodeOutput
            ? buildTreeFromData(nodeOutput, schema, [], source, node.id)
            : buildChildren(schema, [], source, node.id),
        });
      }
    }

    return tree;
  }, [workflow, nodeId, executionData]);

  function buildChildren(
    schema: NodeOutputSchema,
    parentPath: string[],
    source: "trigger" | "nodes" | "loop",
    nodeId?: string,
  ): TreeNode[] | undefined {
    if (schema.type !== "object" || !schema.properties) {
      return undefined;
    }

    return Object.entries(schema.properties).map(([key, propSchema]) => ({
      key,
      path: [...parentPath, key],
      schema: propSchema,
      source,
      nodeId,
      children: buildChildren(propSchema, [...parentPath, key], source, nodeId),
    }));
  }

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (node: TreeNode) => {
    const variablePath = buildVariablePath(
      node.source,
      node.nodeId || null,
      node.path,
    );
    onSelect(variablePath);
    onClose?.();
  };

  const handleCopy = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const variablePath = buildVariablePath(
      node.source,
      node.nodeId || null,
      node.path,
    );
    navigator.clipboard.writeText(variablePath);
    setCopiedPath(node.path.join("."));
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const filterTree = (
    nodes: TreeNode[] | undefined,
    searchTerm: string,
  ): TreeNode[] => {
    if (!nodes) return [];
    if (!searchTerm) return nodes;

    const term = searchTerm.toLowerCase();
    return nodes.filter((node) => {
      const matchesKey = node.key.toLowerCase().includes(term);
      const matchesDescription = node.schema.description
        ?.toLowerCase()
        .includes(term);
      const hasMatchingChildren =
        filterTree(node.children, searchTerm).length > 0;
      return matchesKey || matchesDescription || hasMatchingChildren;
    });
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const pathKey = `${node.source}.${node.nodeId || ""}.${node.path.join(".")}`;
    const isExpanded = expandedPaths.has(pathKey);
    const hasChildren = node.children && node.children.length > 0;
    const filteredChildren = filterTree(node.children, search);

    return (
      <div key={pathKey}>
        <div
          className={`
            flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer
            hover:bg-gray-100 transition-colors group
            ${depth > 0 ? "ml-4" : ""}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(pathKey);
            } else {
              handleSelect(node);
            }
          }}
        >
          {/* Expand/collapse icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            )}
          </div>

          {/* Key name */}
          <span className="text-xs font-medium text-gray-700 flex-1">
            {node.key}
          </span>

          {/* Type badge */}
          <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
            {node.schema.type}
          </span>

          {/* Example value */}
          {node.schema.example !== undefined && !hasChildren && (
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
              {JSON.stringify(node.schema.example).slice(0, 20)}
              {JSON.stringify(node.schema.example).length > 20 ? "..." : ""}
            </span>
          )}

          {/* Copy button */}
          {node.path.length > 0 && (
            <button
              onClick={(e) => handleCopy(node, e)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
              title="Copy path"
            >
              <Copy size={10} className="text-gray-500" />
            </button>
          )}

          {/* Copied indicator */}
          {copiedPath === node.path.join(".") && (
            <span className="text-[10px] text-green-600">Copied!</span>
          )}
        </div>

        {/* Description */}
        {node.schema.description && depth > 0 && isExpanded && (
          <p className="text-[10px] text-gray-400 ml-10 mb-1">
            {node.schema.description}
          </p>
        )}

        {/* Children */}
        {isExpanded &&
          filteredChildren.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  const triggerNode = getTriggerNode(workflow);

  return (
    <div className="w-72 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Database size={12} />
          Available Data
        </h3>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-gray-100">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="max-h-80 overflow-y-auto p-2">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-gray-400" />
            <span className="text-xs text-gray-400 ml-2">Loading data...</span>
          </div>
        )}

        {!loading && variableTree.trigger && (
          <div className="mb-2">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-emerald-50 transition-colors"
              onClick={() => toggleExpand("trigger")}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {expandedPaths.has("trigger") ? (
                  <ChevronDown size={12} className="text-emerald-500" />
                ) : (
                  <ChevronRight size={12} className="text-emerald-500" />
                )}
              </div>
              <Zap size={12} className="text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">
                Trigger
              </span>
              <span className="text-[10px] text-emerald-500 ml-auto">
                {triggerNode ? getNodeDisplayName(triggerNode) : ""}
              </span>
            </div>

            {expandedPaths.has("trigger") && variableTree.trigger.children && (
              <div className="ml-2">
                {filterTree(variableTree.trigger.children, search).map(
                  (child) => renderTreeNode(child, 1),
                )}
              </div>
            )}
          </div>
        )}

        {/* Node sections */}
        {!loading && variableTree.nodes.length > 0 && (
          <div className="border-t border-gray-100 pt-2 mt-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">
              Previous Nodes
            </p>

            {variableTree.nodes.map((nodeTree) => {
              const node = workflow.nodes.find((n) => n.id === nodeTree.nodeId);
              if (!node) return null;

              const pathKey = `nodes.${nodeTree.nodeId}`;
              const isExpanded = expandedPaths.has(pathKey);

              return (
                <div key={nodeTree.nodeId} className="mb-1">
                  <div
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => toggleExpand(pathKey)}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronDown size={12} className="text-blue-500" />
                      ) : (
                        <ChevronRight size={12} className="text-blue-500" />
                      )}
                    </div>
                    <Box size={12} className="text-blue-500" />
                    <span className="text-xs font-medium text-blue-700 truncate flex-1">
                      {getNodeDisplayName(node)}
                    </span>
                    <span className="text-[10px] text-blue-400">
                      {node.subType}
                    </span>
                  </div>

                  {isExpanded && nodeTree.children && (
                    <div className="ml-2">
                      {filterTree(nodeTree.children, search).map((child) =>
                        renderTreeNode(child, 1),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading &&
          !variableTree.trigger &&
          variableTree.nodes.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400">No upstream nodes found</p>
              <p className="text-[10px] text-gray-300 mt-1">
                Connect nodes before this one to access their data
              </p>
            </div>
          )}

        {/* No execution data hint */}
        {!loading && variableTree.trigger && !executionData?.triggerData && (
          <div className="mx-2 mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-center">
            <p className="text-[10px] text-amber-700">
              No execution data yet. Trigger your workflow to see actual values.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-400">
          Click a variable to insert, or use the copy button
        </p>
      </div>
    </div>
  );
}
