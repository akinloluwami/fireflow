import { ExpressionInput } from "./ExpressionInput";
import { Info, Repeat } from "lucide-react";

interface LoopConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function LoopConfig({ config, onChange, nodeId }: LoopConfigProps) {
  const items = (config.items as string) || "";
  const itemVariable = (config.itemVariable as string) || "item";
  const indexVariable = (config.indexVariable as string) || "index";
  const maxIterations = (config.maxIterations as number) || 100;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
        <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          Execute downstream nodes once for each item in an array. Perfect for
          processing lists, sending bulk notifications, or batch operations.
        </p>
      </div>

      {/* Items to Loop */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Items to Loop Over
        </label>
        <ExpressionInput
          value={items}
          onChange={(val) => onChange("items", val)}
          nodeId={nodeId}
          placeholder="e.g., {{ trigger.items }} or {{ trigger.recipients }}"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          An array from a previous node to iterate over
        </p>
      </div>

      {/* Variable Names */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Item Variable Name
          </label>
          <input
            type="text"
            value={itemVariable}
            onChange={(e) => onChange("itemVariable", e.target.value)}
            placeholder="item"
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Access as <code className="text-accent">{"{{ loop.item }}"}</code>
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Index Variable Name
          </label>
          <input
            type="text"
            value={indexVariable}
            onChange={(e) => onChange("indexVariable", e.target.value)}
            placeholder="index"
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Access as <code className="text-accent">{"{{ loop.index }}"}</code>
          </p>
        </div>
      </div>

      {/* Max Iterations (safety limit) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Maximum Iterations
        </label>
        <input
          type="number"
          value={maxIterations}
          onChange={(e) =>
            onChange("maxIterations", parseInt(e.target.value) || 100)
          }
          min={1}
          max={1000}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Safety limit to prevent infinite loops (max 1000)
        </p>
      </div>

      {/* Loop Flow Visualization */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 mb-2">
          How it works
        </p>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-gray-700">
              For each item in array:
            </span>
          </div>

          <div className="space-y-2 ml-5">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
              <div className="text-[11px] text-gray-600">
                <code className="text-accent bg-accent/10 px-1 rounded">
                  {"{{ loop." + itemVariable + " }}"}
                </code>{" "}
                = current item
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
              <div className="text-[11px] text-gray-600">
                <code className="text-accent bg-accent/10 px-1 rounded">
                  {"{{ loop." + indexVariable + " }}"}
                </code>{" "}
                = 0, 1, 2, ...
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
              <div className="text-[11px] text-gray-600">
                Execute all connected nodes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Example */}
      {items && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-500 mb-2">Example</p>
          <div className="p-2.5 bg-gray-900 rounded-lg">
            <code className="text-[11px] text-gray-100 font-mono">
              <span className="text-purple-400">for</span> (
              <span className="text-blue-400">{itemVariable}</span>,{" "}
              <span className="text-blue-400">{indexVariable}</span>){" "}
              <span className="text-purple-400">in</span>{" "}
              <span className="text-green-400">{items}</span> {"{"}
              <br />
              <span className="text-gray-500 ml-4">
                {"// Execute downstream nodes"}
              </span>
              <br />
              {"}"}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
