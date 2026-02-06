import { ExpressionInput } from "./ExpressionInput";
import { Info } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";

interface ConditionConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

/**
 * Convert a variable path with node UUID to a friendly display name
 */
function getFriendlyField(field: string, nodeMap: Map<string, string>): string {
  // Match {{ nodes.UUID.output.xxx }} pattern
  const nodeMatch = field.match(
    /\{\{\s*nodes\.([a-f0-9-]+)\.output\.(.+?)\s*\}\}/,
  );
  if (nodeMatch) {
    const [, nodeId, restPath] = nodeMatch;
    const nodeName = nodeMap.get(nodeId) || "Unknown Node";
    return `{{ ${nodeName}.${restPath} }}`;
  }
  return field;
}

const OPERATORS = [
  { value: "equals", label: "Equals", description: "Exact match" },
  {
    value: "not-equals",
    label: "Not Equals",
    description: "Not an exact match",
  },
  { value: "contains", label: "Contains", description: "Text includes value" },
  {
    value: "not-contains",
    label: "Not Contains",
    description: "Text doesn't include value",
  },
  { value: "greater", label: "Greater Than", description: "Number is larger" },
  {
    value: "greater-or-equal",
    label: "Greater or Equal",
    description: "Number is larger or equal",
  },
  { value: "less", label: "Less Than", description: "Number is smaller" },
  {
    value: "less-or-equal",
    label: "Less or Equal",
    description: "Number is smaller or equal",
  },
  {
    value: "is-empty",
    label: "Is Empty",
    description: "Value is empty or null",
  },
  {
    value: "is-not-empty",
    label: "Is Not Empty",
    description: "Value exists and is not empty",
  },
  {
    value: "starts-with",
    label: "Starts With",
    description: "Text begins with value",
  },
  {
    value: "ends-with",
    label: "Ends With",
    description: "Text ends with value",
  },
  {
    value: "regex",
    label: "Matches Regex",
    description: "Matches regular expression",
  },
];

export function ConditionConfig({
  config,
  onChange,
  nodeId,
}: ConditionConfigProps) {
  const { workflow } = useWorkflowStore();
  const field = (config.field as string) || "";
  const operator = (config.operator as string) || "equals";
  const value = (config.value as string) || "";

  // Build a map of node IDs to their labels for friendly display
  const nodeMap = new Map<string, string>();
  for (const node of workflow.nodes) {
    nodeMap.set(node.id, node.data.label || node.subType);
  }

  // Some operators don't need a value
  const operatorNeedsValue = !["is-empty", "is-not-empty"].includes(operator);

  // Get friendly field name for preview
  const friendlyField = getFriendlyField(field, nodeMap);

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
        <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          Configure conditions to route your workflow based on data values. Use
          the <span className="font-medium">variable picker</span> to reference
          data from previous nodes.
        </p>
      </div>

      {/* Field to Check */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Field to Check
        </label>
        <ExpressionInput
          value={field}
          onChange={(val) => onChange("field", val)}
          nodeId={nodeId}
          placeholder="e.g., {{ trigger.body.status }}"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          The value from a previous node to evaluate
        </p>
      </div>

      {/* Operator */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Condition
        </label>
        <select
          value={operator}
          onChange={(e) => onChange("operator", e.target.value)}
          className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500
                     transition-colors"
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-gray-400">
          {OPERATORS.find((op) => op.value === operator)?.description}
        </p>
      </div>

      {/* Value to Compare */}
      {operatorNeedsValue && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Compare To
          </label>
          <ExpressionInput
            value={value}
            onChange={(val) => onChange("value", val)}
            nodeId={nodeId}
            placeholder="e.g., active or {{ nodes.previous.output.value }}"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Static value or dynamic reference from another node
          </p>
        </div>
      )}

      {/* Branch Preview */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 mb-2">Branches</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 rounded-md border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[11px] text-emerald-700 font-medium">
              True
            </span>
            <span className="text-[10px] text-emerald-600 ml-auto">
              → Condition matches
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 rounded-md border border-red-100">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-[11px] text-red-700 font-medium">False</span>
            <span className="text-[10px] text-red-600 ml-auto">
              → Condition doesn't match
            </span>
          </div>
        </div>
      </div>

      {/* Expression Preview */}
      {field && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-500 mb-2">Preview</p>
          <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
            <code className="text-[11px] text-gray-700 font-mono break-all">
              if ({friendlyField} {getOperatorSymbol(operator)}{" "}
              {operatorNeedsValue ? value || '""' : ""})
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function getOperatorSymbol(operator: string): string {
  switch (operator) {
    case "equals":
      return "===";
    case "not-equals":
      return "!==";
    case "contains":
      return "contains";
    case "not-contains":
      return "!contains";
    case "greater":
      return ">";
    case "greater-or-equal":
      return ">=";
    case "less":
      return "<";
    case "less-or-equal":
      return "<=";
    case "is-empty":
      return "isEmpty";
    case "is-not-empty":
      return "isNotEmpty";
    case "starts-with":
      return "startsWith";
    case "ends-with":
      return "endsWith";
    case "regex":
      return "matches";
    default:
      return operator;
  }
}
