import { useState, useRef, useEffect } from "react";
import { ChevronDown, Clock } from "lucide-react";

interface WaitConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const timeUnits = [
  { value: "ms", label: "Milliseconds", shortLabel: "ms" },
  { value: "s", label: "Seconds", shortLabel: "sec" },
  { value: "m", label: "Minutes", shortLabel: "min" },
  { value: "h", label: "Hours", shortLabel: "hr" },
];

export function WaitConfig({ config, onChange }: WaitConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const duration = (config.duration as number) || 1000;
  const unit = (config.unit as string) || "ms";

  const selectedUnit = timeUnits.find((u) => u.value === unit) || timeUnits[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUnitSelect = (value: string) => {
    onChange("unit", value);
    setIsOpen(false);
  };

  // Calculate display value based on unit
  const getDisplayHint = () => {
    switch (unit) {
      case "ms":
        return duration >= 1000
          ? `= ${(duration / 1000).toFixed(1)} seconds`
          : "";
      case "s":
        return duration >= 60 ? `= ${(duration / 60).toFixed(1)} minutes` : "";
      case "m":
        return duration >= 60 ? `= ${(duration / 60).toFixed(1)} hours` : "";
      case "h":
        return duration >= 24 ? `= ${(duration / 24).toFixed(1)} days` : "";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
        <Clock size={14} className="text-amber-600" />
        <span className="text-xs text-amber-700">
          Pause workflow execution for the specified duration
        </span>
      </div>

      {/* Duration input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Duration
        </label>
        <div className="flex flex-col gap-2">
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => onChange("duration", Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                       placeholder:text-gray-400"
            placeholder="1000"
          />

          {/* Custom Dropdown */}
          <div className="relative w-full" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`
                flex items-center justify-between gap-2 w-full px-3 py-2 text-sm
                bg-white border rounded-lg transition-all
                ${
                  isOpen
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <span className="text-gray-700">{selectedUnit.label}</span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {timeUnits.map((timeUnit) => (
                  <button
                    key={timeUnit.value}
                    type="button"
                    onClick={() => handleUnitSelect(timeUnit.value)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm text-left
                      transition-colors
                      ${
                        timeUnit.value === unit
                          ? "bg-accent/10 text-accent"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <span>{timeUnit.label}</span>
                    <span className="text-xs text-gray-400">
                      {timeUnit.shortLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hint */}
        {getDisplayHint() && (
          <p className="mt-1.5 text-[10px] text-gray-400">{getDisplayHint()}</p>
        )}
      </div>

      {/* Quick presets */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { duration: 500, unit: "ms", label: "500ms" },
            { duration: 1, unit: "s", label: "1 sec" },
            { duration: 5, unit: "s", label: "5 sec" },
            { duration: 30, unit: "s", label: "30 sec" },
            { duration: 1, unit: "m", label: "1 min" },
            { duration: 5, unit: "m", label: "5 min" },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onChange("duration", preset.duration);
                onChange("unit", preset.unit);
              }}
              className={`
                px-2 py-1 text-[10px] font-medium rounded border transition-colors
                ${
                  duration === preset.duration && unit === preset.unit
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
