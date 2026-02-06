import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { workflows, workflowExecutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { executeWorkflow } from "@/lib/executor/engine";

export const Route = createFileRoute("/api/webhooks/generic/$workflowId")({
  server: {
    handlers: {
      // POST /api/webhooks/generic/:workflowId - Generic webhook endpoint
      POST: async ({ request, params }) => {
        const { workflowId } = params;

        try {
          // Parse the incoming payload
          let payload: Record<string, unknown> = {};
          const contentType = request.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            payload = await request.json();
          } else if (
            contentType.includes("application/x-www-form-urlencoded")
          ) {
            const formData = await request.formData();
            formData.forEach((value, key) => {
              payload[key] = value;
            });
          } else {
            // Try to parse as JSON anyway
            try {
              payload = await request.json();
            } catch {
              payload = { body: await request.text() };
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

        return Response.json({
          webhook: "active",
          workflowId: workflow[0].id,
          workflowName: workflow[0].name,
          status: workflow[0].status,
          message: "Send a POST request to trigger this workflow",
        });
      },
    },
  },
});
