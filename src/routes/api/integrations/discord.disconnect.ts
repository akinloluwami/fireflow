import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const Route = createFileRoute("/api/integrations/discord/disconnect")({
  server: {
    handlers: {
      // POST /api/integrations/discord/disconnect - Remove Discord connection
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Delete user's Discord integration
        await db
          .delete(integrations)
          .where(
            and(
              eq(integrations.userId, session.user.id),
              eq(integrations.provider, "discord"),
            ),
          );

        return Response.json({ success: true });
      },
    },
  },
});
