import { Link } from "@tanstack/react-router";
import { ArrowRight, Github, Loader2, Zap, Sparkles } from "lucide-react";

interface CTASectionProps {
  isLoggedIn: boolean;
  isSigningIn: boolean;
  onSignIn: () => void;
}

export function CTASection({
  isLoggedIn,
  isSigningIn,
  onSignIn,
}: CTASectionProps) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-[40px] overflow-hidden flex flex-col md:flex-row min-h-[50vh]">
          <div className="w-full md:w-1/2 bg-[#FFF5F0] p-10 md:p-14 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-gray-800">FireFlow</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 leading-tight">
              Ready to automate
              <br />
              your workflows?
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-sm">
              Start building your first workflow in seconds. No credit card
              required.
            </p>

            {isLoggedIn ? (
              <Link
                to="/app/workflows"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-white font-semibold rounded-3xl hover:bg-accent-hover transition-colors w-fit"
              >
                Go to Workflows
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 w-fit"
              >
                {isSigningIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Github className="w-5 h-5" />
                )}
                Start for free
              </button>
            )}
          </div>

          <div className="w-full md:w-1/2 bg-accent p-10 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
              <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-white rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-full" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-white" />
                <span className="text-white font-medium">
                  AI-powered workflow builder
                </span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3 ml-6">
                <Zap className="w-5 h-5 text-white" />
                <span className="text-white font-medium">
                  Visual drag & drop editor
                </span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                <ArrowRight className="w-5 h-5 text-white" />
                <span className="text-white font-medium">
                  Instant integrations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
