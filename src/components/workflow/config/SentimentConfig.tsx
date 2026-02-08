import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { ExpressionInput } from "./ExpressionInput";
import { CredentialSelector } from "@/components/credentials";
import type { AIProvider } from "@/lib/workflow/types";
import type { CredentialType } from "@/lib/credentials/types";
import {
  getModelsForProvider,
  getDefaultModel,
} from "@/lib/integrations/sentiment";

interface SentimentConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "vercel-ai-gateway", label: "Vercel AI Gateway" },
];

// Map AIProvider to CredentialType
function getCredentialType(provider: AIProvider): CredentialType {
  switch (provider) {
    case "openai":
      return "openai";
    case "xai":
      return "xai";
    case "gemini":
      return "gemini";
    case "vercel-ai-gateway":
      return "vercel_ai_gateway";
    default:
      return "custom";
  }
}

export function SentimentConfig({
  config,
  onChange,
  nodeId,
}: SentimentConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const provider = (config.provider as AIProvider) || "openai";
  const model = (config.model as string) || getDefaultModel(provider);
  const credentialId = config.credentialId as string | undefined;
  const text = (config.text as string) || "";
  const language = (config.language as string) || "auto";
  const includeEmotions = (config.includeEmotions as boolean) || false;
  const confidenceThreshold = (config.confidenceThreshold as number) || 0.5;

  const models = getModelsForProvider(provider);

  const handleProviderChange = (newProvider: AIProvider) => {
    onChange("provider", newProvider);
    // Reset model to default for new provider
    onChange("model", getDefaultModel(newProvider));
    // Clear credential since type changed
    onChange("credentialId", "");
  };

  return (
    <div className="space-y-4">
      {/* Text Input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Text to Analyze
        </label>
        <ExpressionInput
          value={text}
          onChange={(value) => onChange("text", value)}
          nodeId={nodeId}
          placeholder="Enter text or use {{ variable }}"
          multiline
        />
        <p className="text-xs text-gray-400 mt-1">
          The text to analyze for sentiment
        </p>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          AI Provider
        </label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => onChange("model", e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Credential Selector */}
      <CredentialSelector
        type={getCredentialType(provider)}
        value={credentialId}
        onChange={(id) => onChange("credentialId", id || "")}
        label="API Credential"
        placeholder="Select credential..."
        required
      />

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
      >
        {showAdvanced ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        Advanced Options
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-3 pl-2 border-l-2 border-gray-100">
          {/* Include Emotions */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeEmotions}
              onChange={(e) => onChange("includeEmotions", e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-accent 
                         focus:ring-accent/30"
            />
            <span className="text-xs text-gray-600">
              Include emotion breakdown
            </span>
          </label>
          <p className="text-xs text-gray-400 -mt-1 ml-5">
            Analyze joy, anger, sadness, fear, surprise, disgust
          </p>

          {/* Language */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Language
            </label>
            <input
              type="text"
              value={language}
              onChange={(e) => onChange("language", e.target.value)}
              placeholder="auto"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                         focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Language code (e.g., "en", "es") or "auto" to detect
            </p>
          </div>

          {/* Confidence Threshold */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Confidence Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) =>
                  onChange("confidenceThreshold", parseFloat(e.target.value))
                }
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer
                           accent-accent"
              />
              <span className="text-xs text-gray-600 w-8 text-right">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Minimum confidence for sentiment classification
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-pink-50 border border-pink-100 rounded-md p-2.5">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
          <div className="text-xs text-pink-700">
            <p className="font-medium mb-1">Output Variables</p>
            <ul className="text-pink-600 space-y-0.5">
              <li>
                <code className="bg-pink-100 px-1 rounded">sentiment</code> -
                positive, negative, neutral, or mixed
              </li>
              <li>
                <code className="bg-pink-100 px-1 rounded">confidence</code> - 0
                to 1 confidence score
              </li>
              <li>
                <code className="bg-pink-100 px-1 rounded">scores</code> -
                breakdown by sentiment type
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
