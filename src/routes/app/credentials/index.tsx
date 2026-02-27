import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  CredentialForm,
  CredentialTypeIcon,
  getCredentialTypeLabel,
  getCredentialTypeColor,
} from "@/components/credentials";
import {
  CREDENTIAL_TYPE_META,
  type CredentialType,
  type CredentialListItem,
} from "@/lib/credentials/types";

export const Route = createFileRoute("/app/credentials/")({
  head: () => ({
    meta: [{ title: "Credentials | FireFlow" }],
  }),
  component: CredentialsPage,
});

type TabCategory = "all" | "ai" | "database" | "http" | "other";

const TAB_CATEGORIES: { key: TabCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ai", label: "AI Providers" },
  { key: "http", label: "HTTP / API" },
  { key: "database", label: "Database" },
  { key: "other", label: "Other" },
];

function getTypeCategory(type: CredentialType): TabCategory {
  switch (type) {
    case "openai":
    case "xai":
    case "gemini":
    case "vercel_ai_gateway":
      return "ai";
    case "postgres":
      return "database";
    case "http_bearer":
    case "http_api_key":
    case "http_basic":
      return "http";
    default:
      return "other";
  }
}

function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] =
    useState<CredentialListItem | null>(null);
  const [defaultType, setDefaultType] = useState<CredentialType | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credential?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCredentials((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete credential:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (credential: CredentialListItem) => {
    setEditingCredential(credential);
    setIsFormOpen(true);
  };

  const handleConnect = () => {
    // Connect flow is now handled inside AppsAvailableModal
    fetchCredentials();
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCredential(null);
    setDefaultType(undefined);
  };

  const handleFormSuccess = () => {
    fetchCredentials();
  };

  // Group credentials by type for the connected count
  const credentialCountByType = useMemo(() => {
    const counts: Record<string, number> = {};
    credentials.forEach((c) => {
      counts[c.type] = (counts[c.type] || 0) + 1;
    });
    return counts;
  }, [credentials]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Credentials
            </h1>
            <p className="text-gray-500 text-sm">
              Manage your connections, API keys, and secrets
            </p>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
        </div>

        {/* Connected Credentials */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : credentials.length === 0 ? (
          <EmptyState onConnect={() => setShowConnectModal(true)} />
        ) : (
          <div className="space-y-3">
            {credentials.map((credential) => (
              <ConnectedCredentialRow
                key={credential.id}
                credential={credential}
                isDeleting={deletingId === credential.id}
                onEdit={() => handleEdit(credential)}
                onDelete={() => handleDelete(credential.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Apps Available Modal */}
        {showConnectModal && (
          <AppsAvailableModal
            onClose={() => setShowConnectModal(false)}
            onCredentialCreated={handleConnect}
            connectedCounts={credentialCountByType}
          />
        )}

        {/* Credential Form Modal */}
        <CredentialForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          editingCredential={editingCredential}
          defaultType={defaultType}
        />
      </main>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="text-center py-24 px-6">
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center">
        <Plus className="w-8 h-8 text-accent" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        No connections yet
      </h2>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
        Connect your apps and services to use them in your workflows.
      </p>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-all shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Add your first connection
      </button>
    </div>
  );
}

/* ─── Connected Credential Row ─── */
interface ConnectedCredentialRowProps {
  credential: CredentialListItem;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (date: Date | string) => string;
}

function ConnectedCredentialRow({
  credential,
  isDeleting,
  onEdit,
  onDelete,
  formatDate,
}: ConnectedCredentialRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all group">
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getCredentialTypeColor(credential.type)}`}
      >
        <CredentialTypeIcon type={credential.type} className="w-5 h-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate text-sm">
            {credential.name}
          </h3>
          <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full shrink-0">
            {getCredentialTypeLabel(credential.type)}
          </span>
        </div>
        {credential.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {credential.description}
          </p>
        )}
      </div>

      {/* Date */}
      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
        {formatDate(credential.updatedAt)}
      </span>

      {/* Connected badge */}
      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Connected
      </span>

      {/* Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={isDeleting}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreVertical className="w-4 h-4" />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            <button
              onClick={() => {
                onEdit();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => {
                onDelete();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Apps Available Modal ─── */
interface AppsAvailableModalProps {
  onClose: () => void;
  onCredentialCreated: () => void;
  connectedCounts: Record<string, number>;
}

function AppsAvailableModal({
  onClose,
  onCredentialCreated,
  connectedCounts,
}: AppsAvailableModalProps) {
  const [activeTab, setActiveTab] = useState<TabCategory>("all");
  const [search, setSearch] = useState("");
  const [connectingType, setConnectingType] = useState<CredentialType | null>(
    null,
  );

  const allApps = useMemo(() => {
    return Object.values(CREDENTIAL_TYPE_META).map((meta) => ({
      type: meta.type,
      label: meta.label,
      description: meta.description,
      category: getTypeCategory(meta.type),
      connectedCount: connectedCounts[meta.type] || 0,
    }));
  }, [connectedCounts]);

  const filteredApps = useMemo(() => {
    let apps = allApps;
    if (activeTab !== "all") {
      apps = apps.filter((a) => a.category === activeTab);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.label.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term),
      );
    }
    return apps;
  }, [allApps, activeTab, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col h-[820px]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Apps Available
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Select the app you would like to authenticate with.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors -mt-1 -mr-1"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mt-4">
            {TAB_CATEGORIES.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for an app"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
        </div>

        {/* App List */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">No apps found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredApps.map((app) => (
                <div key={app.type} className="flex items-center gap-4 py-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getCredentialTypeColor(app.type)}`}
                  >
                    <CredentialTypeIcon
                      type={app.type}
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">
                      {app.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {app.description}
                    </p>
                  </div>
                  {app.connectedCount > 0 ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {app.connectedCount} connected
                      </span>
                      <button
                        onClick={() => setConnectingType(app.type)}
                        className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        Add Another
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConnectingType(app.type)}
                      className="px-5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0"
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>

        {/* Connect Overlay Dialog */}
        {connectingType && (
          <ConnectOverlay
            type={connectingType}
            onClose={() => setConnectingType(null)}
            onSuccess={() => {
              setConnectingType(null);
              onCredentialCreated();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Connect Overlay (appears on top of Apps modal) ─── */
interface ConnectOverlayProps {
  type: CredentialType;
  onClose: () => void;
  onSuccess: () => void;
}

function ConnectOverlay({ type, onClose, onSuccess }: ConnectOverlayProps) {
  const meta = CREDENTIAL_TYPE_META[type];
  const [name, setName] = useState("");
  const [fieldValues, setFieldValues] = useState<
    Record<string, string | number | boolean>
  >(() => {
    const defaults: Record<string, string | number | boolean> = {};
    meta.fields.forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.name] = f.defaultValue;
    });
    return defaults;
  });
  const [customFields, setCustomFields] = useState<
    Array<{ key: string; value: string }>
  >([{ key: "", value: "" }]);
  const [useConnectionString, setUseConnectionString] = useState(true);
  const [connectionString, setConnectionString] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let data: Record<string, unknown>;
    if (type === "custom") {
      data = {};
      customFields.forEach((f) => {
        if (f.key.trim()) data[f.key.trim()] = f.value;
      });
    } else if (type === "postgres" && useConnectionString) {
      data = { connectionString };
    } else {
      data = { ...fieldValues };
    }

    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || meta.label,
          type,
          data,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save credential");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* Dim the apps list behind */}
      <div
        className="absolute inset-0 bg-black/20 rounded-2xl"
        onClick={onClose}
      />

      {/* Overlay card */}
      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-[420px] max-h-[80%] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getCredentialTypeColor(type)}`}
          >
            <CredentialTypeIcon type={type} className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">
              {meta.label}
            </h3>
            <p className="text-xs text-gray-500">{meta.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          {/* Name (optional, collapsed) */}
          <div>
            <label className="text-xs font-medium text-gray-600">
              Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={meta.label}
              className="mt-1 w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {/* Postgres: connection string toggle */}
          {type === "postgres" && (
            <>
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
              {useConnectionString && (
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Connection String
                    <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <input
                    type="password"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="postgresql://user:password@host:5432/db"
                    required
                    className="mt-1 w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
                  />
                </div>
              )}
            </>
          )}

          {/* Type-specific fields */}
          {type !== "custom" &&
            !(type === "postgres" && useConnectionString) &&
            meta.fields.map((field) => (
              <div key={field.name}>
                <label className="text-xs font-medium text-gray-600">
                  {field.label}
                  {field.required && (
                    <span className="text-gray-400 ml-1.5 font-normal">
                      Required
                    </span>
                  )}
                </label>

                {field.type === "boolean" ? (
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(fieldValues[field.name])}
                      onChange={(e) =>
                        setFieldValues((p) => ({
                          ...p,
                          [field.name]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ) : field.type === "select" && field.options ? (
                  <select
                    value={String(
                      fieldValues[field.name] ?? field.defaultValue ?? "",
                    )}
                    onChange={(e) =>
                      setFieldValues((p) => ({
                        ...p,
                        [field.name]: e.target.value,
                      }))
                    }
                    required={field.required}
                    className="mt-1 w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="relative mt-1">
                    <input
                      type={
                        field.type === "password" && !showPasswords[field.name]
                          ? "password"
                          : field.type === "number"
                            ? "number"
                            : "text"
                      }
                      value={
                        typeof fieldValues[field.name] === "boolean"
                          ? ""
                          : String(fieldValues[field.name] ?? "")
                      }
                      onChange={(e) =>
                        setFieldValues((p) => ({
                          ...p,
                          [field.name]:
                            field.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent pr-16"
                    />
                    {field.type === "password" && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.name)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords[field.name] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = fieldValues[field.name];
                            if (val) navigator.clipboard.writeText(String(val));
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {field.type === "password" && field.placeholder && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Example: {field.placeholder}
                  </p>
                )}
              </div>
            ))}

          {/* Custom fields */}
          {type === "custom" && (
            <div className="space-y-2">
              {customFields.map((cf, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={cf.key}
                    onChange={(e) => {
                      const updated = [...customFields];
                      updated[i] = { ...cf, key: e.target.value };
                      setCustomFields(updated);
                    }}
                    placeholder="Key"
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <input
                    type="password"
                    value={cf.value}
                    onChange={(e) => {
                      const updated = [...customFields];
                      updated[i] = { ...cf, value: e.target.value };
                      setCustomFields(updated);
                    }}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  {customFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomFields((p) => p.filter((_, j) => j !== i))
                      }
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCustomFields((p) => [...p, { key: "", value: "" }])
                }
                className="text-xs text-accent hover:text-accent-hover font-medium"
              >
                + Add field
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-xs">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
