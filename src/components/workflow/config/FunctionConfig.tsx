import { useState } from "react";
import { Play, AlertCircle } from "lucide-react";

interface FunctionConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function FunctionConfig({ config, onChange }: FunctionConfigProps) {
  const expression = (config.expression as string) || "";
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTest = () => {
    setTestOutput(null);
    setTestError(null);

    try {
      const sandbox = {
        trigger: { items: [{ name: "A" }, { name: "B" }], count: 5 },
        nodes: {},
        variables: {},
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
      };

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(
        "sandbox",
        `with (sandbox) { return ${expression}; }`,
      );
      const result = fn(sandbox);
      setTestOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : "Evaluation failed",
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Expression */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Expression
        </label>
        <textarea
          value={expression}
          onChange={(e) => onChange("expression", e.target.value)}
          placeholder="trigger.items.map(item => item.name)"
          className="w-full h-24 px-3 py-2 font-mono text-xs bg-gray-900 text-gray-100
                     border border-gray-700 rounded-lg resize-none
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                     placeholder:text-gray-500"
          spellCheck={false}
        />
        <p className="mt-1 text-[10px] text-gray-400">
          JavaScript expression to transform data
        </p>
      </div>

      {/* Examples */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <h4 className="text-xs font-medium text-blue-800 mb-2">Examples</h4>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() =>
              onChange("expression", "trigger.items.map(item => item.name)")
            }
            className="block w-full text-left text-[10px] font-mono text-blue-600 
                       hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
          >
            trigger.items.map(item =&gt; item.name)
          </button>
          <button
            type="button"
            onClick={() =>
              onChange("expression", "trigger.items.filter(i => i.active)")
            }
            className="block w-full text-left text-[10px] font-mono text-blue-600
                       hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
          >
            trigger.items.filter(i =&gt; i.active)
          </button>
          <button
            type="button"
            onClick={() =>
              onChange(
                "expression",
                "trigger.items.reduce((sum, i) => sum + i.amount, 0)",
              )
            }
            className="block w-full text-left text-[10px] font-mono text-blue-600
                       hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
          >
            trigger.items.reduce((sum, i) =&gt; sum + i.amount, 0)
          </button>
          <button
            type="button"
            onClick={() =>
              onChange("expression", "{ ...trigger, processed: true }")
            }
            className="block w-full text-left text-[10px] font-mono text-blue-600
                       hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
          >
            {"{ ...trigger, processed: true }"}
          </button>
        </div>
      </div>

      {/* Test button */}
      <div>
        <button
          type="button"
          onClick={handleTest}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     text-accent bg-accent/10 rounded-md hover:bg-accent/20 transition-colors"
        >
          <Play size={12} />
          Test Expression
        </button>
        <p className="mt-1 text-[10px] text-gray-400">
          Tests with sample data: trigger.items = [{"{name: 'A'}"},{" "}
          {"{name: 'B'}"}]
        </p>
      </div>

      {/* Test output */}
      {testOutput && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <h4 className="text-[10px] font-medium text-gray-400 mb-1">Result</h4>
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {testOutput}
          </pre>
        </div>
      )}

      {/* Test error */}
      {testError && (
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-medium text-red-800">Error</h4>
              <pre className="text-[10px] text-red-600 font-mono mt-1">
                {testError}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
