import { useState } from "react";
import { ExpressionInput } from "./ExpressionInput";
import { Info, Plus, Trash2, GripVertical } from "lucide-react";

interface SwitchCase {
  id: string;
  value: string;
  label?: string;
}

interface SwitchConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

export function SwitchConfig({ config, onChange, nodeId }: SwitchConfigProps) {
  const field = (config.field as string) || "";
  const cases = (config.cases as SwitchCase[]) || [];
  const hasDefault = (config.hasDefault as boolean) ?? true;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addCase = () => {
    const newCase: SwitchCase = {
      id: `case_${Date.now()}`,
      value: "",
      label: `Case ${cases.length + 1}`,
    };
    onChange("cases", [...cases, newCase]);
  };

  const updateCase = (index: number, updates: Partial<SwitchCase>) => {
    const newCases = [...cases];
    newCases[index] = { ...newCases[index], ...updates };
    onChange("cases", newCases);
  };

  const removeCase = (index: number) => {
    onChange(
      "cases",
      cases.filter((_, i) => i !== index),
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newCases = [...cases];
    const draggedItem = newCases[draggedIndex];
    newCases.splice(draggedIndex, 1);
    newCases.splice(index, 0, draggedItem);
    onChange("cases", newCases);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Generate colors for cases
  const getCaseColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-rose-500",
      "bg-cyan-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
        <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          Route your workflow to different paths based on matching values. Each
          case becomes a separate output branch.
        </p>
      </div>

      {/* Field to Check */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Value to Match
        </label>
        <ExpressionInput
          value={field}
          onChange={(val) => onChange("field", val)}
          nodeId={nodeId}
          placeholder="e.g., {{ trigger.status }}"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          The value that will be compared against each case
        </p>
      </div>

      {/* Cases */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600">Cases</label>
          <button
            onClick={addCase}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-accent 
                       bg-accent/10 rounded hover:bg-accent/20 transition-colors"
          >
            <Plus size={10} />
            Add Case
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="p-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-xs text-gray-400">No cases defined</p>
            <button
              onClick={addCase}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Add your first case
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((caseItem, index) => (
              <div
                key={caseItem.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg
                  ${draggedIndex === index ? "opacity-50" : ""}
                  hover:border-gray-300 transition-colors
                `}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-gray-300 hover:text-gray-400">
                  <GripVertical size={14} />
                </div>

                {/* Color indicator */}
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${getCaseColor(index)}`}
                />

                {/* Value input */}
                <input
                  type="text"
                  value={caseItem.value}
                  onChange={(e) => updateCase(index, { value: e.target.value })}
                  placeholder="Match value..."
                  className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded
                             focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
                />

                {/* Label input */}
                <input
                  type="text"
                  value={caseItem.label || ""}
                  onChange={(e) => updateCase(index, { label: e.target.value })}
                  placeholder="Label"
                  className="w-20 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded
                             focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
                />

                {/* Remove button */}
                <button
                  onClick={() => removeCase(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default branch toggle */}
      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs font-medium text-gray-600">Default Branch</p>
          <p className="text-[10px] text-gray-400">
            Route here if no case matches
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hasDefault}
            onChange={(e) => onChange("hasDefault", e.target.checked)}
            className="sr-only peer"
          />
          <div
            className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 
                          peer-focus:ring-accent/20 rounded-full peer 
                          peer-checked:after:translate-x-full peer-checked:after:border-white 
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                          after:bg-white after:border-gray-300 after:border after:rounded-full 
                          after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"
          />
        </label>
      </div>

      {/* Branch Preview */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 mb-2">Branches</p>
        <div className="space-y-1.5">
          {cases.map((caseItem, index) => (
            <div
              key={caseItem.id}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-100"
            >
              <div className={`w-2 h-2 rounded-full ${getCaseColor(index)}`} />
              <span className="text-[11px] text-gray-700 font-medium">
                {caseItem.label || `Case ${index + 1}`}
              </span>
              <span className="text-[10px] text-gray-400 ml-auto">
                = "{caseItem.value}"
              </span>
            </div>
          ))}
          {hasDefault && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 rounded-md border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-[11px] text-gray-600 font-medium">
                Default
              </span>
              <span className="text-[10px] text-gray-400 ml-auto">
                No match
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
