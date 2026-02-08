import { Key, Lock, Webhook, Settings } from "lucide-react";
import { SiOpenai, SiGooglegemini, SiVercel, SiPostgresql } from "react-icons/si";
import { XAIIcon } from "@/components/icons/xai";
import type { CredentialType } from "@/lib/credentials/types";

interface CredentialTypeIconProps {
  type: CredentialType;
  className?: string;
}

export function CredentialTypeIcon({
  type,
  className = "w-5 h-5",
}: CredentialTypeIconProps) {
  // Extract size from className for react-icons
  const sizeMatch = className.match(/w-(\d+)/);
  const size = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 20;

  switch (type) {
    case "postgres":
      return <SiPostgresql className={className} />;
    case "http_bearer":
    case "http_api_key":
      return <Key className={className} />;
    case "http_basic":
      return <Lock className={className} />;
    case "webhook":
      return <Webhook className={className} />;
    case "openai":
      return <SiOpenai className={className} />;
    case "xai":
      return <XAIIcon size={size} className={className} />;
    case "gemini":
      return <SiGooglegemini className={className} />;
    case "vercel_ai_gateway":
      return <SiVercel className={className} />;
    case "custom":
    default:
      return <Settings className={className} />;
  }
}

// Color mappings for credential types
export function getCredentialTypeColor(type: CredentialType): string {
  switch (type) {
    case "postgres":
      return "text-[#336791] bg-blue-50";
    case "http_bearer":
    case "http_api_key":
      return "text-amber-600 bg-amber-100";
    case "http_basic":
      return "text-purple-600 bg-purple-100";
    case "webhook":
      return "text-pink-600 bg-pink-100";
    case "openai":
      return "text-[#10a37f] bg-emerald-50";
    case "xai":
      return "text-black bg-gray-100";
    case "gemini":
      return "text-[#4285f4] bg-blue-50";
    case "vercel_ai_gateway":
      return "text-black bg-gray-100";
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
    case "webhook":
      return "Webhook";
    case "openai":
      return "OpenAI";
    case "xai":
      return "xAI (Grok)";
    case "gemini":
      return "Google Gemini";
    case "vercel_ai_gateway":
      return "Vercel AI Gateway";
    case "custom":
      return "Custom";
    default:
      return type;
  }
}
