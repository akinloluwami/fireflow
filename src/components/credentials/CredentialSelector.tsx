import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Plus, Loader2 } from "lucide-react";
import {
  CredentialTypeIcon,
  getCredentialTypeLabel,
  getCredentialTypeColor,
} from "./CredentialTypeIcon";
import type {
  CredentialType,
  CredentialListItem,
} from "@/lib/credentials/types";
import { CredentialForm } from "./CredentialForm";

interface CredentialSelectorProps {
  /** The credential type to filter by */
  type: CredentialType;
  /** Currently selected credential ID */
  value?: string;
  /** Callback when selection changes */
  onChange: (credentialId: string | undefined) => void;
  /** Label to display */
  label?: string;
  /** Placeholder when nothing selected */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional class names */
  className?: string;
}

export function CredentialSelector({
  type,
  value,
  onChange,
  label = "Credential",
  placeholder = "Select a credential...",
  required = false,
  className = "",
}: CredentialSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/credentials");
      if (!res.ok) throw new Error("Failed to fetch credentials");

      const data: CredentialListItem[] = await res.json();
      // Filter by type
      setCredentials(data.filter((c) => c.type === type));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load credentials",
      );
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  // Fetch credentials on mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCredential = credentials.find((c) => c.id === value);

  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : selectedCredential ? (
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg ${getCredentialTypeColor(type)}`}
              >
                <CredentialTypeIcon type={type} className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {selectedCredential.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">{placeholder}</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {error ? (
              <div className="px-4 py-3 text-sm text-red-600">{error}</div>
            ) : credentials.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-3">
                  No {getCredentialTypeLabel(type)} credentials found
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create one
                </button>
              </div>
            ) : (
              <>
                {/* Clear option */}
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(undefined);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    Clear selection
                  </button>
                )}

                {/* Credential options */}
                {credentials.map((credential) => (
                  <button
                    key={credential.id}
                    type="button"
                    onClick={() => {
                      onChange(credential.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                      value === credential.id ? "bg-accent/5" : ""
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg ${getCredentialTypeColor(type)}`}
                    >
                      <CredentialTypeIcon type={type} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {credential.name}
                      </div>
                      {credential.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {credential.description}
                        </div>
                      )}
                    </div>
                    {value === credential.id && (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </button>
                ))}

                {/* Create new button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsFormOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent hover:bg-accent/5 transition-colors border-t border-gray-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create new credential
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Credential Creation Modal */}
      <CredentialForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={async () => {
          // Refetch credentials and select the newest one
          const res = await fetch("/api/credentials");
          if (res.ok) {
            const data: CredentialListItem[] = await res.json();
            const filtered = data.filter((c) => c.type === type);
            setCredentials(filtered);
            // Auto-select the most recently created credential
            if (filtered.length > 0) {
              // Sort by createdAt descending and pick the first one
              const sorted = [...filtered].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );
              onChange(sorted[0].id);
            }
          }
          setIsFormOpen(false);
        }}
        editingCredential={null}
        defaultType={type}
      />
    </div>
  );
}
