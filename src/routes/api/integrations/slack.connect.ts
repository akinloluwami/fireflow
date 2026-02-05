import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { getSlackAuthUrl } from "@/lib/integrations/slack";
import { v4 as uuid } from "uuid";

export const Route = createFileRoute("/api/integrations/slack/connect")({
  server: {
    handlers: {
      // GET /api/integrations/slack/connect - Start Slack OAuth flow
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate state token (includes user ID for security)
        const state = `${session.user.id}:${uuid()}`;

        // Get Slack authorization URL
        const authUrl = getSlackAuthUrl(state);

        // Redirect to Slack
        return Response.redirect(authUrl, 302);
      },
    },
  },
});
