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

// Verify AI API keys before saving
async function verifyAIApiKey(
  type: CredentialType,
  apiKey: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (type) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            valid: false,
            error: data.error?.message || `OpenAI API error: ${res.status}`,
          };
        }
        return { valid: true };
      }

      case "xai": {
        const res = await fetch("https://api.x.ai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            valid: false,
            error: data.error?.message || `xAI API error: ${res.status}`,
          };
        }
        return { valid: true };
      }

      case "gemini": {
        // Test actual content generation to catch quota issues
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Say hi" }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            valid: false,
            error: data.error?.message || `Gemini API error: ${res.status}`,
          };
        }
        return { valid: true };
      }

      case "vercel_ai_gateway": {
        // Vercel AI Gateway - test with a simple models list
        const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            valid: false,
            error:
              data.error?.message || `Vercel AI Gateway error: ${res.status}`,
          };
        }
        return { valid: true };
      }

      default:
        // Non-AI credentials don't need verification
        return { valid: true };
    }
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "Failed to verify API key",
    };
  }
}

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
          "webhook",
          "custom",
          "openai",
          "xai",
          "gemini",
          "vercel_ai_gateway",
        ];
        if (!validTypes.includes(type)) {
          return Response.json(
            {
              error: `Invalid credential type. Must be one of: ${validTypes.join(", ")}`,
            },
            { status: 400 },
          );
        }

        // Verify AI API keys before saving
        if (["openai", "xai", "gemini", "vercel_ai_gateway"].includes(type)) {
          const apiKey = (data as { apiKey?: string }).apiKey;
          if (!apiKey) {
            return Response.json(
              { error: "API key is required" },
              { status: 400 },
            );
          }

          const verification = await verifyAIApiKey(type, apiKey);
          if (!verification.valid) {
            return Response.json(
              { error: `Invalid API key: ${verification.error}` },
              { status: 400 },
            );
          }
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
