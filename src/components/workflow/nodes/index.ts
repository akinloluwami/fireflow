import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { TransformNode } from "./TransformNode";
import { OthersNode } from "./OthersNode";
import { AINode } from "./AINode";
import { SentimentNode } from "./SentimentNode";
import { SummarizationNode } from "./SummarizationNode";
import { ModelPickerNode } from "./ModelPickerNode";

// Node type registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  transform: TransformNode,
  others: OthersNode,
  ai: AINode,
  sub: ModelPickerNode,
};

export {
  TriggerNode,
  ActionNode,
  ConditionNode,
  TransformNode,
  OthersNode,
  AINode,
  SentimentNode,
  SummarizationNode,
  ModelPickerNode,
};
