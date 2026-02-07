import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiDiscord, SiSlack } from "react-icons/si";

export const Route = createFileRoute("/app/integrations/")({
  component: IntegrationsPage,
});

const integrations = [
  {
    id: "discord",
    name: "Discord",
    description: "Send messages to Discord channels",
    icon: SiDiscord,
    iconColor: "#5865F2",
    connected: false,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages to Slack channels",
    icon: SiSlack,
    iconColor: "#4A154B",
    connected: false,
  },
];

function IntegrationsPage() {
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

        <div className="grid gap-5">
          {integrations.map((integration) => (
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
                </div>
              </div>
              {integration.connected ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl ring-1 ring-emerald-200">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-semibold">Connected</span>
                </div>
              ) : (
                <button className="px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all">
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
