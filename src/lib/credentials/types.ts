/**
 * Credential Types and Interfaces
 *
 * Defines all supported credential types and their data structures.
 * These are encrypted at rest in the database.
 */

// Credential type identifiers
export type CredentialType =
  | "postgres"
  | "http_bearer"
  | "http_api_key"
  | "http_basic"
  | "webhook"
  | "custom";

// Individual credential data structures (what gets encrypted)
export interface PostgresCredentialData {
  // Either use a connection string OR individual fields
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export interface HttpBearerCredentialData {
  token: string;
}

export interface HttpApiKeyCredentialData {
  key: string;
  value: string;
  addTo: "header" | "query";
}

export interface HttpBasicCredentialData {
  username: string;
  password: string;
}

export interface WebhookCredentialData {
  secret: string;
  headerName?: string;
}

export interface CustomCredentialData {
  [key: string]: string;
}

// Union type of all credential data
export type CredentialData =
  | PostgresCredentialData
  | HttpBearerCredentialData
  | HttpApiKeyCredentialData
  | HttpBasicCredentialData
  | WebhookCredentialData
  | CustomCredentialData;

// Type mapping for type-safe access
export interface CredentialDataMap {
  postgres: PostgresCredentialData;
  http_bearer: HttpBearerCredentialData;
  http_api_key: HttpApiKeyCredentialData;
  http_basic: HttpBasicCredentialData;
  webhook: WebhookCredentialData;
  custom: CustomCredentialData;
}

// Database row type (from schema)
export interface CredentialRow {
  id: string;
  userId: string;
  name: string;
  type: CredentialType;
  encryptedData: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Credential with decrypted data (for internal use)
export interface DecryptedCredential<
  T extends CredentialType = CredentialType,
> {
  id: string;
  userId: string;
  name: string;
  type: T;
  data: CredentialDataMap[T];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API request/response types
export interface CreateCredentialRequest<
  T extends CredentialType = CredentialType,
> {
  name: string;
  type: T;
  data: CredentialDataMap[T];
  description?: string;
}

export interface UpdateCredentialRequest<
  T extends CredentialType = CredentialType,
> {
  name?: string;
  data?: CredentialDataMap[T];
  description?: string;
}

// Credential list item (without sensitive data)
export interface CredentialListItem {
  id: string;
  name: string;
  type: CredentialType;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Credential type metadata for UI
export interface CredentialTypeMeta {
  type: CredentialType;
  label: string;
  description: string;
  icon: string; // Icon name
  fields: CredentialFieldMeta[];
}

export interface CredentialFieldMeta {
  name: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "boolean";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
}

// Credential type definitions with field metadata
export const CREDENTIAL_TYPE_META: Record<CredentialType, CredentialTypeMeta> =
  {
    postgres: {
      type: "postgres",
      label: "PostgreSQL",
      description: "PostgreSQL database connection",
      icon: "Database",
      fields: [
        {
          name: "host",
          label: "Host",
          type: "text",
          required: true,
          placeholder: "localhost",
        },
        {
          name: "port",
          label: "Port",
          type: "number",
          required: true,
          placeholder: "5432",
          defaultValue: 5432,
        },
        {
          name: "database",
          label: "Database",
          type: "text",
          required: true,
          placeholder: "mydb",
        },
        {
          name: "user",
          label: "Username",
          type: "text",
          required: true,
          placeholder: "postgres",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
        {
          name: "ssl",
          label: "Use SSL",
          type: "boolean",
          required: false,
          defaultValue: false,
        },
      ],
    },
    http_bearer: {
      type: "http_bearer",
      label: "HTTP Bearer Token",
      description: "Bearer token for API authentication",
      icon: "Key",
      fields: [
        {
          name: "token",
          label: "Token",
          type: "password",
          required: true,
          placeholder: "your-api-token",
        },
      ],
    },
    http_api_key: {
      type: "http_api_key",
      label: "HTTP API Key",
      description: "API key authentication",
      icon: "Key",
      fields: [
        {
          name: "key",
          label: "Key Name",
          type: "text",
          required: true,
          placeholder: "X-API-Key",
        },
        { name: "value", label: "Key Value", type: "password", required: true },
        {
          name: "addTo",
          label: "Add To",
          type: "select",
          required: true,
          options: [
            { value: "header", label: "Header" },
            { value: "query", label: "Query Parameter" },
          ],
          defaultValue: "header",
        },
      ],
    },
    http_basic: {
      type: "http_basic",
      label: "HTTP Basic Auth",
      description: "Basic authentication with username and password",
      icon: "Lock",
      fields: [
        { name: "username", label: "Username", type: "text", required: true },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
      ],
    },
    webhook: {
      type: "webhook",
      label: "Webhook Secret",
      description: "Secret for webhook signature verification",
      icon: "Webhook",
      fields: [
        { name: "secret", label: "Secret", type: "password", required: true },
        {
          name: "headerName",
          label: "Header Name",
          type: "text",
          required: false,
          placeholder: "X-Webhook-Signature",
        },
      ],
    },
    custom: {
      type: "custom",
      label: "Custom",
      description: "Custom key-value pairs",
      icon: "Settings",
      fields: [], // Dynamic fields handled in UI
    },
  };
