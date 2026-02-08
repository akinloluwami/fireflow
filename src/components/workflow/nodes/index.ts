import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { TransformNode } from "./TransformNode";
import { OthersNode } from "./OthersNode";
import { SentimentNode } from "./SentimentNode";
import { ModelPickerNode } from "./ModelPickerNode";

// Node type registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  transform: TransformNode,
  others: OthersNode,
  ai: SentimentNode,
  sub: ModelPickerNode,
};

export {
  TriggerNode,
  ActionNode,
  ConditionNode,
  TransformNode,
  OthersNode,
  SentimentNode,
  ModelPickerNode,
};
