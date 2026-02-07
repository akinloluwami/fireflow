import { useState } from "react";
import { ExpressionTextarea } from "./ExpressionInput";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CredentialSelector } from "@/components/credentials";

interface DatabaseConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function DatabaseConfig({
  config,
  onChange,
  nodeId,
}: DatabaseConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {/* Credential Selector */}
      <CredentialSelector
        type="postgres"
        value={config.credentialId as string | undefined}
        onChange={(credentialId) => onChange("credentialId", credentialId)}
        label="PostgreSQL Credential"
        placeholder="Select a database credential..."
        required
      />

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          SQL Query
        </label>
        <ExpressionTextarea
          value={(config.query as string) || ""}
          onChange={(value) => onChange("query", value)}
          nodeId={nodeId}
          placeholder="SELECT * FROM users WHERE status = 'active'"
          className="font-mono"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Use {"{{ trigger.field }}"} or {"{{ nodes.nodeId.output.field }}"} for
          dynamic values
        </p>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-md">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={(config.timeout as number) || 30000}
                onChange={(e) =>
                  onChange("timeout", parseInt(e.target.value, 10))
                }
                min={1000}
                max={300000}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                           focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max Rows
              </label>
              <input
                type="number"
                value={(config.maxRows as number) || 1000}
                onChange={(e) =>
                  onChange("maxRows", parseInt(e.target.value, 10))
                }
                min={1}
                max={100000}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                           focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Limit result set size for performance
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
        <h4 className="text-xs font-medium text-blue-800 mb-1">
          SQL Query Examples
        </h4>
        <div className="text-[10px] text-blue-600 space-y-1 font-mono">
          <p>SELECT * FROM users WHERE id = {"'{{ trigger.userId }}'"}</p>
          <p>INSERT INTO logs (message) VALUES ({"'{{ trigger.message }}'"})</p>
        </div>
      </div>
    </div>
  );
}
