import { ExpressionInput } from "./ExpressionInput";

interface AggregateConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

const operations = [
  {
    value: "array",
    label: "Collect as Array",
    description: "Combine all values into an array",
  },
  { value: "sum", label: "Sum", description: "Add all numeric values" },
  { value: "count", label: "Count", description: "Count the number of items" },
  {
    value: "average",
    label: "Average",
    description: "Calculate the mean of numeric values",
  },
  { value: "min", label: "Minimum", description: "Find the smallest value" },
  { value: "max", label: "Maximum", description: "Find the largest value" },
  { value: "first", label: "First", description: "Get the first item" },
  { value: "last", label: "Last", description: "Get the last item" },
  {
    value: "concat",
    label: "Concatenate",
    description: "Join values as a string",
  },
  { value: "unique", label: "Unique", description: "Remove duplicate values" },
];

export function AggregateConfig({
  config,
  onChange,
  nodeId,
}: AggregateConfigProps) {
  const source = (config.source as string) || "";
  const operation = (config.operation as string) || "array";
  const field = (config.field as string) || "";

  const selectedOp = operations.find((op) => op.value === operation);
  const needsNumericField = ["sum", "average", "min", "max"].includes(
    operation,
  );

  return (
    <div className="space-y-4">
      {/* Source */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Source Array
        </label>
        <ExpressionInput
          value={source}
          onChange={(val) => onChange("source", val)}
          nodeId={nodeId}
          placeholder="trigger.items"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Path to the array you want to aggregate
        </p>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => onChange("operation", e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {operations.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        {selectedOp && (
          <p className="mt-1 text-[10px] text-gray-400">
            {selectedOp.description}
          </p>
        )}
      </div>

      {/* Field (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Field{" "}
          {needsNumericField
            ? "(required for numeric operations)"
            : "(optional)"}
        </label>
        <input
          type="text"
          value={field}
          onChange={(e) => onChange("field", e.target.value)}
          placeholder="amount or user.score"
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                     placeholder:text-gray-400"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Field to extract from each item for aggregation
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h4 className="text-[10px] font-medium text-gray-500 mb-1">Example</h4>
        <div className="text-[10px] text-gray-600 space-y-1">
          <div className="font-mono bg-gray-100 p-2 rounded">
            {operation === "sum" && <>Input: [1, 2, 3] → Output: 6</>}
            {operation === "count" && <>Input: [a, b, c] → Output: 3</>}
            {operation === "average" && <>Input: [10, 20, 30] → Output: 20</>}
            {operation === "min" && <>Input: [5, 2, 8] → Output: 2</>}
            {operation === "max" && <>Input: [5, 2, 8] → Output: 8</>}
            {operation === "first" && <>Input: [a, b, c] → Output: a</>}
            {operation === "last" && <>Input: [a, b, c] → Output: c</>}
            {operation === "concat" && (
              <>Input: ["a", "b", "c"] → Output: "abc"</>
            )}
            {operation === "unique" && (
              <>Input: [1, 2, 2, 3] → Output: [1, 2, 3]</>
            )}
            {operation === "array" && (
              <>Input: items → Output: [item1, item2, ...]</>
            )}
          </div>
        </div>
      </div>

      {/* Output info */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <h4 className="text-xs font-medium text-blue-800 mb-1">Output</h4>
        <ul className="text-[10px] text-blue-600 space-y-0.5">
          <li>
            <code>result</code> - The aggregated value
          </li>
          <li>
            <code>inputCount</code> - Number of input items
          </li>
          <li>
            <code>operation</code> - The operation performed
          </li>
        </ul>
      </div>
    </div>
  );
}
