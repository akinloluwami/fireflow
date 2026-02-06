import { ExpressionInput } from "./ExpressionInput";

interface SplitConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function SplitConfig({ config, onChange, nodeId }: SplitConfigProps) {
  const source = (config.source as string) || "";
  const mode = (config.mode as string) || "items";
  const chunkSize = (config.chunkSize as number) || 10;

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
          placeholder="trigger.items"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Path to the array you want to split
        </p>
      </div>

      {/* Split mode */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Split Mode
        </label>
        <select
          value={mode}
          onChange={(e) => onChange("mode", e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          <option value="items">Individual Items</option>
          <option value="chunks">Chunks (batches)</option>
        </select>
        <p className="mt-1 text-[10px] text-gray-400">
          {mode === "items"
            ? "Each item processed separately"
            : "Items grouped into chunks"}
        </p>
      </div>

      {/* Chunk size (only for chunks mode) */}
      {mode === "chunks" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Chunk Size
          </label>
          <input
            type="number"
            value={chunkSize}
            onChange={(e) =>
              onChange("chunkSize", parseInt(e.target.value) || 10)
            }
            min={1}
            max={1000}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Number of items per chunk
          </p>
        </div>
      )}

      {/* Output preview */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h4 className="text-[10px] font-medium text-gray-500 mb-1">Output</h4>
        {mode === "items" ? (
          <ul className="text-[10px] text-gray-600 space-y-0.5">
            <li>
              <code className="bg-gray-100 px-1 rounded">items</code> - Array of
              individual items
            </li>
            <li>
              <code className="bg-gray-100 px-1 rounded">count</code> - Total
              item count
            </li>
          </ul>
        ) : (
          <ul className="text-[10px] text-gray-600 space-y-0.5">
            <li>
              <code className="bg-gray-100 px-1 rounded">chunks</code> - Array
              of item arrays
            </li>
            <li>
              <code className="bg-gray-100 px-1 rounded">chunkCount</code> -
              Number of chunks
            </li>
            <li>
              <code className="bg-gray-100 px-1 rounded">totalItems</code> -
              Total item count
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
