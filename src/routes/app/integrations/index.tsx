import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Loader2,
  ExternalLink,
  Unplug,
  X,
  AlertTriangle,
} from "lucide-react";
import { SiDiscord, SiSlack } from "react-icons/si";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/app/integrations/")({
  head: () => ({
    meta: [{ title: "Integrations | FireFlow" }],
  }),
  component: IntegrationsPage,
});

interface IntegrationStatus {
  provider: string;
  connected: boolean;
  metadata?: {
    workspace?: string;
    installedAt?: string;
  };
}

interface DisconnectConfirmState {
  isOpen: boolean;
  name: string;
  disconnectUrl: string;
}

const integrationsMeta = [
  {
    id: "discord",
    name: "Discord",
    description: "Send messages to Discord channels",
    icon: SiDiscord,
    iconColor: "#5865F2",
    connectUrl: "/api/integrations/discord/connect",
    disconnectUrl: "/api/integrations/discord/disconnect",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages to Slack channels",
    icon: SiSlack,
    iconColor: "#4A154B",
    connectUrl: "/api/integrations/slack/connect",
    disconnectUrl: "/api/integrations/slack/disconnect",
  },
];

function IntegrationsPage() {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] =
    useState<DisconnectConfirmState>({
      isOpen: false,
      name: "",
      disconnectUrl: "",
    });

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to fetch integration statuses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleConnect = (connectUrl: string) => {
    // Redirect to OAuth flow
    window.location.href = connectUrl;
  };

  const openDisconnectConfirm = (name: string, disconnectUrl: string) => {
    setDisconnectConfirm({ isOpen: true, name, disconnectUrl });
  };

  const closeDisconnectConfirm = () => {
    setDisconnectConfirm({ isOpen: false, name: "", disconnectUrl: "" });
  };

  const handleDisconnect = async () => {
    const { name, disconnectUrl } = disconnectConfirm;
    closeDisconnectConfirm();

    setDisconnectingId(name);
    try {
      const res = await fetch(disconnectUrl, { method: "POST" });
      if (res.ok) {
        // Refresh statuses
        await fetchStatuses();
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setDisconnectingId(null);
    }
  };

  const getStatus = (provider: string) => {
    return statuses.find((s) => s.provider === provider);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
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
              Integrations
            </h1>
            <p className="text-gray-500">
              Connect your accounts to use in workflows
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid gap-5">
            {integrationsMeta.map((integration) => {
              const status = getStatus(integration.id);
              const isConnected = status?.connected ?? false;
              const isDisconnecting = disconnectingId === integration.id;

              return (
                <div
                  key={integration.id}
                  className="bg-gray-100 rounded-2xl p-6 flex items-center justify-between hover:bg-gray-200/70 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                      <integration.icon
                        className="w-6 h-6"
                        style={{ color: integration.iconColor }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {integration.description}
                      </p>
                      {isConnected && status?.metadata && (
                        <div className="flex items-center gap-2 mt-1">
                          {status.metadata.workspace && (
                            <span className="text-xs text-gray-400">
                              {status.metadata.workspace}
                            </span>
                          )}
                          {status.metadata.installedAt && (
                            <span className="text-xs text-gray-400">
                              • Connected{" "}
                              {formatDate(status.metadata.installedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl ring-1 ring-emerald-200">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-semibold">Connected</span>
                      </div>
                      <button
                        onClick={() =>
                          openDisconnectConfirm(
                            integration.name,
                            integration.disconnectUrl,
                          )
                        }
                        disabled={isDisconnecting}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Disconnect"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Unplug className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.connectUrl)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
                    >
                      Connect
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Disconnect Confirmation Modal */}
      {disconnectConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDisconnectConfirm}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <button
              onClick={closeDisconnectConfirm}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Disconnect {disconnectConfirm.name}?
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Workflows using this integration will no longer be able to send
              messages to {disconnectConfirm.name}. You can reconnect at any
              time.
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeDisconnectConfirm}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
