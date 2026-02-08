import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workflowExecutions, workflows } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/workflows/$id/executions")({
  server: {
    handlers: {
      // GET /api/workflows/:id/executions - Get all executions for a workflow
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: workflowId } = params;

        // Verify workflow ownership
        const workflow = await db
          .select({ userId: workflows.userId })
          .from(workflows)
          .where(eq(workflows.id, workflowId))
          .limit(1);

        if (!workflow[0] || workflow[0].userId !== session.user.id) {
          return Response.json({ error: "Access denied" }, { status: 403 });
        }

        // Get query params for pagination
        const url = new URL(request.url);
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") || "50"),
          100,
        );
        const offset = parseInt(url.searchParams.get("offset") || "0");

        try {
          // Get executions with count
          const [executions, countResult] = await Promise.all([
            db
              .select({
                id: workflowExecutions.id,
                status: workflowExecutions.status,
                triggerData: workflowExecutions.triggerData,
                startedAt: workflowExecutions.startedAt,
                completedAt: workflowExecutions.completedAt,
                error: workflowExecutions.error,
              })
              .from(workflowExecutions)
              .where(eq(workflowExecutions.workflowId, workflowId))
              .orderBy(desc(workflowExecutions.startedAt))
              .limit(limit)
              .offset(offset),
            db
              .select({ count: sql<number>`count(*)` })
              .from(workflowExecutions)
              .where(eq(workflowExecutions.workflowId, workflowId)),
          ]);

          return Response.json({
            executions,
            total: Number(countResult[0]?.count || 0),
            limit,
            offset,
          });
        } catch (error) {
          console.error("Failed to fetch executions:", error);
          return Response.json(
            { error: "Failed to fetch executions" },
            { status: 500 },
          );
        }
      },
    },
  },
});
