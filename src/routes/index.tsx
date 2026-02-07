import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { DemoWorkflowCanvas } from "@/components/DemoWorkflowCanvas";
import { FeaturesSection } from "@/components/FeaturesSection";
import { IntegrationsSection } from "@/components/IntegrationsSection";
import { CTASection } from "@/components/CTASection";
import { UserMenu } from "@/components/UserMenu";
import { SiGithub } from "react-icons/si";

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

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 backdrop-blur bg-white/75 border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              FireFlow
            </span>
          </div>

          {isPending ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/app/workflows"
                className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-2xl hover:bg-accent-hover transition-colors"
              >
                Open App
              </Link>
              <UserMenu user={session.user} />
            </div>
          ) : (
            <button
              onClick={handleGitHubSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSigningIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SiGithub className="w-4 h-4" />
              )}
              Sign up
            </button>
          )}
        </div>
      </nav>

      <div className="pt-32 pb-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-[4rem] font-semibold text-gray-700 leading-[1.05] tracking-tight mb-6">
            The{" "}
            <span className="bg-linear-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              workflow automation
            </span>
            <br />
            she told you not to worry about.
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-6 max-w-2xl mx-auto font-medium">
            AI-powered workflows, visual builder, conditions, and integrations.
          </p>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mb-8 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              Open Source
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI-Powered
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              No-Code Friendly
            </span>
          </div>

          {session?.user ? (
            <Link
              to="/app/workflows"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white text-lg font-semibold rounded-3xl hover:bg-accent-hover transition-colors"
            >
              Go to Workflows
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button
              onClick={handleGitHubSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white text-lg font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SiGithub className="w-5 h-5" />
              )}
              Start for free
            </button>
          )}
        </div>
      </div>

      <DemoWorkflowCanvas />

      <FeaturesSection />

      <IntegrationsSection />

      <CTASection
        isLoggedIn={!!session?.user}
        isSigningIn={isSigningIn}
        onSignIn={handleGitHubSignIn}
      />

      <footer className="py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">FireFlow</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
