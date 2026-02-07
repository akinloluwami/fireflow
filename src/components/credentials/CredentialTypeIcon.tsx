import { Database, Key, Lock, Mail, Webhook, Settings } from "lucide-react";
import type { CredentialType } from "@/lib/credentials/types";

interface CredentialTypeIconProps {
  type: CredentialType;
  className?: string;
}

export function CredentialTypeIcon({
  type,
  className = "w-5 h-5",
}: CredentialTypeIconProps) {
  switch (type) {
    case "postgres":
      return <Database className={className} />;
    case "http_bearer":
    case "http_api_key":
      return <Key className={className} />;
    case "http_basic":
      return <Lock className={className} />;
    case "smtp":
      return <Mail className={className} />;
    case "webhook":
      return <Webhook className={className} />;
    case "custom":
    default:
      return <Settings className={className} />;
  }
}

// Color mappings for credential types
export function getCredentialTypeColor(type: CredentialType): string {
  switch (type) {
    case "postgres":
      return "text-blue-600 bg-blue-100";
    case "http_bearer":
    case "http_api_key":
      return "text-amber-600 bg-amber-100";
    case "http_basic":
      return "text-purple-600 bg-purple-100";
    case "smtp":
      return "text-green-600 bg-green-100";
    case "webhook":
      return "text-pink-600 bg-pink-100";
    case "custom":
    default:
      return "text-gray-600 bg-gray-100";
  }
}

// Human-readable labels
export function getCredentialTypeLabel(type: CredentialType): string {
  switch (type) {
    case "postgres":
      return "PostgreSQL";
    case "http_bearer":
      return "Bearer Token";
    case "http_api_key":
      return "API Key";
    case "http_basic":
      return "Basic Auth";
    case "smtp":
      return "SMTP";
    case "webhook":
      return "Webhook";
    case "custom":
      return "Custom";
    default:
      return type;
  }
}
