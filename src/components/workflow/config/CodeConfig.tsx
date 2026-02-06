import { useState } from "react";
import { Play, AlertCircle } from "lucide-react";

interface CodeConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function CodeConfig({ config, onChange }: CodeConfigProps) {
  const code = (config.code as string) || "";
  const language = (config.language as string) || "javascript";
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTestCode = () => {
    setTestOutput(null);
    setTestError(null);

    try {
      // Create a mock sandbox for testing
      const sandbox = {
        trigger: { example: "trigger data" },
        nodes: {},
        variables: {},
        console: {
          log: (...args: unknown[]) => {
            setTestOutput((prev) =>
              prev ? `${prev}\n${args.join(" ")}` : args.join(" "),
            );
          },
        },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
      };

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function("sandbox", `with (sandbox) { ${code} }`);
      const result = fn(sandbox);

      if (result !== undefined) {
        setTestOutput((prev) =>
          prev
            ? `${prev}\n→ ${JSON.stringify(result)}`
            : `→ ${JSON.stringify(result)}`,
        );
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Execution failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Language
        </label>
        <select
          value={language}
          onChange={(e) => onChange("language", e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          <option value="javascript">JavaScript</option>
        </select>
      </div>

      {/* Code editor */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Code
        </label>
        <div className="relative">
          <textarea
            value={code}
            onChange={(e) => onChange("code", e.target.value)}
            placeholder={`// Access data with:
// trigger.fieldName
// nodes.nodeId (previous node outputs)
// variables.name

return trigger.data;`}
            className="w-full h-48 px-3 py-2 font-mono text-xs bg-gray-900 text-gray-100 
                       border border-gray-700 rounded-lg resize-none
                       focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                       placeholder:text-gray-500"
            spellCheck={false}
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          Use <code className="bg-gray-100 px-1 rounded">return</code> to set
          the node output
        </p>
      </div>

      {/* Available variables hint */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <h4 className="text-xs font-medium text-blue-800 mb-1">
          Available Variables
        </h4>
        <ul className="text-[10px] text-blue-600 space-y-0.5">
          <li>
            <code>trigger</code> - Trigger data (e.g., trigger.body.field)
          </li>
          <li>
            <code>nodes</code> - Previous node outputs (e.g.,
            nodes["nodeId"].field)
          </li>
          <li>
            <code>variables</code> - Custom variables set earlier
          </li>
          <li>
            <code>loop</code> - Current loop item (if inside a loop)
          </li>
        </ul>
      </div>

      {/* Test button */}
      <div>
        <button
          type="button"
          onClick={handleTestCode}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     text-accent bg-accent/10 rounded-md hover:bg-accent/20 transition-colors"
        >
          <Play size={12} />
          Test Code
        </button>
      </div>

      {/* Test output */}
      {testOutput && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <h4 className="text-[10px] font-medium text-gray-400 mb-1">Output</h4>
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
