import {
  nodeDefinitions,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/workflow/node-definitions";
import { useWorkflowStore } from "@/lib/workflow/store";
import { NodeIcon } from "./icons";
import type { NodeCategory, NodeSubType } from "@/lib/workflow/types";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface NodePaletteProps {
  onDragStart?: (
    event: React.DragEvent,
    nodeType: NodeCategory,
    subType: NodeSubType,
  ) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const { addNode } = useWorkflowStore();
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    trigger: true,
    action: true,
    condition: true,
    transform: true,
  });

  const categories = useMemo(() => {
    const filtered = nodeDefinitions.filter(
      (node) =>
        node.label.toLowerCase().includes(search.toLowerCase()) ||
        node.description.toLowerCase().includes(search.toLowerCase()),
    );

    return ["trigger", "action", "condition", "transform"].map((category) => ({
      id: category,
      label: getCategoryLabel(category),
      color: getCategoryColor(category),
      nodes: filtered.filter((node) => node.type === category),
    }));
  }, [search]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleDragStart = (
    event: React.DragEvent,
    nodeType: NodeCategory,
    subType: NodeSubType,
  ) => {
    event.dataTransfer.setData(
      "application/fireflow-node",
      JSON.stringify({ nodeType, subType }),
    );
    event.dataTransfer.effectAllowed = "move";
    onDragStart?.(event, nodeType, subType);
  };

  const handleAddNode = (nodeType: NodeCategory, subType: NodeSubType) => {
    // Add node at center of canvas (will be adjusted by canvas)
    addNode(nodeType, subType, { x: 100, y: 100 });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2.5">
          Nodes
        </h2>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                       placeholder:text-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => (
          <div key={category.id} className="mb-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
            >
              {expandedCategories[category.id] ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-xs font-medium text-gray-600">
                {category.label}
              </span>
              <span className="ml-auto text-[10px] text-gray-400">
                {category.nodes.length}
              </span>
            </button>

            {/* Nodes in Category */}
            {expandedCategories[category.id] && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {category.nodes.map((node) => (
                  <div
                    key={`${node.type}-${node.subType}`}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, node.type, node.subType)
                    }
                    onClick={() => handleAddNode(node.type, node.subType)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded cursor-grab
                               hover:bg-gray-50 active:cursor-grabbing
                               border border-transparent hover:border-gray-100
                               transition-colors group"
                  >
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded"
                      style={{ backgroundColor: `${node.color}10` }}
                    >
                      <NodeIcon
                        name={node.icon}
                        size={14}
                        style={{ color: node.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {node.label}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {node.description}
                      </p>
                    </div>
                  </div>
                ))}
                {category.nodes.length === 0 && (
                  <p className="text-[10px] text-gray-400 px-2 py-1.5">
                    No nodes found
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="p-2 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-400 text-center">
          Drag or click to add
        </p>
      </div>
    </div>
  );
}
