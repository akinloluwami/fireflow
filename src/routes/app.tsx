import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { UserMenu } from "@/components/UserMenu";
import { authClient } from "@/lib/auth-client";
import { Workflow, Key, Plug } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

const navItems = [
  { to: "/app/workflows", label: "Workflows", icon: Workflow },
  { to: "/app/credentials", label: "Credentials", icon: Key },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
];

function RouteComponent() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <img src="/logo.png" alt="FireFlow Logo" className="w-5" />
                <span className="text-lg font-bold text-gray-900 group-hover:text-accent transition-colors">
                  FireFlow
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors [&.active]:text-accent [&.active]:bg-accent/10"
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {isAuthPending ? (
                <div className="bg-accent/50 animate-pulse rounded-full w-8 h-8" />
              ) : (
                <UserMenu user={session?.user!} />
              )}
            </div>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
