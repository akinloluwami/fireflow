import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface SummarizationNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function SummarizationNodeComponent({
  id,
  data,
  selected,
}: SummarizationNodeProps) {
  const inputHandles = [{ id: "model", label: "Model", required: true }];

  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="ai"
      color="#ec4899"
      hasInputHandle={true}
      hasOutputHandle={true}
      inputHandles={inputHandles}
      showLabelInside={true}
    />
  );
}

export const SummarizationNode = memo(SummarizationNodeComponent);
