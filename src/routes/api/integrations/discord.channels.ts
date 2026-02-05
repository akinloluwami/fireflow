import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { fetchGuildChannels } from "@/lib/integrations/discord";

export const Route = createFileRoute("/api/integrations/discord/channels")({
  server: {
    handlers: {
      // GET /api/integrations/discord/channels?guildId=xxx - List Discord channels
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const guildId = url.searchParams.get("guildId");

        if (!guildId) {
          return Response.json(
            { error: "guildId is required" },
            { status: 400 },
          );
        }

        // Fetch channels using bot token
        const channels = await fetchGuildChannels(guildId);

        return Response.json({ channels });
      },
    },
  },
});
