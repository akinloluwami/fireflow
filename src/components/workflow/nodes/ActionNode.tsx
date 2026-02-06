import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface ActionNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function ActionNodeComponent({ id, data, selected }: ActionNodeProps) {
  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="action"
      color="#3b82f6"
      hasInputHandle={true}
      hasOutputHandle={true}
    />
  );
}

export const ActionNode = memo(ActionNodeComponent);
