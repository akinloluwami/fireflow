import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/credentials/encryption";
import type {
  UpdateCredentialRequest,
  CredentialData,
} from "@/lib/credentials/types";

export const Route = createFileRoute("/api/credentials/$id")({
  server: {
    handlers: {
      // Get a single credential (with decrypted data)
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const result = await db
          .select()
          .from(credentials)
          .where(
            and(
              eq(credentials.id, id),
              eq(credentials.userId, session.user.id),
            ),
          )
          .limit(1);

        if (result.length === 0) {
          return Response.json(
            { error: "Credential not found" },
            { status: 404 },
          );
        }

        const credential = result[0];

        // Decrypt the data
        let data: CredentialData;
        try {
          data = decrypt<CredentialData>(credential.encryptedData);
        } catch (error) {
          console.error("Decryption error:", error);
          return Response.json(
            { error: "Failed to decrypt credential data" },
            { status: 500 },
          );
        }

        return Response.json({
          id: credential.id,
          name: credential.name,
          type: credential.type,
          data,
          description: credential.description,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt,
        });
      },

      // Update a credential
      PUT: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Check credential exists and belongs to user
        const existing = await db
          .select()
          .from(credentials)
          .where(
            and(
              eq(credentials.id, id),
              eq(credentials.userId, session.user.id),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          return Response.json(
            { error: "Credential not found" },
            { status: 404 },
          );
        }

        let body: UpdateCredentialRequest;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { name, data, description } = body;

        // Build update object
        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (name !== undefined) {
          updates.name = name;
        }

        if (description !== undefined) {
          updates.description = description;
        }

        if (data !== undefined) {
          try {
            updates.encryptedData = encrypt(data);
          } catch (error) {
            console.error("Encryption error:", error);
            return Response.json(
              { error: "Failed to encrypt credential data" },
              { status: 500 },
            );
          }
        }

        try {
          await db
            .update(credentials)
            .set(updates)
            .where(
              and(
                eq(credentials.id, id),
                eq(credentials.userId, session.user.id),
              ),
            );

          return Response.json({ success: true });
        } catch (error) {
          console.error("Database error:", error);
          return Response.json(
            { error: "Failed to update credential" },
            { status: 500 },
          );
        }
      },

      // Delete a credential
      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Check credential exists and belongs to user
        const existing = await db
          .select({ id: credentials.id })
          .from(credentials)
          .where(
            and(
              eq(credentials.id, id),
              eq(credentials.userId, session.user.id),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          return Response.json(
            { error: "Credential not found" },
            { status: 404 },
          );
        }

        try {
          await db
            .delete(credentials)
            .where(
              and(
                eq(credentials.id, id),
                eq(credentials.userId, session.user.id),
              ),
            );

          return Response.json({ success: true });
        } catch (error) {
          console.error("Database error:", error);
          return Response.json(
            { error: "Failed to delete credential" },
            { status: 500 },
          );
        }
      },
    },
  },
});
