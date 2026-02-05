import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchSlackChannels } from "@/lib/integrations/slack";

export const Route = createFileRoute("/api/integrations/slack/channels")({
  server: {
    handlers: {
      // GET /api/integrations/slack/channels - List Slack channels
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's Slack integration
        const integration = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.userId, session.user.id),
              eq(integrations.provider, "slack"),
            ),
          )
          .limit(1);

        if (!integration[0]) {
          return Response.json(
            { connected: false, channels: [] },
            { status: 200 },
          );
        }

        const credentials = integration[0].credentials as {
          accessToken: string;
          teamName: string;
        };

        // Fetch channels from Slack
        const channels = await fetchSlackChannels(credentials.accessToken);

        return Response.json({
          connected: true,
          workspace: credentials.teamName,
          channels,
        });
      },
    },
  },
});
