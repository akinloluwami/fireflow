import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/credentials/encryption";
import type {
  CredentialData,
  PostgresCredentialData,
  HttpBearerCredentialData,
  HttpApiKeyCredentialData,
  HttpBasicCredentialData,
} from "@/lib/credentials/types";

export const Route = createFileRoute("/api/credentials/$id/test")({
  server: {
    handlers: {
      // Test a credential connection
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Get the credential
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

        // Test based on credential type
        try {
          switch (credential.type) {
            case "postgres":
              return await testPostgres(data as PostgresCredentialData);

            case "http_bearer":
            case "http_api_key":
            case "http_basic":
              // For HTTP credentials, we just validate the format
              return validateHttpCredential(
                credential.type,
                data as
                  | HttpBearerCredentialData
                  | HttpApiKeyCredentialData
                  | HttpBasicCredentialData,
              );

            case "webhook":
            case "custom":
              // These can't be meaningfully tested without more context
              return Response.json({
                success: true,
                message:
                  "Credential format is valid. Connection test not available for this type.",
              });

            default:
              return Response.json({
                success: false,
                error: "Unknown credential type",
              });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return Response.json({
            success: false,
            error: `Test failed: ${errorMessage}`,
          });
        }
      },
    },
  },
});

async function testPostgres(data: PostgresCredentialData): Promise<Response> {
  // Dynamic import for postgres
  const { default: postgres } = await import("postgres");

  // If connection string is provided, use it directly
  // Otherwise use individual fields
  const sql = data.connectionString
    ? postgres(data.connectionString, { connect_timeout: 5, max: 1 })
    : postgres({
        host: data.host,
        port: data.port,
        database: data.database,
        user: data.user,
        password: data.password,
        ssl: data.ssl ? { rejectUnauthorized: false } : undefined,
        connect_timeout: 5,
        max: 1,
      });

  try {
    const result = await sql`SELECT version()`;
    await sql.end();

    return Response.json({
      success: true,
      message: "Successfully connected to PostgreSQL",
      details: {
        version: result[0]?.version?.split(" ").slice(0, 2).join(" "),
      },
    });
  } catch (error) {
    await sql.end();
    throw error;
  }
}

function validateHttpCredential(
  type: string,
  data:
    | HttpBearerCredentialData
    | HttpApiKeyCredentialData
    | HttpBasicCredentialData,
): Response {
  switch (type) {
    case "http_bearer": {
      const bearerData = data as HttpBearerCredentialData;
      if (!bearerData.token || bearerData.token.trim() === "") {
        return Response.json({
          success: false,
          error: "Token is empty",
        });
      }
      return Response.json({
        success: true,
        message: "Bearer token format is valid",
      });
    }

    case "http_api_key": {
      const apiKeyData = data as HttpApiKeyCredentialData;
      if (!apiKeyData.key || !apiKeyData.value) {
        return Response.json({
          success: false,
          error: "API key name or value is missing",
        });
      }
      return Response.json({
        success: true,
        message: "API key format is valid",
      });
    }

    case "http_basic": {
      const basicData = data as HttpBasicCredentialData;
      if (!basicData.username || !basicData.password) {
        return Response.json({
          success: false,
          error: "Username or password is missing",
        });
      }
      return Response.json({
        success: true,
        message: "Basic auth credentials format is valid",
      });
    }

    default:
      return Response.json({
        success: false,
        error: "Unknown HTTP credential type",
      });
  }
}
