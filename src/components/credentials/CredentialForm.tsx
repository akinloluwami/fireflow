import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Check, AlertCircle, ChevronDown } from "lucide-react";
import {
  CredentialTypeIcon,
  getCredentialTypeLabel,
  getCredentialTypeColor,
} from "./CredentialTypeIcon";
import {
  CREDENTIAL_TYPE_META,
  type CredentialType,
  type CredentialData,
  type CredentialListItem,
  type CredentialFieldMeta,
} from "@/lib/credentials/types";

function getNamePlaceholder(type: CredentialType): string {
  switch (type) {
    case "postgres":
      return "e.g., Production Database";
    case "http_bearer":
      return "e.g., GitHub API Token";
    case "http_api_key":
      return "e.g., Stripe API Key";
    case "http_basic":
      return "e.g., Legacy API Auth";
    case "smtp":
      return "e.g., SendGrid SMTP";
    case "webhook":
      return "e.g., Stripe Webhook Secret";
    case "custom":
      return "e.g., My Custom Credential";
    default:
      return "e.g., My Credential";
  }
}

function getDescriptionPlaceholder(type: CredentialType): string {
  switch (type) {
    case "postgres":
      return "e.g., Main PostgreSQL database for analytics";
    case "http_bearer":
      return "e.g., Personal access token for GitHub API";
    case "http_api_key":
      return "e.g., API key for payment processing";
    case "http_basic":
      return "e.g., Basic auth for internal service";
    case "smtp":
      return "e.g., Email server for notifications";
    case "webhook":
      return "e.g., Secret for verifying incoming webhooks";
    case "custom":
      return "e.g., Custom configuration values";
    default:
      return "e.g., Description of this credential";
  }
}

interface CredentialFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCredential?: CredentialListItem | null;
  /** Pre-select a credential type (useful when creating from a specific node config) */
  defaultType?: CredentialType;
}

export function CredentialForm({
  isOpen,
  onClose,
  onSuccess,
  editingCredential,
  defaultType,
}: CredentialFormProps) {
  const [type, setType] = useState<CredentialType>(defaultType || "postgres");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldValues, setFieldValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [customFields, setCustomFields] = useState<
    Array<{ key: string; value: string }>
  >([{ key: "", value: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  // For postgres: toggle between connection string and individual fields
  const [useConnectionString, setUseConnectionString] = useState(true);
  const [connectionString, setConnectionString] = useState("");

  const isEditing = !!editingCredential;

  // Load credential data when editing
  useEffect(() => {
    if (editingCredential) {
      setName(editingCredential.name);
      setType(editingCredential.type);
      setDescription(editingCredential.description || "");

      // Fetch full credential data
      fetch(`/api/credentials/${editingCredential.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            if (editingCredential.type === "custom") {
              setCustomFields(
                Object.entries(data.data).map(([key, value]) => ({
                  key,
                  value: String(value),
                })),
              );
            } else if (
              editingCredential.type === "postgres" &&
              data.data.connectionString
            ) {
              // If postgres with connection string
              setUseConnectionString(true);
              setConnectionString(data.data.connectionString);
            } else {
              setUseConnectionString(false);
              setFieldValues(data.data);
            }
          }
        })
        .catch(console.error);
    } else {
      // Reset form
      setName("");
      setDescription("");
      setFieldValues({});
      setCustomFields([{ key: "", value: "" }]);
      setType(defaultType || "postgres");
      setUseConnectionString(true);
      setConnectionString("");
    }
    setError(null);
    setTestResult(null);
  }, [editingCredential, isOpen, defaultType]);

  // Initialize default values when type changes
  useEffect(() => {
    if (!isEditing) {
      const meta = CREDENTIAL_TYPE_META[type];
      const defaults: Record<string, string | number | boolean> = {};
      meta.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      });
      setFieldValues(defaults);
      setCustomFields([{ key: "", value: "" }]);
    }
  }, [type, isEditing]);

  const typeMeta = useMemo(() => CREDENTIAL_TYPE_META[type], [type]);

  const handleFieldChange = (
    fieldName: string,
    value: string | number | boolean,
  ) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleCustomFieldChange = (
    index: number,
    key: string,
    value: string,
  ) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      updated[index] = { key, value };
      return updated;
    });
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const buildCredentialData = (): CredentialData => {
    if (type === "custom") {
      const data: Record<string, string> = {};
      customFields.forEach((field) => {
        if (field.key.trim()) {
          data[field.key.trim()] = field.value;
        }
      });
      return data;
    }
    // For postgres with connection string mode
    if (type === "postgres" && useConnectionString) {
      return { connectionString } as CredentialData;
    }
    return fieldValues as CredentialData;
  };

  const handleTest = async () => {
    if (!editingCredential) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/credentials/${editingCredential.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error || "Test completed",
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: "Failed to test credential",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const credentialData = buildCredentialData();

      const url = isEditing
        ? `/api/credentials/${editingCredential.id}`
        : "/api/credentials";
      const method = isEditing ? "PUT" : "POST";

      const body = isEditing
        ? { name, description, data: credentialData }
        : { name, type, description, data: credentialData };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save credential");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Credential" : "New Credential"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selector */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${getCredentialTypeColor(type)}`}
                    >
                      <CredentialTypeIcon type={type} className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {getCredentialTypeLabel(type)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {typeMeta.description}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isTypeDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isTypeDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {Object.values(CREDENTIAL_TYPE_META).map((meta) => (
                      <button
                        key={meta.type}
                        type="button"
                        onClick={() => {
                          setType(meta.type);
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          type === meta.type ? "bg-accent/5" : ""
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${getCredentialTypeColor(meta.type)}`}
                        >
                          <CredentialTypeIcon
                            type={meta.type}
                            className="w-4 h-4"
                          />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {meta.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {meta.description}
                          </div>
                        </div>
                        {type === meta.type && (
                          <Check className="w-4 h-4 text-accent ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={getNamePlaceholder(type)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={getDescriptionPlaceholder(type)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>

          {/* PostgreSQL-specific: Connection String OR Individual Fields */}
          {type === "postgres" && (
            <div className="space-y-4">
              {/* Toggle between connection string and individual fields */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUseConnectionString(true)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    useConnectionString
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Connection String
                </button>
                <button
                  type="button"
                  onClick={() => setUseConnectionString(false)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    !useConnectionString
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Individual Fields
                </button>
              </div>

              {useConnectionString ? (
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">
                    Connection String
                    <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <input
                    type="password"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="postgresql://user:password@localhost:5432/database"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400">
                    Format: postgresql://user:password@host:port/database
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {typeMeta.fields.map((field) => (
                    <CredentialField
                      key={field.name}
                      field={field}
                      value={fieldValues[field.name]}
                      onChange={(value) => handleFieldChange(field.name, value)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type-specific fields (for non-postgres, non-custom types) */}
          {type !== "custom" && type !== "postgres" && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">
                Connection Details
              </div>
              <div className="space-y-3">
                {typeMeta.fields.map((field) => (
                  <CredentialField
                    key={field.name}
                    field={field}
                    value={fieldValues[field.name]}
                    onChange={(value) => handleFieldChange(field.name, value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom fields */}
          {type === "custom" && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">
                Custom Fields
              </div>
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) =>
                        handleCustomFieldChange(
                          index,
                          e.target.value,
                          field.value,
                        )
                      }
                      placeholder="Key"
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                    <input
                      type="password"
                      value={field.value}
                      onChange={(e) =>
                        handleCustomFieldChange(
                          index,
                          field.key,
                          e.target.value,
                        )
                      }
                      placeholder="Value"
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                    {customFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCustomField}
                  className="text-sm text-accent hover:text-accent-hover font-medium"
                >
                  + Add field
                </button>
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl ${
                testResult.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.success ? (
                <Check className="w-5 h-5 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isEditing && (
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Test Connection"
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Credential"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Individual field component
interface CredentialFieldProps {
  field: CredentialFieldMeta;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}

function CredentialField({ field, value, onChange }: CredentialFieldProps) {
  const inputClassName =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
        />
        <span className="text-sm text-gray-700">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm text-gray-600">{field.label}</label>
        <select
          value={String(value || field.defaultValue || "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-600">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={
          field.type === "password"
            ? "password"
            : field.type === "number"
              ? "number"
              : "text"
        }
        value={typeof value === "boolean" ? "" : (value ?? "")}
        onChange={(e) =>
          onChange(
            field.type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        placeholder={field.placeholder}
        required={field.required}
        className={inputClassName}
      />
    </div>
  );
}
