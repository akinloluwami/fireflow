import { ExpressionInput } from "./ExpressionInput";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { v4 as uuid } from "uuid";

interface SetVariableConfigProps {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
}

interface Variable {
  id: string;
  name: string;
  value: string;
}

/**
 * Convert config.variables to the internal Variable[] format
 */
function parseVariables(vars: unknown): Variable[] {
  // New format: array of { id, name, value }
  if (Array.isArray(vars)) {
    return vars as Variable[];
  }

  // Old format: object { name: value }
  if (vars && typeof vars === "object") {
    return Object.entries(vars as Record<string, string>).map(
      ([name, value]) => ({
        id: uuid(),
        name,
        value,
      }),
    );
  }

  return [];
}

export function SetVariableConfig({
  config,
  onChange,
  nodeId,
}: SetVariableConfigProps) {
  // Derive variables directly from config - no local state needed
  const variables = parseVariables(config.variables);

  const handleAddVariable = () => {
    const newVars = [...variables, { id: uuid(), name: "", value: "" }];
    onChange("variables", newVars);
  };

  const handleUpdateVariable = (
    id: string,
    field: "name" | "value",
    newValue: string,
  ) => {
    const newVars = variables.map((v) =>
      v.id === id ? { ...v, [field]: newValue } : v,
    );
    onChange("variables", newVars);
  };

  const handleRemoveVariable = (id: string) => {
    const newVars = variables.filter((v) => v.id !== id);
    onChange("variables", newVars);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-600">
          Variables
        </label>
        <span className="text-[10px] text-gray-400">
          {variables.length} variable{variables.length !== 1 ? "s" : ""}
        </span>
      </div>

      {variables.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-xs text-gray-500 mb-2">No variables defined</p>
          <button
            type="button"
            onClick={handleAddVariable}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       text-accent bg-accent/10 rounded-md hover:bg-accent/20 transition-colors"
          >
            <Plus size={12} />
            Add Variable
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => (
            <div
              key={variable.id}
              className="group bg-gray-50 rounded-lg border border-gray-200 p-2.5"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical size={12} className="text-gray-400" />
                </div>

                <div className="flex-1 space-y-2">
                  {/* Variable Name */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) =>
                        handleUpdateVariable(
                          variable.id,
                          "name",
                          e.target.value,
                        )
                      }
                      placeholder="myVariable"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md
                                 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent
                                 placeholder:text-gray-400 font-mono"
                    />
                  </div>

                  {/* Variable Value */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                      Value
                    </label>
                    <ExpressionInput
                      value={variable.value}
                      onChange={(value) =>
                        handleUpdateVariable(variable.id, "value", value)
                      }
                      nodeId={nodeId}
                      placeholder="{{ trigger.data }} or static value"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveVariable(variable.id)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 
                             hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddVariable}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <Plus size={12} />
            Add another variable
          </button>
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Access variables later with {"{{ variables.name }}"}
      </p>
    </div>
  );
}
