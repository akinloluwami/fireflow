import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import {
  Zap,
  MessageSquare,
  GitBranch,
  Workflow,
  ArrowRight,
  Github,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const { data: session, isPending } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGitHubSignIn = async () => {
    setIsSigningIn(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/workflows",
    });
  };

  const features = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Natural Language",
      description: "Describe your workflow in plain English.",
    },
    {
      icon: <Workflow className="w-5 h-5" />,
      title: "Visual Builder",
      description: "Drag, drop, and connect nodes visually.",
    },
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: "Smart Conditions",
      description: "Branch workflows based on your data.",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Notifications",
      description: "Send to Slack, Discord, and more.",
    },
  ];

  const integrations = [
    { name: "Tally", description: "Form submissions" },
    { name: "Slack", description: "Team notifications" },
    { name: "Discord", description: "Server messages" },
    { name: "Webhooks", description: "HTTP requests" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">
              FireFlow
            </span>
          </div>

          {isPending ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/workflows"
                className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                Open App
              </Link>
              <img
                src={session.user.image || ""}
                alt={session.user.name || "User"}
                className="w-8 h-8 rounded-full"
              />
            </div>
          ) : (
            <button
              onClick={handleGitHubSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSigningIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Github className="w-4 h-4" />
              )}
              Sign up
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-light border border-orange-100 rounded-full text-accent text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Automation
          </div>

          <h1 className="text-4xl md:text-6xl font-semibold text-gray-900 mb-5 leading-tight tracking-tight">
            Turn ideas into
            <br />
            <span className="text-accent">
              automated workflows
            </span>
          </h1>

          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Describe what you want to automate in plain English. FireFlow builds
            and runs the workflow for you.
          </p>

          <div className="flex items-center justify-center gap-3">
            {session?.user ? (
              <Link
                to="/workflows"
                className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                Go to Workflows
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={handleGitHubSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                Get started with GitHub
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-600 mb-3">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-3">
            Connect your tools
          </h2>
          <p className="text-gray-500 text-center mb-10">
            Trigger workflows from forms and send notifications anywhere.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {integrations.map((integration, i) => (
              <div
                key={i}
                className="p-4 bg-white border border-gray-200 rounded-xl text-center"
              >
                <div className="flex items-center justify-center gap-1.5 text-gray-900 font-medium text-sm mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  {integration.name}
                </div>
                <p className="text-gray-400 text-xs">
                  {integration.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Ready to automate?
          </h2>
          <p className="text-gray-500 mb-6">
            Start building your first workflow in seconds.
          </p>

          {!session?.user && (
            <button
              onClick={handleGitHubSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isSigningIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Github className="w-4 h-4" />
              )}
              Sign in with GitHub
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-gray-600">FireFlow</span>
          </div>
          <p>Built with TanStack Start</p>
        </div>
      </footer>
    </div>
  );
}
