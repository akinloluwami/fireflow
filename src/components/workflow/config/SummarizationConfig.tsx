import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Link2 } from "lucide-react";
import { ExpressionInput } from "./ExpressionInput";

interface SummarizationConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function SummarizationConfig({
  config,
  onChange,
  nodeId,
}: SummarizationConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const text = (config.text as string) || "";
  const style = (config.style as string) || "concise";
  const maxLength = (config.maxLength as number) || 0;
  const language = (config.language as string) || "auto";

  return (
    <div className="space-y-4">
      {/* Model Connection Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5">
        <div className="flex items-start gap-2">
          <Link2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-1">AI Model Required</p>
            <p className="text-gray-500">
              Connect an <strong>AI Model</strong> node to the Model input below
              this node to configure the AI provider and credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Text Input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Text to Summarize
        </label>
        <ExpressionInput
          value={text}
          onChange={(value) => onChange("text", value)}
          nodeId={nodeId}
          placeholder="Enter text or use {{ variable }}"
          multiline
        />
        <p className="text-xs text-gray-400 mt-1">
          The text to summarize
        </p>
      </div>

      {/* Summary Style */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Summary Style
        </label>
        <select
          value={style}
          onChange={(e) => onChange("style", e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                     focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
        >
          <option value="concise">Concise</option>
          <option value="detailed">Detailed</option>
          <option value="bullet-points">Bullet Points</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          How the summary should be formatted
        </p>
      </div>

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
          {/* Max Length */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Max Length (words)
            </label>
            <input
              type="number"
              value={maxLength || ""}
              onChange={(e) =>
                onChange("maxLength", e.target.value ? parseInt(e.target.value, 10) : 0)
              }
              placeholder="No limit"
              min={0}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                         focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Approximate max words for the summary (0 = no limit)
            </p>
          </div>

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
        </div>
      )}

      {/* Info Box */}
      <div className="bg-pink-50 border border-pink-100 rounded-md p-2.5">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
          <div className="text-xs text-pink-700">
            <p className="font-medium mb-1">Output Variables</p>
            <ul className="text-pink-600 space-y-0.5">
              <li>
                <code className="bg-pink-100 px-1 rounded">summary</code> -
                the summarized text
              </li>
              <li>
                <code className="bg-pink-100 px-1 rounded">wordCount</code> -
                word count of the summary
              </li>
              <li>
                <code className="bg-pink-100 px-1 rounded">originalWordCount</code> -
                word count of the original text
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
