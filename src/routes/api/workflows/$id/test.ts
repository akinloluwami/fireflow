import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workflows, workflowExecutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { executeWorkflow } from "@/lib/executor/engine";

export const Route = createFileRoute("/api/workflows/$id/test")({
  server: {
    handlers: {
      // POST /api/workflows/:id/test - Manually trigger a workflow for testing
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Get the workflow
        const workflow = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, id))
          .limit(1);

        if (!workflow[0]) {
          return Response.json(
            { error: "Workflow not found" },
            { status: 404 },
          );
        }

        if (workflow[0].userId !== session.user.id) {
          return Response.json({ error: "Access denied" }, { status: 403 });
        }

        // Parse optional test data from request body
        let testData: Record<string, unknown> = {};
        try {
          const body = await request.json();
          testData = body.testData || {};
        } catch {
          // No body provided, use empty test data
        }

        // Add some default test data
        const triggerData = {
          ...testData,
          _test: true,
          _triggeredAt: new Date().toISOString(),
          _triggeredBy: session.user.email || session.user.id,
        };

        // Create execution record
        const executionId = uuid();
        await db.insert(workflowExecutions).values({
          id: executionId,
          workflowId: id,
          status: "pending",
          triggerData,
          startedAt: new Date(),
        });

        // Execute workflow (don't await - return quickly)
        executeWorkflow(id, executionId, triggerData).catch((error) => {
          console.error(`Test workflow execution failed: ${id}`, error);
        });

        return Response.json({
          success: true,
          executionId,
          message: "Workflow test started",
        });
      },
    },
  },
});
