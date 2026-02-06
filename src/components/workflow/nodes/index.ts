import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { TransformNode } from "./TransformNode";
import { OthersNode } from "./OthersNode";

// Node type registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  transform: TransformNode,
  others: OthersNode,
};

export { TriggerNode, ActionNode, ConditionNode, TransformNode, OthersNode };
