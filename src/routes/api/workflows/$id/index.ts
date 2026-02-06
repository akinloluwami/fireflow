import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/workflows/$id/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const result = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, id))
          .limit(1);

        if (!result[0]) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        if (result[0].userId !== session.user.id) {
          return Response.json({ error: "Access denied" }, { status: 403 });
        }

        return Response.json(result[0]);
      },

      PUT: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { name, description, nodes, edges, status, chatThreadId } = body;

        const existing = await db
          .select({ userId: workflows.userId })
          .from(workflows)
          .where(eq(workflows.id, id))
          .limit(1);

        if (!existing[0] || existing[0].userId !== session.user.id) {
          return Response.json(
            { error: "Not found or access denied" },
            { status: 404 },
          );
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (nodes !== undefined) updates.nodes = nodes;
        if (edges !== undefined) updates.edges = edges;
        if (status !== undefined) updates.status = status;
        if (chatThreadId !== undefined) updates.chatThreadId = chatThreadId;

        await db.update(workflows).set(updates).where(eq(workflows.id, id));

        return Response.json({ success: true });
      },

      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const existing = await db
          .select({ userId: workflows.userId })
          .from(workflows)
          .where(eq(workflows.id, id))
          .limit(1);

        if (!existing[0] || existing[0].userId !== session.user.id) {
          return Response.json(
            { error: "Not found or access denied" },
            { status: 404 },
          );
        }

        await db.delete(workflows).where(eq(workflows.id, id));

        return Response.json({ success: true });
      },
    },
  },
});
