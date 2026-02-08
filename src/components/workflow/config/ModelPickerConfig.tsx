import { useState, useRef, useEffect } from "react";
import { CredentialSelector } from "@/components/credentials";
import type { AIProvider } from "@/lib/workflow/types";
import type { CredentialType } from "@/lib/credentials/types";
import {
  getModelsForProvider,
  getDefaultModel,
} from "@/lib/integrations/sentiment";
import { SiOpenai, SiGooglegemini, SiVercel } from "react-icons/si";
import { XAIIcon } from "@/components/icons/xai";
import { ChevronDown } from "lucide-react";

interface ModelPickerConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

const PROVIDERS: {
  value: AIProvider;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "openai",
    label: "OpenAI",
    icon: <SiOpenai size={16} />,
    color: "#000000",
  },
  {
    value: "xai",
    label: "xAI (Grok)",
    icon: <XAIIcon size={16} />,
    color: "#000000",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    icon: <SiGooglegemini size={16} />,
    color: "#8E75B2",
  },
  {
    value: "vercel-ai-gateway",
    label: "Vercel AI",
    icon: <SiVercel size={16} />,
    color: "#000000",
  },
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

export function ModelPickerConfig({
  config,
  onChange,
}: ModelPickerConfigProps) {
  const provider = config.provider as AIProvider | undefined;
  const model =
    (config.model as string) || (provider ? getDefaultModel(provider) : "");
  const credentialId = config.credentialId as string | undefined;

  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const models = provider ? getModelsForProvider(provider) : [];
  const selectedProvider = PROVIDERS.find((p) => p.value === provider);
  const selectedModel = models.find((m) => m.value === model);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        providerDropdownRef.current &&
        !providerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProviderOpen(false);
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProviderChange = (newProvider: AIProvider) => {
    onChange("provider", newProvider);
    // Reset model to default for new provider
    onChange("model", getDefaultModel(newProvider));
    // Clear credential since type changed
    onChange("credentialId", "");
    setIsProviderOpen(false);
  };

  const handleModelChange = (newModel: string) => {
    onChange("model", newModel);
    setIsModelOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Provider Selection - Custom Dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          AI Provider
        </label>
        <div ref={providerDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProviderOpen(!isProviderOpen)}
            className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                       flex items-center justify-between"
          >
            {selectedProvider ? (
              <div className="flex items-center gap-2">
                <span style={{ color: selectedProvider.color }}>
                  {selectedProvider.icon}
                </span>
                <span>{selectedProvider.label}</span>
              </div>
            ) : (
              <span className="text-gray-400">Select a provider...</span>
            )}
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${isProviderOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isProviderOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleProviderChange(p.value)}
                  className={`w-full px-2.5 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors
                             ${provider === p.value ? "bg-gray-50" : ""}`}
                >
                  <span style={{ color: p.color }}>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Model Selection - Custom Dropdown */}
      {provider && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Model
          </label>
          <div ref={modelDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-md
                         focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                         flex items-center justify-between"
            >
              {selectedModel ? (
                <span>{selectedModel.label}</span>
              ) : (
                <span className="text-gray-400">Select a model...</span>
              )}
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${isModelOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isModelOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {models.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleModelChange(m.value)}
                    className={`w-full px-2.5 py-2 text-xs text-left hover:bg-gray-50 transition-colors
                               ${model === m.value ? "bg-gray-50 font-medium" : ""}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credential Selection - Only show if provider selected */}
      {provider && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            API Credential <span className="text-red-500">*</span>
          </label>
          <CredentialSelector
            value={credentialId}
            onChange={(value) => onChange("credentialId", value)}
            type={getCredentialType(provider)}
            placeholder={`Select ${selectedProvider?.label} credential`}
          />
        </div>
      )}
    </div>
  );
}
