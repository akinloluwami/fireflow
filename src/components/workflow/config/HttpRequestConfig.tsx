import { useState } from "react";
import { ExpressionInput } from "./ExpressionInput";
import { Plus, Trash2, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { CredentialSelector } from "@/components/credentials";

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

const AUTH_TYPES = [
  { value: "none", label: "No Authentication" },
  { value: "bearer", label: "Bearer Token" },
  { value: "api_key", label: "API Key" },
  { value: "basic", label: "Basic Auth" },
];

export function HttpRequestConfig({
  config,
  onChange,
  nodeId,
}: HttpRequestConfigProps) {
  const authentication = (config.authentication as string) || "none";
  const authCredentialId = config.authCredentialId as string | undefined;

  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [showAuth, setShowAuth] = useState(
    Boolean(config.authentication && config.authentication !== "none"),
  );

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

      {/* Authentication Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAuth(!showAuth)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
            <Shield size={12} className="text-gray-500" />
            Authentication
            {authentication !== "none" && (
              <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                {AUTH_TYPES.find((a) => a.value === authentication)?.label ??
                  ""}
              </span>
            )}
          </span>
          {showAuth ? (
            <ChevronUp size={14} className="text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </button>

        {showAuth && (
          <div className="p-3 space-y-3 bg-white">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Auth Type
              </label>
              <select
                value={authentication}
                onChange={(e) => {
                  onChange("authentication", e.target.value);
                  // Clear credential when changing auth type
                  onChange("authCredentialId", undefined);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                           focus:outline-none focus:ring-1 focus:ring-accent/30"
              >
                {AUTH_TYPES.map((auth) => (
                  <option key={auth.value} value={auth.value}>
                    {auth.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bearer Token Auth */}
            {authentication === "bearer" && (
              <CredentialSelector
                type="http_bearer"
                value={authCredentialId}
                onChange={(credentialId) =>
                  onChange("authCredentialId", credentialId)
                }
                label="Bearer Token Credential"
                placeholder="Select a bearer token..."
              />
            )}

            {/* API Key Auth */}
            {authentication === "api_key" && (
              <CredentialSelector
                type="http_api_key"
                value={authCredentialId}
                onChange={(credentialId) =>
                  onChange("authCredentialId", credentialId)
                }
                label="API Key Credential"
                placeholder="Select an API key..."
              />
            )}

            {/* Basic Auth */}
            {authentication === "basic" && (
              <CredentialSelector
                type="http_basic"
                value={authCredentialId}
                onChange={(credentialId) =>
                  onChange("authCredentialId", credentialId)
                }
                label="Basic Auth Credential"
                placeholder="Select basic auth credentials..."
              />
            )}

            {authentication !== "none" && !authCredentialId && (
              <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded">
                Select a credential or create one to use this authentication
                method.
              </p>
            )}
          </div>
        )}
      </div>

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
