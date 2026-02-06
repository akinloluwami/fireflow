import { useState, useEffect } from "react";
import { Loader2, Check, Unlink } from "lucide-react";
import { ExpressionTextarea } from "./ExpressionInput";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  guildId: string;
}

interface DiscordConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  workflowId?: string;
  nodeId?: string;
}

export function DiscordConfig({
  config,
  onChange,
  workflowId,
  nodeId,
}: DiscordConfigProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const selectedGuildId = (config.guildId as string) || "";

  useEffect(() => {
    fetchDiscordStatus();
  }, []);

  useEffect(() => {
    if (selectedGuildId) {
      fetchChannels(selectedGuildId);
    } else {
      setChannels([]);
    }
  }, [selectedGuildId]);

  const fetchDiscordStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/discord/guilds");
      const data = await res.json();

      setConnected(data.connected);
      setGuilds(data.guilds || []);
    } catch (error) {
      console.error("Failed to fetch Discord status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (guildId: string) => {
    setLoadingChannels(true);
    try {
      const res = await fetch(
        `/api/integrations/discord/channels?guildId=${guildId}`,
      );
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (error) {
      console.error("Failed to fetch Discord channels:", error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleConnect = () => {
    const params = workflowId ? `?workflowId=${workflowId}` : "";
    window.location.href = `/api/integrations/discord/connect${params}`;
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Disconnect Discord? This will affect all workflows using Discord.",
      )
    ) {
      return;
    }

    try {
      await fetch("/api/integrations/discord/disconnect", { method: "POST" });
      setConnected(false);
      setGuilds([]);
      setChannels([]);
      onChange("guildId", "");
      onChange("channelId", "");
    } catch (error) {
      console.error("Failed to disconnect Discord:", error);
    }
  };

  const handleGuildChange = (guildId: string) => {
    onChange("guildId", guildId);
    onChange("channelId", ""); // Reset channel when guild changes
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!connected || guilds.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center space-y-3">
        <div className="w-12 h-12 mx-auto bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#5865F2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-800">Add to Discord</h4>
          <p className="text-xs text-gray-500 mt-1">
            Add the FireFlow bot to your Discord server
          </p>
        </div>
        <button
          onClick={handleConnect}
          className="w-full py-2 px-4 bg-[#5865F2] text-white text-xs font-medium rounded-md 
                     hover:bg-[#4752c4] transition-colors"
        >
          Add to Discord
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
            Connected to <strong>{guilds.length} server(s)</strong>
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

      {/* Server Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Server
        </label>
        <select
          value={selectedGuildId}
          onChange={(e) => handleGuildChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          <option value="">Select a server...</option>
          {guilds.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Channel Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Channel
        </label>
        <select
          value={(config.channelId as string) || ""}
          onChange={(e) => onChange("channelId", e.target.value)}
          disabled={!selectedGuildId || loadingChannels}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingChannels
              ? "Loading channels..."
              : !selectedGuildId
                ? "Select a server first"
                : "Select a channel..."}
          </option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              #{ch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Message Template */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Message
        </label>
        <ExpressionTextarea
          value={(config.message as string) || ""}
          onChange={(value) => onChange("message", value)}
          nodeId={nodeId || ""}
          placeholder="🎉 New submission from **{{trigger.body.name}}**!"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Supports Discord markdown. Click 📊 to insert variables.
        </p>
      </div>
    </div>
  );
}
