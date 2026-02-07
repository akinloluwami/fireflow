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
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          return Response.redirect(
            `${baseUrl}/app/workflows?error=slack_${error}`,
            302,
          );
        }

        if (!code || !state) {
          return Response.redirect(
            `${baseUrl}/app/workflows?error=invalid_callback`,
            302,
          );
        }

        const [userId, workflowId] = state.split(":");
        if (!userId) {
          return Response.redirect(
            `${baseUrl}/app/workflows?error=invalid_state`,
            302,
          );
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user || session.user.id !== userId) {
          return Response.redirect(
            `${baseUrl}/app/workflows?error=auth_mismatch`,
            302,
          );
        }

        const tokenData = await exchangeSlackCode(code);
        if (!tokenData) {
          return Response.redirect(
            `${baseUrl}/app/workflows?error=token_exchange_failed`,
            302,
          );
        }

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
          ? `/app/workflow/${workflowId}`
          : "/app/workflows";
        return Response.redirect(
          `${baseUrl}${redirectPath}?slack=connected&workspace=${encodeURIComponent(tokenData.teamName)}`,
          302,
        );
      },
    },
  },
});
