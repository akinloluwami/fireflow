/**
 * Prefetch integration data (credentials, Discord guilds/channels, Slack channels)
 * so the AI can select from real values when generating workflow node configs.
 *
 * Also exposes a global cache so non-React code (like inferConfigFromContext
 * inside the WorkflowGenerator) can access the fetched data synchronously.
 */

import { useState, useEffect, useCallback } from "react";

// Types for prefetched data
export interface PrefetchedCredential {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0 = text, 2 = voice, etc.
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface IntegrationStatus {
  provider: string;
  connected: boolean;
  metadata?: {
    workspace?: string;
    installedAt?: string;
  };
}

export interface PrefetchedContext {
  credentials: PrefetchedCredential[];
  aiCredentials: PrefetchedCredential[];
  dbCredentials: PrefetchedCredential[];
  integrations: IntegrationStatus[];
  discord: {
    connected: boolean;
    guilds: DiscordGuild[];
    channels: Record<string, DiscordChannel[]>; // guildId -> channels
  };
  slack: {
    connected: boolean;
    workspace: string | null;
    channels: SlackChannel[];
  };
  isLoading: boolean;
}

const AI_CREDENTIAL_TYPES = ["openai", "xai", "gemini", "vercel_ai_gateway"];
const DB_CREDENTIAL_TYPES = ["postgres"];

// ─── Global cache ────────────────────────────────────────────────────────
// Accessible from non-React code (e.g., inferConfigFromContext, enrichConfig)
let _globalContext: PrefetchedContext | null = null;

/** Get the last-known prefetched context (may be null before fetch completes). */
export function getCachedContext(): PrefetchedContext | null {
  return _globalContext;
}

// ─── React hook ──────────────────────────────────────────────────────────
export function usePrefetchedContext(): PrefetchedContext {
  const [credentials, setCredentials] = useState<PrefetchedCredential[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([]);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordChannels, setDiscordChannels] = useState<
    Record<string, DiscordChannel[]>
  >({});
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackWorkspace, setSlackWorkspace] = useState<string | null>(null);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
        return data as PrefetchedCredential[];
      }
    } catch (error) {
      console.error("Failed to prefetch credentials:", error);
    }
    return [];
  }, []);

  // Fetch integration statuses
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
        return data.integrations as IntegrationStatus[];
      }
    } catch (error) {
      console.error("Failed to prefetch integrations:", error);
    }
    return [];
  }, []);

  // Fetch Discord guilds and their channels
  const fetchDiscordData = useCallback(async () => {
    try {
      const guildsRes = await fetch("/api/integrations/discord/guilds");
      if (!guildsRes.ok) return { connected: false, guilds: [] as DiscordGuild[], channels: {} as Record<string, DiscordChannel[]> };

      const guildsData = await guildsRes.json();
      if (!guildsData.connected) {
        setDiscordConnected(false);
        return { connected: false, guilds: [] as DiscordGuild[], channels: {} as Record<string, DiscordChannel[]> };
      }

      setDiscordConnected(true);
      const guilds: DiscordGuild[] = guildsData.guilds || [];
      setDiscordGuilds(guilds);

      // Fetch channels for each guild (in parallel)
      const channelMap: Record<string, DiscordChannel[]> = {};
      await Promise.all(
        guilds.map(async (guild) => {
          try {
            const channelsRes = await fetch(
              `/api/integrations/discord/channels?guildId=${guild.id}`,
            );
            if (channelsRes.ok) {
              const channelsData = await channelsRes.json();
              // Only include text channels (type 0)
              channelMap[guild.id] = (channelsData.channels || []).filter(
                (ch: DiscordChannel) => ch.type === 0,
              );
            }
          } catch {
            // Silently skip guilds we can't fetch channels for
          }
        }),
      );

      setDiscordChannels(channelMap);
      return { connected: true, guilds, channels: channelMap };
    } catch (error) {
      console.error("Failed to prefetch Discord data:", error);
      return { connected: false, guilds: [] as DiscordGuild[], channels: {} as Record<string, DiscordChannel[]> };
    }
  }, []);

  // Fetch Slack channels
  const fetchSlackData = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/slack/channels");
      if (!res.ok) return { connected: false, workspace: null, channels: [] as SlackChannel[] };

      const data = await res.json();
      setSlackConnected(data.connected || false);
      setSlackWorkspace(data.workspace || null);
      setSlackChannels(data.channels || []);
      return {
        connected: data.connected || false,
        workspace: data.workspace || null,
        channels: (data.channels || []) as SlackChannel[],
      };
    } catch (error) {
      console.error("Failed to prefetch Slack data:", error);
      return { connected: false, workspace: null, channels: [] as SlackChannel[] };
    }
  }, []);

  // Fetch all data on mount and update global cache
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setIsLoading(true);

      // Fetch integrations status first to know which ones to query
      const statuses = await fetchIntegrations();

      const credentialsPromise = fetchCredentials();

      let discordResult = { connected: false, guilds: [] as DiscordGuild[], channels: {} as Record<string, DiscordChannel[]> };
      let slackResult = { connected: false, workspace: null as string | null, channels: [] as SlackChannel[] };

      const discordStatus = statuses.find(
        (s: IntegrationStatus) => s.provider === "discord",
      );
      const slackStatus = statuses.find(
        (s: IntegrationStatus) => s.provider === "slack",
      );

      const [creds, discord, slack] = await Promise.all([
        credentialsPromise,
        discordStatus?.connected ? fetchDiscordData() : Promise.resolve(discordResult),
        slackStatus?.connected ? fetchSlackData() : Promise.resolve(slackResult),
      ]);

      discordResult = discord;
      slackResult = slack;

      if (!cancelled) {
        setIsLoading(false);

        // Build & cache the context globally
        const aiCreds = creds.filter((c: PrefetchedCredential) =>
          AI_CREDENTIAL_TYPES.includes(c.type),
        );
        const dbCreds = creds.filter((c: PrefetchedCredential) =>
          DB_CREDENTIAL_TYPES.includes(c.type),
        );

        _globalContext = {
          credentials: creds,
          aiCredentials: aiCreds,
          dbCredentials: dbCreds,
          integrations: statuses,
          discord: discordResult,
          slack: slackResult,
          isLoading: false,
        };
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [fetchCredentials, fetchIntegrations, fetchDiscordData, fetchSlackData]);

  // Derived lists
  const aiCredentials = credentials.filter((c) =>
    AI_CREDENTIAL_TYPES.includes(c.type),
  );
  const dbCredentials = credentials.filter((c) =>
    DB_CREDENTIAL_TYPES.includes(c.type),
  );

  const ctx: PrefetchedContext = {
    credentials,
    aiCredentials,
    dbCredentials,
    integrations,
    discord: {
      connected: discordConnected,
      guilds: discordGuilds,
      channels: discordChannels,
    },
    slack: {
      connected: slackConnected,
      workspace: slackWorkspace,
      channels: slackChannels,
    },
    isLoading,
  };

  // Keep global cache in-sync with React state changes
  if (!isLoading) {
    _globalContext = ctx;
  }

  return ctx;
}

/**
 * Enrich a node's config with real data from the prefetched context.
 * Called AFTER the AI's config + inferred config have been merged,
 * so we only fill in values that are still placeholders or empty.
 */
export function enrichConfigWithRealData(
  subType: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const ctx = _globalContext;
  if (!ctx) return config; // Context hasn't loaded yet

  const enriched = { ...config };

  switch (subType) {
    case "model-picker": {
      // Fill credentialId with real AI credential
      if (isPlaceholder(enriched.credentialId)) {
        const cred = findBestCredential(ctx.aiCredentials, enriched.provider as string);
        if (cred) {
          enriched.credentialId = cred.id;
          // Also set the provider to match the credential type
          if (!enriched.provider || enriched.provider === "") {
            enriched.provider = cred.type;
          }
        }
      }
      break;
    }

    case "database-query": {
      // Fill credentialId with real DB credential
      if (isPlaceholder(enriched.credentialId)) {
        if (ctx.dbCredentials.length > 0) {
          enriched.credentialId = ctx.dbCredentials[0].id;
        }
      }
      // Also fill connectionString if it's a placeholder and we have a credential
      if (isPlaceholder(enriched.connectionString) && ctx.dbCredentials.length > 0) {
        enriched.credentialId = ctx.dbCredentials[0].id;
        // Clear placeholder connectionString since we're using credentialId
        enriched.connectionString = "";
      }
      break;
    }

    case "send-discord": {
      if (ctx.discord.connected && ctx.discord.guilds.length > 0) {
        // Fill guildId with the first available guild if placeholder
        if (isPlaceholder(enriched.guildId)) {
          enriched.guildId = ctx.discord.guilds[0].id;
        }

        // Fill channelId with first text channel from the guild
        const guildId = enriched.guildId as string;
        const channels = ctx.discord.channels[guildId] || [];
        if (isPlaceholder(enriched.channelId) && channels.length > 0) {
          // Try to find a channel matching the name if there's a hint in the config
          const channelName = (enriched._channelHint as string) || "";
          const match = channels.find(
            (ch) =>
              ch.name.toLowerCase() === channelName.toLowerCase() ||
              ch.name.toLowerCase().includes(channelName.toLowerCase()),
          );
          enriched.channelId = match ? match.id : channels[0].id;
        }
      }
      break;
    }

    case "send-slack": {
      if (ctx.slack.connected && ctx.slack.channels.length > 0) {
        // If channel is a generic placeholder, use the first real channel
        if (isPlaceholder(enriched.channel)) {
          enriched.channel = `#${ctx.slack.channels[0].name}`;
        }
      }
      break;
    }
  }

  return enriched;
}

/** Check if a value looks like a placeholder or is empty */
function isPlaceholder(value: unknown): boolean {
  if (!value) return true;
  if (typeof value !== "string") return false;
  if (value === "") return true;

  const placeholderPatterns = [
    "your-",
    "placeholder",
    "example",
    "xxx",
    "change-me",
    "real-",
    "your_",
  ];
  const lower = value.toLowerCase();
  return placeholderPatterns.some((p) => lower.startsWith(p) || lower.includes(p));
}

/** Find the best credential matching a provider type */
function findBestCredential(
  credentials: PrefetchedCredential[],
  preferredProvider?: string,
): PrefetchedCredential | null {
  if (credentials.length === 0) return null;

  // Try to match preferred provider
  if (preferredProvider) {
    const match = credentials.find(
      (c) => c.type.toLowerCase() === preferredProvider.toLowerCase(),
    );
    if (match) return match;
  }

  // Otherwise return the first available
  return credentials[0];
}

/**
 * Format the prefetched context into a string description for the AI system prompt.
 * This gives the AI knowledge of what's available to select from.
 */
export function formatContextForAI(ctx: PrefetchedContext): string {
  const sections: string[] = [];

  // --- Credentials ---
  if (ctx.aiCredentials.length > 0) {
    const list = ctx.aiCredentials
      .map((c) => `  - "${c.name}" (id: "${c.id}", type: ${c.type})`)
      .join("\n");
    sections.push(`AI CREDENTIALS (use these for model-picker credentialId):\n${list}`);
  } else {
    sections.push(
      "AI CREDENTIALS: None configured. Use placeholder 'your-credential-id' for model-picker.",
    );
  }

  if (ctx.dbCredentials.length > 0) {
    const list = ctx.dbCredentials
      .map((c) => `  - "${c.name}" (id: "${c.id}", type: ${c.type})`)
      .join("\n");
    sections.push(`DATABASE CREDENTIALS (use these for database-query credentialId):\n${list}`);
  }

  // --- Discord ---
  if (ctx.discord.connected && ctx.discord.guilds.length > 0) {
    const guildLines = ctx.discord.guilds.map((g) => {
      const channels = ctx.discord.channels[g.id] || [];
      const channelList =
        channels.length > 0
          ? channels
              .slice(0, 15)
              .map((ch) => `    - #${ch.name} (id: "${ch.id}")`)
              .join("\n")
          : "    (no text channels found)";
      return `  Server: "${g.name}" (id: "${g.id}")\n  Text Channels:\n${channelList}`;
    });
    sections.push(
      `DISCORD (connected):\n${guildLines.join("\n\n")}`,
    );
  } else {
    sections.push(
      "DISCORD: Not connected. Use placeholder values for guildId and channelId.",
    );
  }

  // --- Slack ---
  if (ctx.slack.connected && ctx.slack.channels.length > 0) {
    const channelList = ctx.slack.channels
      .slice(0, 20)
      .map((ch) => `  - #${ch.name} (id: "${ch.id}")`)
      .join("\n");
    sections.push(
      `SLACK (connected to workspace: "${ctx.slack.workspace}"):\nChannels:\n${channelList}`,
    );
  } else {
    sections.push(
      "SLACK: Not connected. Use placeholder channel names like '#general'.",
    );
  }

  return (
    "AVAILABLE INTEGRATIONS & CREDENTIALS:\n" +
    "Use these REAL values when configuring nodes instead of placeholders!\n\n" +
    sections.join("\n\n")
  );
}
