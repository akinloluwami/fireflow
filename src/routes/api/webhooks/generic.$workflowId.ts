import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { workflows, workflowExecutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { executeWorkflow } from "@/lib/executor/engine";
import {
  validateWebhookSignature,
  validateBearerToken,
  WEBHOOK_SIGNATURE_HEADER,
  type WebhookAuthMethod,
} from "@/lib/webhook/auth";

export const Route = createFileRoute("/api/webhooks/generic/$workflowId")({
  server: {
    handlers: {
      // POST /api/webhooks/generic/:workflowId - Generic webhook endpoint
      POST: async ({ request, params }) => {
        const { workflowId } = params;

        try {
          // Get the raw body for signature validation before parsing
          const rawBody = await request.text();

          // Parse the incoming payload
          let payload: Record<string, unknown> = {};
          const contentType = request.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            try {
              payload = JSON.parse(rawBody);
            } catch {
              return Response.json(
                { error: "Invalid JSON payload" },
                { status: 400 },
              );
            }
          } else if (
            contentType.includes("application/x-www-form-urlencoded")
          ) {
            const params = new URLSearchParams(rawBody);
            params.forEach((value, key) => {
              payload[key] = value;
            });
          } else {
            // Try to parse as JSON anyway
            try {
              payload = JSON.parse(rawBody);
            } catch {
              payload = { body: rawBody };
            }
          }

          // Find the workflow
          const workflow = await db
            .select()
            .from(workflows)
            .where(eq(workflows.id, workflowId))
            .limit(1);

          if (!workflow[0]) {
            return Response.json(
              { error: "Workflow not found" },
              { status: 404 },
            );
          }

          // Validate webhook authentication if enabled
          if (workflow[0].webhookAuthEnabled && workflow[0].webhookSecret) {
            const authMethod = (workflow[0].webhookAuthMethod ||
              "bearer") as WebhookAuthMethod;
            let isValid = false;

            if (authMethod === "bearer") {
              // Bearer token auth - check Authorization header
              const authHeader = request.headers.get("authorization");

              if (!authHeader) {
                return Response.json(
                  {
                    error: "Missing authorization header",
                    hint: "Include 'Authorization: Bearer <token>' header",
                  },
                  { status: 401 },
                );
              }

              isValid = validateBearerToken(
                authHeader,
                workflow[0].webhookSecret,
              );

              if (!isValid) {
                return Response.json(
                  { error: "Invalid bearer token" },
                  { status: 401 },
                );
              }
            } else {
              // HMAC signature auth
              const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);

              if (!signature) {
                return Response.json(
                  {
                    error: "Missing webhook signature",
                    hint: `Include '${WEBHOOK_SIGNATURE_HEADER}: sha256=<hmac>' header`,
                  },
                  { status: 401 },
                );
              }

              isValid = validateWebhookSignature(
                rawBody,
                signature,
                workflow[0].webhookSecret,
              );

              if (!isValid) {
                return Response.json(
                  { error: "Invalid webhook signature" },
                  { status: 401 },
                );
              }
            }
          }

          // Check if workflow is active or testing
          if (
            workflow[0].status !== "active" &&
            workflow[0].status !== "testing"
          ) {
            return Response.json(
              { error: "Workflow is not active or in testing mode" },
              { status: 400 },
            );
          }

          const wasTestingMode = workflow[0].status === "testing";

          // Build trigger data from payload
          const triggerData = {
            ...payload,
            _meta: {
              source: "generic-webhook",
              receivedAt: new Date().toISOString(),
              contentType,
              headers: Object.fromEntries(request.headers.entries()),
            },
          };

          // Create execution record
          const executionId = uuid();
          await db.insert(workflowExecutions).values({
            id: executionId,
            workflowId,
            status: "pending",
            triggerData,
            startedAt: new Date(),
          });

          // Execute workflow asynchronously
          executeWorkflow(workflowId, executionId, triggerData)
            .then(async () => {
              // If was in testing mode, revert to draft after execution
              if (wasTestingMode) {
                await db
                  .update(workflows)
                  .set({ status: "draft" })
                  .where(eq(workflows.id, workflowId));
              }
            })
            .catch((error) => {
              console.error(`Workflow execution failed: ${workflowId}`, error);
            });

          return Response.json({
            success: true,
            executionId,
            message: "Workflow triggered",
            testMode: wasTestingMode,
          });
        } catch (error) {
          console.error("Generic webhook error:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },

      // GET endpoint for testing/verification
      GET: async ({ params }) => {
        const { workflowId } = params;

        const workflow = await db
          .select({
            id: workflows.id,
            name: workflows.name,
            status: workflows.status,
            webhookAuthEnabled: workflows.webhookAuthEnabled,
            webhookAuthMethod: workflows.webhookAuthMethod,
          })
          .from(workflows)
          .where(eq(workflows.id, workflowId))
          .limit(1);

        if (!workflow[0]) {
          return Response.json(
            { error: "Workflow not found" },
            { status: 404 },
          );
        }

        const authMethod = workflow[0].webhookAuthMethod || "bearer";
        const authEnabled = workflow[0].webhookAuthEnabled ?? false;

        let authHint = "Send a POST request to trigger this workflow";
        if (authEnabled) {
          if (authMethod === "bearer") {
            authHint =
              "Send a POST request with 'Authorization: Bearer <token>' header";
          } else {
            authHint = `Send a POST request with '${WEBHOOK_SIGNATURE_HEADER}: sha256=<hmac>' header`;
          }
        }

        return Response.json({
          webhook: "active",
          workflowId: workflow[0].id,
          workflowName: workflow[0].name,
          status: workflow[0].status,
          authenticationRequired: authEnabled,
          authMethod: authEnabled ? authMethod : null,
          message: authHint,
        });
      },
    },
  },
});
