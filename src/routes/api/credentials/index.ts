import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { encrypt } from "@/lib/credentials/encryption";
import type {
  CredentialType,
  CreateCredentialRequest,
  CredentialListItem,
} from "@/lib/credentials/types";

export const Route = createFileRoute("/api/credentials/")({
  server: {
    handlers: {
      // List all credentials for the user (without decrypted data)
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await db
          .select({
            id: credentials.id,
            name: credentials.name,
            type: credentials.type,
            description: credentials.description,
            createdAt: credentials.createdAt,
            updatedAt: credentials.updatedAt,
          })
          .from(credentials)
          .where(eq(credentials.userId, session.user.id))
          .orderBy(desc(credentials.updatedAt));

        return Response.json(result as CredentialListItem[]);
      },

      // Create a new credential
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: CreateCredentialRequest;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { name, type, data, description } = body;

        if (!name || !type || !data) {
          return Response.json(
            { error: "name, type, and data are required" },
            { status: 400 },
          );
        }

        // Validate credential type
        const validTypes: CredentialType[] = [
          "postgres",
          "http_bearer",
          "http_api_key",
          "http_basic",
          "smtp",
          "webhook",
          "custom",
        ];
        if (!validTypes.includes(type)) {
          return Response.json(
            {
              error: `Invalid credential type. Must be one of: ${validTypes.join(", ")}`,
            },
            { status: 400 },
          );
        }

        // Encrypt the credential data
        let encryptedData: string;
        try {
          encryptedData = encrypt(data);
        } catch (error) {
          console.error("Encryption error:", error);
          return Response.json(
            {
              error:
                "Failed to encrypt credential data. Check CREDENTIALS_ENCRYPTION_KEY.",
            },
            { status: 500 },
          );
        }

        const id = uuid();
        const now = new Date();

        try {
          await db.insert(credentials).values({
            id,
            userId: session.user.id,
            name,
            type,
            encryptedData,
            description: description || null,
            createdAt: now,
            updatedAt: now,
          });

          return Response.json({ id, name, type });
        } catch (error) {
          console.error("Database error:", error);
          return Response.json(
            { error: "Failed to create credential" },
            { status: 500 },
          );
        }
      },
    },
  },
});
