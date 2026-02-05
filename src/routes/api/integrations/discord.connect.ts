import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { getDiscordAuthUrl } from "@/lib/integrations/discord";
import { v4 as uuid } from "uuid";

export const Route = createFileRoute("/api/integrations/discord/connect")({
  server: {
    handlers: {
      // GET /api/integrations/discord/connect - Start Discord OAuth flow
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate state token (includes user ID for security)
        const state = `${session.user.id}:${uuid()}`;

        // Get Discord authorization URL
        const authUrl = getDiscordAuthUrl(state);

        // Redirect to Discord
        return Response.redirect(authUrl, 302);
      },
    },
  },
});
