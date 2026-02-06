import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface TransformNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function TransformNodeComponent({ id, data, selected }: TransformNodeProps) {
  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="transform"
      color="#8b5cf6"
      hasInputHandle={true}
      hasOutputHandle={true}
    />
  );
}

export const TransformNode = memo(TransformNodeComponent);
