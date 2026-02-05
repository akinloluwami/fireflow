import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workflows } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const Route = createFileRoute("/api/workflows/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await db
          .select()
          .from(workflows)
          .where(eq(workflows.userId, session.user.id))
          .orderBy(desc(workflows.updatedAt));

        return Response.json(result);
      },

      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name) {
          return Response.json({ error: "name required" }, { status: 400 });
        }

        const id = uuid();
        const now = new Date();

        await db.insert(workflows).values({
          id,
          name,
          description: description || null,
          nodes: [],
          edges: [],
          status: "draft",
          userId: session.user.id,
          createdAt: now,
          updatedAt: now,
        });

        return Response.json({ id });
      },
    },
  },
});
