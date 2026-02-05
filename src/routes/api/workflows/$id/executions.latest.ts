import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { workflowExecutions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const Route = createFileRoute("/api/workflows/$id/executions/latest")({
  server: {
    handlers: {
      // GET /api/workflows/:id/executions/latest - Get latest execution
      GET: async ({ params }) => {
        const { id: workflowId } = params;

        try {
          const execution = await db
            .select()
            .from(workflowExecutions)
            .where(eq(workflowExecutions.workflowId, workflowId))
            .orderBy(desc(workflowExecutions.startedAt))
            .limit(1);

          if (!execution[0]) {
            return Response.json({ execution: null });
          }

          return Response.json({ execution: execution[0] });
        } catch (error) {
          console.error("Failed to fetch latest execution:", error);
          return Response.json(
            { error: "Failed to fetch execution" },
            { status: 500 },
          );
        }
      },
    },
  },
});
