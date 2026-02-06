import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData, ConditionSubType } from "@/lib/workflow/types";

interface SwitchCase {
  id: string;
  value: string;
  label?: string;
}

interface ConditionNodeProps {
  id: string;
  data: NodeData & { icon?: string; subType?: ConditionSubType };
  selected?: boolean;
}

function ConditionNodeComponent({ id, data, selected }: ConditionNodeProps) {
  const subType = data.subType || "if-else";

  // For switch nodes, get the cases from config
  const configAny = data.config as Record<string, unknown> | undefined;
  const switchCases = (configAny?.cases as SwitchCase[] | undefined) || [];
  const hasDefault = (configAny?.hasDefault as boolean) || false;

  // Build output handles based on subType
  const getOutputHandles = () => {
    if (subType === "loop") {
      return [
        { id: "body", label: "body", color: "#f59e0b" },
        { id: "done", label: "done", color: "#3b82f6" },
      ];
    }

    if (subType === "switch") {
      const handles = switchCases.slice(0, 5).map((c, i) => ({
        id: c.id,
        label: c.label || c.value || `${i}`,
        color: "#a855f7",
      }));
      if (hasDefault) {
        handles.push({ id: "default", label: "default", color: "#6b7280" });
      }
      return handles;
    }

    // Default: if-else
    return [
      { id: "true", label: "true", color: "#10b981" },
      { id: "false", label: "false", color: "#ef4444" },
    ];
  };

  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="condition"
      color="#f59e0b"
      hasInputHandle={true}
      hasOutputHandle={false}
      outputHandles={getOutputHandles()}
    />
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
