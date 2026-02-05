import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { exchangeDiscordCode } from "@/lib/integrations/discord";

export const Route = createFileRoute("/api/integrations/discord/callback")({
  server: {
    handlers: {
      // GET /api/integrations/discord/callback - Handle Discord OAuth callback
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const guildId = url.searchParams.get("guild_id");
        const error = url.searchParams.get("error");

        // Handle Discord errors
        if (error) {
          return Response.redirect(`/workflows?error=discord_${error}`, 302);
        }

        if (!code || !state) {
          return Response.redirect("/workflows?error=invalid_callback", 302);
        }

        // Validate state and extract user ID
        const [userId] = state.split(":");
        if (!userId) {
          return Response.redirect("/workflows?error=invalid_state", 302);
        }

        // Verify the user is authenticated
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user || session.user.id !== userId) {
          return Response.redirect("/workflows?error=auth_mismatch", 302);
        }

        // Exchange code for token
        const tokenData = await exchangeDiscordCode(code);
        if (!tokenData) {
          return Response.redirect(
            "/workflows?error=token_exchange_failed",
            302,
          );
        }

        // Check if integration already exists
        const existing = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.userId, userId),
              eq(integrations.provider, "discord"),
            ),
          )
          .limit(1);

        const guildData = {
          id: tokenData.guild?.id || guildId,
          name: tokenData.guild?.name || "Discord Server",
          icon: tokenData.guild?.icon || null,
          addedAt: new Date().toISOString(),
        };

        if (existing[0]) {
          // Update existing integration - add new guild to list
          const existingMetadata =
            (existing[0].metadata as { guilds?: unknown[] }) || {};
          const existingGuilds = Array.isArray(existingMetadata.guilds)
            ? existingMetadata.guilds
            : [];

          // Add guild if not already present
          const hasGuild = existingGuilds.some(
            (g) => (g as { id?: string }).id === guildData.id,
          );

          const updatedGuilds = hasGuild
            ? existingGuilds
            : [...existingGuilds, guildData];

          await db
            .update(integrations)
            .set({
              credentials: {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
              },
              metadata: {
                guilds: updatedGuilds,
              },
              updatedAt: new Date(),
            })
            .where(eq(integrations.id, existing[0].id));
        } else {
          // Create new integration
          await db.insert(integrations).values({
            id: uuid(),
            userId,
            provider: "discord",
            credentials: {
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
            },
            metadata: {
              guilds: [guildData],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Redirect back to workflows with success
        return Response.redirect(
          `/workflows?discord=connected&server=${encodeURIComponent(guildData.name)}`,
          302,
        );
      },
    },
  },
});
