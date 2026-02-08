import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  workflowExecutions,
  workflowNodeExecutions,
  workflows,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/executions/$id")({
  server: {
    handlers: {
      // GET /api/executions/:id - Get execution status and node details
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Get the execution with workflow
        const execution = await db
          .select({
            id: workflowExecutions.id,
            workflowId: workflowExecutions.workflowId,
            status: workflowExecutions.status,
            triggerData: workflowExecutions.triggerData,
            startedAt: workflowExecutions.startedAt,
            completedAt: workflowExecutions.completedAt,
            result: workflowExecutions.result,
            error: workflowExecutions.error,
            workflowUserId: workflows.userId,
          })
          .from(workflowExecutions)
          .leftJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
          .where(eq(workflowExecutions.id, id))
          .limit(1);

        if (!execution[0]) {
          return Response.json(
            { error: "Execution not found" },
            { status: 404 },
          );
        }

        // Check ownership
        if (execution[0].workflowUserId !== session.user.id) {
          return Response.json({ error: "Access denied" }, { status: 403 });
        }

        // Get node executions
        const nodeExecutions = await db
          .select({
            id: workflowNodeExecutions.id,
            nodeId: workflowNodeExecutions.nodeId,
            status: workflowNodeExecutions.status,
            input: workflowNodeExecutions.input,
            output: workflowNodeExecutions.output,
            error: workflowNodeExecutions.error,
            startedAt: workflowNodeExecutions.startedAt,
            completedAt: workflowNodeExecutions.completedAt,
            duration: workflowNodeExecutions.duration,
          })
          .from(workflowNodeExecutions)
          .where(eq(workflowNodeExecutions.executionId, id));

        // Transform node executions to a map by nodeId
        const nodeStatuses: Record<string, string> = {};
        const nodeOutputs: Record<string, unknown> = {};
        const nodeErrors: Record<string, string> = {};

        for (const nodeExec of nodeExecutions) {
          // Map DB status to UI status
          let uiStatus = nodeExec.status;
          if (uiStatus === "completed") uiStatus = "success";

          nodeStatuses[nodeExec.nodeId] = uiStatus;
          if (nodeExec.output) {
            nodeOutputs[nodeExec.nodeId] = nodeExec.output;
          }
          if (nodeExec.error) {
            nodeErrors[nodeExec.nodeId] = nodeExec.error;
          }
        }

        return Response.json({
          execution: {
            id: execution[0].id,
            workflowId: execution[0].workflowId,
            status: execution[0].status,
            startedAt: execution[0].startedAt,
            completedAt: execution[0].completedAt,
            result: execution[0].result,
            error: execution[0].error,
          },
          nodeStatuses,
          nodeOutputs,
          nodeErrors,
          nodeExecutions, // Full node execution details
        });
      },
    },
  },
});
