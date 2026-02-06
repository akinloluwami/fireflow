import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface OthersNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function OthersNodeComponent({ id, data, selected }: OthersNodeProps) {
  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="others"
      color="#6b7280"
      hasInputHandle={true}
      hasOutputHandle={true}
    />
  );
}

export const OthersNode = memo(OthersNodeComponent);
