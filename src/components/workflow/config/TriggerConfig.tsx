import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface TriggerConfigProps {
  workflowId: string;
  subType: string;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
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
