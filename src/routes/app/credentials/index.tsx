import { createFileRoute } from "@tanstack/react-router";
import { Key, Plus, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  CredentialForm,
  CredentialTypeIcon,
  getCredentialTypeLabel,
  getCredentialTypeColor,
} from "@/components/credentials";
import type { CredentialListItem } from "@/lib/credentials/types";

export const Route = createFileRoute("/app/credentials/")({
  component: CredentialsPage,
});

function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] =
    useState<CredentialListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
      setMenuOpenId(null);
    }
  };

  const handleEdit = (credential: CredentialListItem) => {
    setEditingCredential(credential);
    setIsFormOpen(true);
    setMenuOpenId(null);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCredential(null);
  };

  const handleFormSuccess = () => {
    fetchCredentials();
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Credentials
            </h1>
            <p className="text-gray-500">
              Manage database connections, API keys, and other secrets
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all"
          >
            <Plus className="w-4 h-4" />
            New Credential
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-linear-to-br from-accent/10 to-purple-100 flex items-center justify-center">
              <Key className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              No credentials yet
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create credentials to securely store database connections, API
              keys, and other secrets for use in your workflows.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all"
            >
              <Plus className="w-5 h-5" />
              Create your first credential
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {credentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                isDeleting={deletingId === credential.id}
                isMenuOpen={menuOpenId === credential.id}
                onMenuToggle={() =>
                  setMenuOpenId(
                    menuOpenId === credential.id ? null : credential.id,
                  )
                }
                onEdit={() => handleEdit(credential)}
                onDelete={() => handleDelete(credential.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>

      <CredentialForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingCredential={editingCredential}
      />
    </div>
  );
}

interface CredentialCardProps {
  credential: CredentialListItem;
  isDeleting: boolean;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (date: Date | string) => string;
}

function CredentialCard({
  credential,
  isDeleting,
  isMenuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
  formatDate,
}: CredentialCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (isMenuOpen) onMenuToggle();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, onMenuToggle]);

  return (
    <div className="flex items-center gap-4 p-5 bg-gray-100 rounded-2xl hover:bg-gray-150 transition-colors group">
      <div
        className={`p-3 rounded-xl ${getCredentialTypeColor(credential.type)}`}
      >
        <CredentialTypeIcon type={credential.type} className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {credential.name}
          </h3>
          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
            {getCredentialTypeLabel(credential.type)}
          </span>
        </div>
        {credential.description && (
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {credential.description}
          </p>
        )}
      </div>

      <div className="text-sm text-gray-400">
        Updated {formatDate(credential.updatedAt)}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={onMenuToggle}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          {isDeleting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MoreVertical className="w-5 h-5" />
          )}
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            <button
              onClick={onEdit}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
