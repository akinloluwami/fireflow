import { ExpressionInput } from "./ExpressionInput";

interface FilterConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

const operators = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "greater_or_equal", label: "Greater than or equal" },
  { value: "less_or_equal", label: "Less than or equal" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "matches_regex", label: "Matches regex" },
];

export function FilterConfig({ config, onChange, nodeId }: FilterConfigProps) {
  const source = (config.source as string) || "";
  const field = (config.field as string) || "";
  const operator = (config.operator as string) || "equals";
  const value = (config.value as string) || "";

  const showValueField = !["is_empty", "is_not_empty"].includes(operator);

  return (
    <div className="space-y-4">
      {/* Source array */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Source Array
        </label>
        <ExpressionInput
          value={source}
          onChange={(val) => onChange("source", val)}
          nodeId={nodeId}
          placeholder="trigger.items or nodes.xxx.output.data"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Path to the array you want to filter
        </p>
      </div>

      {/* Field to check */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Field to Check
        </label>
        <input
          type="text"
          value={field}
          onChange={(e) => onChange("field", e.target.value)}
          placeholder="status or user.role"
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                     placeholder:text-gray-400"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Field on each item to evaluate (leave empty to check the item itself)
        </p>
      </div>

      {/* Operator */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Condition
        </label>
        <select
          value={operator}
          onChange={(e) => onChange("operator", e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value */}
      {showValueField && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Value
          </label>
          <ExpressionInput
            value={value}
            onChange={(val) => onChange("value", val)}
            nodeId={nodeId}
            placeholder="Value to compare against"
          />
        </div>
      )}

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h4 className="text-[10px] font-medium text-gray-500 mb-1">Preview</h4>
        <p className="text-xs text-gray-700 font-mono">
          {source || "array"}.filter(item =&gt; item
          {field ? `.${field}` : ""}{" "}
          {operator === "is_empty"
            ? "is empty"
            : operator === "is_not_empty"
              ? "is not empty"
              : `${operator.replace(/_/g, " ")} "${value}"`}
          )
        </p>
      </div>
    </div>
  );
}
