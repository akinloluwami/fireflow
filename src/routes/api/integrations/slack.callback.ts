import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { exchangeSlackCode } from "@/lib/integrations/slack";

export const Route = createFileRoute("/api/integrations/slack/callback")({
  server: {
    handlers: {
      // GET /api/integrations/slack/callback - Handle Slack OAuth callback
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        // Handle Slack errors
        if (error) {
          return Response.redirect(
            `${baseUrl}/workflows?error=slack_${error}`,
            302,
          );
        }

        if (!code || !state) {
          return Response.redirect(
            `${baseUrl}/workflows?error=invalid_callback`,
            302,
          );
        }

        // Validate state and extract user ID and workflow ID
        const [userId, workflowId] = state.split(":");
        if (!userId) {
          return Response.redirect(
            `${baseUrl}/workflows?error=invalid_state`,
            302,
          );
        }

        // Verify the user is authenticated
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user || session.user.id !== userId) {
          return Response.redirect(
            `${baseUrl}/workflows?error=auth_mismatch`,
            302,
          );
        }

        // Exchange code for token
        const tokenData = await exchangeSlackCode(code);
        if (!tokenData) {
          return Response.redirect(
            `${baseUrl}/workflows?error=token_exchange_failed`,
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
              eq(integrations.provider, "slack"),
            ),
          )
          .limit(1);

        if (existing[0]) {
          // Update existing integration
          await db
            .update(integrations)
            .set({
              credentials: {
                accessToken: tokenData.accessToken,
                teamId: tokenData.teamId,
                teamName: tokenData.teamName,
                botUserId: tokenData.botUserId,
              },
              metadata: {
                installedAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            })
            .where(eq(integrations.id, existing[0].id));
        } else {
          // Create new integration
          await db.insert(integrations).values({
            id: uuid(),
            userId,
            provider: "slack",
            credentials: {
              accessToken: tokenData.accessToken,
              teamId: tokenData.teamId,
              teamName: tokenData.teamName,
              botUserId: tokenData.botUserId,
            },
            metadata: {
              installedAt: new Date().toISOString(),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Redirect back to workflow with success
        const redirectPath = workflowId
          ? `/workflow/${workflowId}`
          : "/workflows";
        return Response.redirect(
          `${baseUrl}${redirectPath}?slack=connected&workspace=${encodeURIComponent(tokenData.teamName)}`,
          302,
        );
      },
    },
  },
});
