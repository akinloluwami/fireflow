import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  generateWebhookSecret,
  computeWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
  type WebhookAuthMethod,
} from "@/lib/webhook/auth";

export const Route = createFileRoute("/api/workflows/$id/webhook-secret")({
  server: {
    handlers: {
      /**
       * POST /api/workflows/:id/webhook-secret
       * Generate or regenerate the webhook secret and enable authentication
       * Body: { method?: 'bearer' | 'hmac' }
       */
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Parse optional method from body
        let method: WebhookAuthMethod = "bearer";
        try {
          const body = await request.json();
          if (body.method === "hmac" || body.method === "bearer") {
            method = body.method;
          }
        } catch {
          // No body or invalid JSON - use default
        }

        // Verify workflow exists and belongs to user
        const workflow = await db
          .select({ id: workflows.id })
          .from(workflows)
          .where(
            and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
          )
          .limit(1);

        if (!workflow[0]) {
          return Response.json(
            { error: "Workflow not found" },
            { status: 404 },
          );
        }

        // Generate new secret
        const secret = generateWebhookSecret();

        // Update workflow with new secret, method, and enable auth
        await db
          .update(workflows)
          .set({
            webhookSecret: secret,
            webhookAuthEnabled: true,
            webhookAuthMethod: method,
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, id));

        // Generate examples based on method
        const webhookUrl = `/api/webhooks/generic/${id}`;
        const examplePayload = JSON.stringify({ example: "data" });

        if (method === "bearer") {
          return Response.json({
            success: true,
            secret, // Only shown once!
            webhookAuthEnabled: true,
            authMethod: method,
            instructions: {
              note: "Save this token now! It will not be shown again.",
              header: `Authorization: Bearer ${secret}`,
              usage: "Include the token in the Authorization header",
              example: {
                url: webhookUrl,
                header: `Authorization: Bearer ${secret}`,
              },
            },
          });
        } else {
          const exampleSignature = computeWebhookSignature(
            examplePayload,
            secret,
          );
          return Response.json({
            success: true,
            secret, // Only shown once!
            webhookAuthEnabled: true,
            authMethod: method,
            signatureHeader: WEBHOOK_SIGNATURE_HEADER,
            instructions: {
              note: "Save this secret now! It will not be shown again.",
              header: `${WEBHOOK_SIGNATURE_HEADER}: sha256=<hmac>`,
              algorithm: "HMAC-SHA256",
              usage: "Sign the request body with HMAC-SHA256 using this secret",
              example: {
                url: webhookUrl,
                payload: examplePayload,
                signature: exampleSignature,
              },
            },
          });
        }
      },

      /**
       * DELETE /api/workflows/:id/webhook-secret
       * Disable webhook authentication (keeps secret for potential re-enable)
       */
      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Verify workflow exists and belongs to user
        const workflow = await db
          .select({ id: workflows.id })
          .from(workflows)
          .where(
            and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
          )
          .limit(1);

        if (!workflow[0]) {
          return Response.json(
            { error: "Workflow not found" },
            { status: 404 },
          );
        }

        // Disable auth (keep secret in case user wants to re-enable)
        await db
          .update(workflows)
          .set({
            webhookAuthEnabled: false,
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, id));

        return Response.json({
          success: true,
          webhookAuthEnabled: false,
          message:
            "Webhook authentication disabled. Anyone can trigger this webhook.",
        });
      },

      /**
       * GET /api/workflows/:id/webhook-secret
       * Check webhook auth status (does not return the secret)
       */
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const workflow = await db
          .select({
            id: workflows.id,
            webhookAuthEnabled: workflows.webhookAuthEnabled,
            webhookAuthMethod: workflows.webhookAuthMethod,
            webhookSecret: workflows.webhookSecret,
          })
          .from(workflows)
          .where(
            and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
          )
          .limit(1);

        if (!workflow[0]) {
          return Response.json(
            { error: "Workflow not found" },
            { status: 404 },
          );
        }

        return Response.json({
          webhookAuthEnabled: workflow[0].webhookAuthEnabled ?? false,
          authMethod: workflow[0].webhookAuthMethod || "bearer",
          hasSecret: !!workflow[0].webhookSecret,
          webhookUrl: `/api/webhooks/generic/${id}`,
        });
      },
    },
  },
});
