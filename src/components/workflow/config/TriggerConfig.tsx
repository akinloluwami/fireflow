import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Shield,
  ShieldOff,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface TriggerConfigProps {
  workflowId: string;
  subType: string;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

type AuthMethod = "bearer" | "hmac";

interface WebhookAuthStatus {
  webhookAuthEnabled: boolean;
  authMethod: AuthMethod;
  hasSecret: boolean;
  webhookUrl: string;
}

interface WebhookSecretResponse {
  success: boolean;
  secret: string;
  webhookAuthEnabled: boolean;
  authMethod: AuthMethod;
  signatureHeader?: string;
  instructions: {
    note: string;
    header: string;
    algorithm?: string;
    usage: string;
    example: {
      url: string;
      header?: string;
      payload?: string;
      signature?: string;
    };
  };
}

function WebhookAuthSection({ workflowId }: { workflowId: string }) {
  const [authStatus, setAuthStatus] = useState<WebhookAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>("bearer");
  const [newSecret, setNewSecret] = useState<WebhookSecretResponse | null>(
    null,
  );
  const [showSecret, setShowSecret] = useState(true);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Fetch current auth status
  useEffect(() => {
    async function fetchAuthStatus() {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/webhook-secret`);
        if (res.ok) {
          const data = await res.json();
          setAuthStatus(data);
          setSelectedMethod(data.authMethod || "bearer");
        }
      } catch (error) {
        console.error("Failed to fetch webhook auth status:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAuthStatus();
  }, [workflowId]);

  const handleGenerateSecret = async (method: AuthMethod) => {
    setIsGenerating(true);
    setNewSecret(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/webhook-secret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSecret(data);
        setAuthStatus((prev) =>
          prev
            ? {
                ...prev,
                webhookAuthEnabled: true,
                hasSecret: true,
                authMethod: method,
              }
            : prev,
        );
        setShowSecret(true);
      }
    } catch (error) {
      console.error("Failed to generate webhook secret:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDisableAuth = async () => {
    setIsDisabling(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/webhook-secret`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAuthStatus((prev) =>
          prev ? { ...prev, webhookAuthEnabled: false } : prev,
        );
        setNewSecret(null);
      }
    } catch (error) {
      console.error("Failed to disable webhook auth:", error);
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCopySecret = async () => {
    if (!newSecret?.secret) return;
    await navigator.clipboard.writeText(newSecret.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          {authStatus?.webhookAuthEnabled ? (
            <Shield size={12} className="text-green-500" />
          ) : (
            <ShieldOff size={12} className="text-gray-400" />
          )}
          Webhook Authentication
        </label>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            authStatus?.webhookAuthEnabled
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {authStatus?.webhookAuthEnabled
            ? `${authStatus.authMethod === "bearer" ? "Bearer" : "HMAC"}`
            : "Disabled"}
        </span>
      </div>

      {/* New Secret Display - Only shown when just generated */}
      {newSecret && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
            <p className="text-[11px] text-amber-800">
              <strong>
                Save this{" "}
                {newSecret.authMethod === "bearer" ? "token" : "secret"} now!
              </strong>{" "}
              It will not be shown again.
            </p>
          </div>

          {/* Secret Display */}
          <div>
            <label className="block text-[10px] font-medium text-amber-700 mb-1">
              {newSecret.authMethod === "bearer"
                ? "Bearer Token"
                : "HMAC Secret"}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type={showSecret ? "text" : "password"}
                value={newSecret.secret}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs font-mono bg-white border border-amber-300 rounded-md"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-1.5 rounded-md border border-amber-300 hover:bg-amber-100 transition-colors"
              >
                {showSecret ? (
                  <EyeOff size={12} className="text-amber-600" />
                ) : (
                  <Eye size={12} className="text-amber-600" />
                )}
              </button>
              <button
                onClick={handleCopySecret}
                className="p-1.5 rounded-md border border-amber-300 hover:bg-amber-100 transition-colors"
              >
                {copiedSecret ? (
                  <Check size={12} className="text-green-600" />
                ) : (
                  <Copy size={12} className="text-amber-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {authStatus?.webhookAuthEnabled ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateSecret(authStatus.authMethod)}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs 
                         bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Regenerate
            </button>
            <button
              onClick={() =>
                handleGenerateSecret(
                  authStatus.authMethod === "bearer" ? "hmac" : "bearer",
                )
              }
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs 
                         bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Switch to {authStatus.authMethod === "bearer" ? "HMAC" : "Bearer"}
            </button>
            <button
              onClick={handleDisableAuth}
              disabled={isDisabling}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs 
                         bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisabling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ShieldOff size={12} />
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Method selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMethod("bearer")}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  selectedMethod === "bearer"
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Bearer Token
                <span className="block text-[9px] opacity-70">Simple</span>
              </button>
              <button
                onClick={() => setSelectedMethod("hmac")}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  selectedMethod === "hmac"
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                HMAC Signature
                <span className="block text-[9px] opacity-70">More secure</span>
              </button>
            </div>
            <button
              onClick={() => handleGenerateSecret(selectedMethod)}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs 
                         bg-accent hover:bg-accent/90 text-white rounded-md transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Shield size={12} />
              )}
              Enable Authentication
            </button>
          </div>
        )}
      </div>

      {/* Info text */}
      {!authStatus?.webhookAuthEnabled && (
        <p className="text-[10px] text-gray-400">
          Without authentication, anyone who knows the webhook URL can trigger
          this workflow.
        </p>
      )}
    </div>
  );
}

export function TriggerConfig({
  workflowId,
  subType,
  config,
  onChange,
}: TriggerConfigProps) {
  const [copied, setCopied] = useState(false);

  // Generate webhook URL based on trigger type
  const getWebhookUrl = () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://fireflow.run";

    if (subType === "form-submission") {
      return `${baseUrl}/api/webhooks/tally/${workflowId}`;
    }

    if (subType === "webhook") {
      return `${baseUrl}/api/webhooks/generic/${workflowId}`;
    }

    return null;
  };

  const webhookUrl = getWebhookUrl();

  const handleCopy = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (subType === "form-submission") {
    return (
      <div className="space-y-4">
        {/* Webhook URL Display */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tally Webhook URL
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={webhookUrl || ""}
              readOnly
              className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md text-gray-600"
            />
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-medium text-blue-800">
            How to connect Tally
          </h4>
          <ol className="text-[11px] text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Copy the webhook URL above</li>
            <li>Open your form on Tally.so</li>
            <li>Go to Integrations → Webhooks</li>
            <li>Paste the URL and save</li>
          </ol>
          <a
            href="https://tally.so/help/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1"
          >
            <ExternalLink size={10} />
            Tally webhook docs
          </a>
        </div>

        {/* Form Field Mapping (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Form ID (optional)
          </label>
          <input
            type="text"
            value={(config.formId as string) || ""}
            onChange={(e) => onChange("formId", e.target.value)}
            placeholder="form_xxx"
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Restrict to a specific Tally form
          </p>
        </div>
      </div>
    );
  }

  if (subType === "webhook") {
    return (
      <div className="space-y-4">
        {/* Webhook URL Display */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Webhook URL
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={webhookUrl || ""}
              readOnly
              className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md text-gray-600"
            />
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Webhook Authentication */}
        <WebhookAuthSection workflowId={workflowId} />

        {/* Method Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Allowed Methods
          </label>
          <select
            value={(config.method as string) || "POST"}
            onChange={(e) => onChange("method", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>
    );
  }

  if (subType === "schedule") {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cron Expression
          </label>
          <input
            type="text"
            value={(config.cron as string) || "0 9 * * *"}
            onChange={(e) => onChange("cron", e.target.value)}
            placeholder="0 9 * * *"
            className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            minute hour day month weekday
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Timezone
          </label>
          <select
            value={(config.timezone as string) || "UTC"}
            onChange={(e) => onChange("timezone", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>

        {/* Schedule Preview */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[11px] text-gray-600">
            <span className="font-medium">Next run:</span> Every day at 9:00 AM
            UTC
          </p>
        </div>
      </div>
    );
  }

  // Manual trigger - no config needed, use Execute workflow button
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500">
        Click <strong>"Execute workflow"</strong> at the bottom to run this
        workflow manually.
      </p>
    </div>
  );
}
