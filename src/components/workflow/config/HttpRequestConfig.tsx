import { useState } from "react";
import { ExpressionInput } from "./ExpressionInput";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface HttpRequestConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export function HttpRequestConfig({
  config,
  onChange,
  nodeId,
}: HttpRequestConfigProps) {
  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(false);

  const headers = (config.headers as Record<string, string>) || {};
  const headerEntries = Object.entries(headers);

  const handleAddHeader = () => {
    const newHeaders = { ...headers, "": "" };
    onChange("headers", newHeaders);
  };

  const handleUpdateHeader = (
    oldKey: string,
    newKey: string,
    value: string,
  ) => {
    const newHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (k === oldKey) {
        if (newKey) newHeaders[newKey] = value;
      } else {
        newHeaders[k] = v;
      }
    }
    onChange("headers", newHeaders);
  };

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    onChange("headers", newHeaders);
  };

  const method = (config.method as string) || "GET";
  const showBodySection = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <div className="space-y-4">
      {/* Method & URL */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => onChange("method", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            URL
          </label>
          <ExpressionInput
            value={(config.url as string) || ""}
            onChange={(value) => onChange("url", value)}
            nodeId={nodeId}
            placeholder="https://api.example.com/endpoint"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Use {"{{ trigger.field }}"} for dynamic values
          </p>
        </div>
      </div>

      {/* Headers Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHeaders(!showHeaders)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-medium text-gray-700">
            Headers {headerEntries.length > 0 && `(${headerEntries.length})`}
          </span>
          {showHeaders ? (
            <ChevronUp size={14} className="text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </button>

        {showHeaders && (
          <div className="p-3 space-y-2 bg-white">
            {headerEntries.map(([key, value], index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) =>
                    handleUpdateHeader(key, e.target.value, value)
                  }
                  placeholder="Header name"
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md
                             focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleUpdateHeader(key, key, e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md
                             focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHeader(key)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddHeader}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              <Plus size={12} />
              Add header
            </button>
          </div>
        )}
      </div>

      {/* Body Section */}
      {showBodySection && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBody(!showBody)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xs font-medium text-gray-700">
              Request Body
            </span>
            {showBody ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </button>

          {showBody && (
            <div className="p-3 bg-white">
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Content Type
                </label>
                <select
                  value={(config.contentType as string) || "application/json"}
                  onChange={(e) => onChange("contentType", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                             focus:outline-none focus:ring-1 focus:ring-accent/30"
                >
                  <option value="application/json">JSON</option>
                  <option value="application/x-www-form-urlencoded">
                    Form URL Encoded
                  </option>
                  <option value="text/plain">Plain Text</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Body
                </label>
                <textarea
                  value={(config.body as string) || ""}
                  onChange={(e) => onChange("body", e.target.value)}
                  rows={6}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-gray-900 text-gray-100 
                             border border-gray-700 rounded-md resize-none
                             focus:outline-none focus:ring-1 focus:ring-accent/30
                             placeholder:text-gray-500"
                  placeholder='{"key": "{{ trigger.value }}"}'
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeout */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={(config.timeout as number) || 30}
          onChange={(e) => onChange("timeout", parseInt(e.target.value) || 30)}
          min={1}
          max={300}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>
    </div>
  );
}
