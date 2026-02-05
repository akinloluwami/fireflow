import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";

interface IntegrationStatus {
  provider: string;
  connected: boolean;
  metadata?: {
    workspace?: string;
    installedAt?: string;
  };
}

export const Route = createFileRoute("/api/integrations/status")({
  server: {
    handlers: {
      // GET /api/integrations/status - Get all integration statuses
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all user integrations
        const userIntegrations = await db
          .select()
          .from(integrations)
          .where(eq(integrations.userId, session.user.id));

        const statuses: IntegrationStatus[] = [];

        // Check Slack
        const slack = userIntegrations.find((i) => i.provider === "slack");
        statuses.push({
          provider: "slack",
          connected: !!slack,
          metadata: slack
            ? {
                workspace: (slack.credentials as { teamName?: string })
                  ?.teamName,
                installedAt: (slack.metadata as { installedAt?: string })
                  ?.installedAt,
              }
            : undefined,
        });

        // Check Discord
        const discord = userIntegrations.find((i) => i.provider === "discord");
        statuses.push({
          provider: "discord",
          connected: !!discord,
          metadata: discord
            ? {
                installedAt: (discord.metadata as { installedAt?: string })
                  ?.installedAt,
              }
            : undefined,
        });

        return Response.json({ integrations: statuses });
      },
    },
  },
});
