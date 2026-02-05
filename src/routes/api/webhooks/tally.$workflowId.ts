import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { workflows, workflowExecutions, workflowWebhooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import {
  TallyWebhookPayload,
  parseTallyFields,
  validateTallySignature,
} from "@/lib/integrations/tally";
import { executeWorkflow } from "@/lib/executor/engine";

export const Route = createFileRoute("/api/webhooks/tally/$workflowId")({
  server: {
    handlers: {
      // POST /api/webhooks/tally/:workflowId - Receive Tally form submission
      POST: async ({ request, params }) => {
        const { workflowId } = params;

        try {
          // Parse the Tally payload
          const payload: TallyWebhookPayload = await request.json();

          // Validate event type
          if (payload.eventType !== "FORM_RESPONSE") {
            return Response.json(
              { error: "Unsupported event type" },
              { status: 400 },
            );
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

          // Check if workflow is active
          if (workflow[0].status !== "active") {
            return Response.json(
              { error: "Workflow is not active" },
              { status: 400 },
            );
          }

          // Optionally validate webhook signature
          const webhookRecord = await db
            .select()
            .from(workflowWebhooks)
            .where(
              and(
                eq(workflowWebhooks.workflowId, workflowId),
                eq(workflowWebhooks.provider, "tally"),
                eq(workflowWebhooks.isActive, true),
              ),
            )
            .limit(1);

          if (webhookRecord[0]?.webhookSecret) {
            const signature = request.headers.get("x-tally-signature");
            const rawBody = JSON.stringify(payload);
            if (
              !validateTallySignature(
                rawBody,
                signature,
                webhookRecord[0].webhookSecret,
              )
            ) {
              return Response.json(
                { error: "Invalid signature" },
                { status: 401 },
              );
            }
          }

          // Parse form fields into trigger data
          const triggerData = {
            ...parseTallyFields(payload.data.fields),
            _meta: {
              formId: payload.data.formId,
              formName: payload.data.formName,
              submissionId: payload.data.submissionId,
              responseId: payload.data.responseId,
              submittedAt: payload.data.createdAt,
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

          // Execute workflow asynchronously (don't await - return 200 quickly)
          executeWorkflow(workflowId, executionId, triggerData).catch(
            (error) => {
              console.error(`Workflow execution failed: ${workflowId}`, error);
            },
          );

          return Response.json({
            success: true,
            executionId,
            message: "Workflow triggered",
          });
        } catch (error) {
          console.error("Tally webhook error:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
