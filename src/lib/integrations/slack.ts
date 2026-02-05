/**
 * Slack Integration Helpers
 */

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount?: number;
}

export interface SlackWorkspace {
  teamId: string;
  teamName: string;
}

/**
 * Get Slack OAuth authorization URL
 */
export function getSlackAuthUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  const scopes = ["chat:write", "channels:read", "groups:read"].join(",");

  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri || "")}&state=${state}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  teamId: string;
  teamName: string;
  botUserId: string;
} | null> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId || "",
      client_secret: clientSecret || "",
      code,
      redirect_uri: redirectUri || "",
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Slack OAuth error:", data.error);
    return null;
  }

  return {
    accessToken: data.access_token,
    teamId: data.team.id,
    teamName: data.team.name,
    botUserId: data.bot_user_id,
  };
}

/**
 * Fetch channels from Slack workspace
 */
export async function fetchSlackChannels(
  accessToken: string,
): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];

  // Fetch public channels
  const publicResponse = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel&limit=200",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const publicData = await publicResponse.json();

  if (publicData.ok && publicData.channels) {
    for (const ch of publicData.channels) {
      channels.push({
        id: ch.id,
        name: ch.name,
        isPrivate: false,
        memberCount: ch.num_members,
      });
    }
  }

  // Fetch private channels
  const privateResponse = await fetch(
    "https://slack.com/api/conversations.list?types=private_channel&limit=200",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const privateData = await privateResponse.json();

  if (privateData.ok && privateData.channels) {
    for (const ch of privateData.channels) {
      channels.push({
        id: ch.id,
        name: ch.name,
        isPrivate: true,
        memberCount: ch.num_members,
      });
    }
  }

  return channels.sort((a, b) => a.name.localeCompare(b.name));
}
