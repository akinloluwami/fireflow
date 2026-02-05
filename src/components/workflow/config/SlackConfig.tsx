import { useState, useEffect } from "react";
import { Loader2, Check, Unlink } from "lucide-react";

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SlackConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  workflowId?: string;
}

export function SlackConfig({
  config,
  onChange,
  workflowId,
}: SlackConfigProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);

  useEffect(() => {
    fetchSlackStatus();
  }, []);

  const fetchSlackStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/slack/channels");
      const data = await res.json();

      setConnected(data.connected);
      setWorkspace(data.workspace || null);
      setChannels(data.channels || []);
    } catch (error) {
      console.error("Failed to fetch Slack status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const params = workflowId ? `?workflowId=${workflowId}` : "";
    window.location.href = `/api/integrations/slack/connect${params}`;
  };

  const handleDisconnect = async () => {
    if (
      !confirm("Disconnect Slack? This will affect all workflows using Slack.")
    ) {
      return;
    }

    try {
      await fetch("/api/integrations/slack/disconnect", { method: "POST" });
      setConnected(false);
      setWorkspace(null);
      setChannels([]);
      onChange("channel", "");
    } catch (error) {
      console.error("Failed to disconnect Slack:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center space-y-3">
        <div className="w-12 h-12 mx-auto bg-[#4A154B]/10 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#4A154B">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-800">Connect Slack</h4>
          <p className="text-xs text-gray-500 mt-1">
            Connect your Slack workspace to send messages
          </p>
        </div>
        <button
          onClick={handleConnect}
          className="w-full py-2 px-4 bg-[#4A154B] text-white text-xs font-medium rounded-md 
                     hover:bg-[#3e1240] transition-colors"
        >
          Connect to Slack
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected Status */}
      <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-green-600" />
          <span className="text-xs text-green-700">
            Connected to <strong>{workspace}</strong>
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="p-1 rounded hover:bg-green-100 transition-colors"
          title="Disconnect"
        >
          <Unlink size={12} className="text-green-600" />
        </button>
      </div>

      {/* Channel Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Channel
        </label>
        <select
          value={(config.channel as string) || ""}
          onChange={(e) => onChange("channel", e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          <option value="">Select a channel...</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.isPrivate ? "🔒 " : "#"}
              {ch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Message Template */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Message
        </label>
        <textarea
          value={(config.message as string) || ""}
          onChange={(e) => onChange("message", e.target.value)}
          rows={4}
          placeholder="New form submission from {{trigger.name}}!"
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                     placeholder:text-gray-400"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Use {"{{trigger.fieldName}}"} for form fields
        </p>
      </div>

      {/* Available Variables */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-[11px] font-medium text-gray-600 mb-2">
          Available variables:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {["trigger.name", "trigger.email", "trigger.amount"].map((v) => (
            <code
              key={v}
              className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600 font-mono"
            >
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
