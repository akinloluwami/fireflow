import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
}

export const Route = createFileRoute("/api/integrations/discord/guilds")({
  server: {
    handlers: {
      // GET /api/integrations/discord/guilds - List Discord servers
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's Discord integration
        const integration = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.userId, session.user.id),
              eq(integrations.provider, "discord"),
            ),
          )
          .limit(1);

        if (!integration[0]) {
          return Response.json(
            { connected: false, guilds: [] },
            { status: 200 },
          );
        }

        const metadata = integration[0].metadata as { guilds?: GuildInfo[] };
        const guilds = metadata?.guilds || [];

        return Response.json({
          connected: true,
          guilds,
        });
      },
    },
  },
});
