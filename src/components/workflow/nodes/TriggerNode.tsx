import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface TriggerNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function TriggerNodeComponent({ id, data, selected }: TriggerNodeProps) {
  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="trigger"
      color="#10b981"
      hasInputHandle={false}
      hasOutputHandle={true}
    />
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
