/**
 * Discord Integration Helpers
 */

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  guildId: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

/**
 * Get Discord OAuth authorization URL (for adding bot to server)
 */
export function getDiscordAuthUrl(state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  // Bot permissions: Send Messages (2048), View Channels (1024), Embed Links (16384)
  const permissions = 2048 + 1024 + 16384;
  const scopes = ["bot", "guilds"].join("%20");

  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri || "")}&response_type=code&state=${state}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeDiscordCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  guild: DiscordGuild;
} | null> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId || "",
      client_secret: clientSecret || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri || "",
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error("Discord OAuth error:", data.error);
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    guild: data.guild,
  };
}

/**
 * Fetch guilds the bot is in (using user's OAuth token)
 */
export async function fetchUserGuilds(
  accessToken: string,
): Promise<DiscordGuild[]> {
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return [];
  }

  const guilds = await response.json();
  return guilds.map((g: { id: string; name: string; icon: string | null }) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
  }));
}

/**
 * Fetch channels from a guild (using bot token)
 */
export async function fetchGuildChannels(
  guildId: string,
): Promise<DiscordChannel[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    {
      headers: { Authorization: `Bot ${botToken}` },
    },
  );

  if (!response.ok) {
    return [];
  }

  const channels = await response.json();

  // Filter to text channels only (type 0)
  return channels
    .filter((ch: { type: number }) => ch.type === 0)
    .map((ch: { id: string; name: string; type: number }) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      guildId,
    }));
}
