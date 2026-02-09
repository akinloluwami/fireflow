import { Sparkles, GitBranch, Send, Webhook } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-10">
        <div className="rounded-[40px] overflow-hidden flex flex-col md:flex-row md:min-h-[80vh]">
          <div className="w-full md:w-1/2 bg-[#E8F4FC] p-10 md:p-14 flex flex-col justify-center relative">
            <h3 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 leading-tight">
              Natural language
              <br />
              workflow building
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-sm">
              Just describe what you want. AI builds it for you automatically.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors w-fit">
              Start for free
            </button>
          </div>

          <div className="w-full md:w-1/2 bg-[#4A90D9] p-8 pb-12 flex items-center justify-center relative rounded-b-[40px] md:rounded-b-none">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs transform rotate-1">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-semibold text-gray-800 text-sm">
                  AI Assistant
                </span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                "When a form is submitted, check the priority and send a Slack
                notification..."
              </p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-accent/20 rounded-full">
                  <div className="h-full w-3/4 bg-accent rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[40px] overflow-hidden flex flex-col md:flex-row-reverse md:min-h-[80vh]">
          <div className="w-full md:w-1/2 bg-[#F3EAFC] p-10 md:p-14 flex flex-col justify-center relative">
            <h3 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 leading-tight">
              Visual workflow
              <br />
              builder
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-sm">
              Drag, drop, and connect nodes. See your entire workflow at a
              glance.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors w-fit">
              Start for free
            </button>
          </div>

          <div className="w-full md:w-1/2 bg-[#9B6DD7] p-8 pb-12 flex items-center justify-center relative rounded-b-[40px] md:rounded-b-none">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs transform -rotate-1">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                    <Webhook className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center gap-3 ml-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center gap-3 ml-12">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <Send className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[40px] overflow-hidden flex flex-col md:flex-row md:min-h-[80vh]">
          <div className="w-full md:w-1/2 bg-[#FEF0EC] p-10 md:p-14 flex flex-col justify-center relative">
            <h3 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 leading-tight">
              Smart conditions
              <br />& branching
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-sm">
              If/else, switches, loops. Handle any scenario with powerful logic.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors w-fit">
              Start for free
            </button>
          </div>

          <div className="w-full md:w-1/2 bg-[#F97066] p-8 pb-12 flex items-center justify-center relative rounded-b-[40px] md:rounded-b-none">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs transform rotate-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                If / Else
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    Priority is high → Notify team
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    Else → Add to queue
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[40px] overflow-hidden flex flex-col md:flex-row-reverse md:min-h-[80vh]">
          <div className="w-full md:w-1/2 bg-[#E6F7F5] p-10 md:p-14 flex flex-col justify-center relative">
            <h3 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 leading-tight">
              Notifications
              <br />
              everywhere
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-sm">
              Slack, Discord, email, and more. Keep your team always in the
              loop.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors w-fit">
              Start for free
            </button>
          </div>

          <div className="w-full md:w-1/2 bg-[#2DD4BF] p-8 pb-12 flex items-center justify-center relative rounded-b-[40px] md:rounded-b-none">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs transform -rotate-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Send to
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    #team-alerts
                  </span>
                  <span className="ml-auto text-xs text-emerald-600 font-medium">
                    Sent
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">D</span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    #general
                  </span>
                  <span className="ml-auto text-xs text-emerald-600 font-medium">
                    Sent
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
