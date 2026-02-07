import { SiSlack, SiDiscord } from "react-icons/si";
import { Webhook, FileText } from "lucide-react";

const integrations = [
  {
    name: "Tally",
    description:
      "Collect form responses and trigger automated workflows instantly.",
    icon: <FileText className="w-6 h-6" />,
    color: "#1E1E1E",
    bgColor: "#F5F5F5",
  },
  {
    name: "Slack",
    description:
      "Send notifications and updates directly to your team channels.",
    icon: <SiSlack className="w-6 h-6" />,
    color: "#4A154B",
    bgColor: "#F9F0FA",
  },
  {
    name: "Discord",
    description:
      "Post messages to servers and keep your community in the loop.",
    icon: <SiDiscord className="w-6 h-6" />,
    color: "#5865F2",
    bgColor: "#EEF0FF",
  },
  {
    name: "Webhooks",
    description: "Connect to any service with custom HTTP requests and APIs.",
    icon: <Webhook className="w-6 h-6" />,
    color: "#10B981",
    bgColor: "#ECFDF5",
  },
];

export function IntegrationsSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">
            Integrations
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-700 mb-4">
            Connect your favorite tools
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Trigger workflows from forms, send notifications anywhere, and
            connect to any API.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="group relative rounded-3xl p-8 transition-all duration-300 hover:shadow-lg"
              style={{ backgroundColor: integration.bgColor }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${integration.color}15` }}
              >
                <div style={{ color: integration.color }}>
                  {integration.icon}
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {integration.name}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {integration.description}
              </p>

              <div
                className="absolute top-8 right-8 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: integration.color }}
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-10">
          More integrations coming soon — Email, Notion, Airtable, and more.
        </p>
      </div>
    </section>
  );
}
