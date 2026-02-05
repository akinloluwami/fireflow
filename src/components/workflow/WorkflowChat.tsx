import { useRef, useEffect } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import {
  Send,
  Sparkles,
  MessageSquare,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";

const SUGGESTED_PROMPTS = [
  "When I receive a webhook, send a Slack message",
  "Every day at 9am, fetch data from an API and email me the results",
  "When a form is submitted, if the amount is greater than 100, notify the team",
  "Process each item: validate, transform, and save to database",
];

export function WorkflowChat() {
  const { isChatOpen, setIsChatOpen, workflow } = useWorkflowStore();
  const { thread } = useTamboThread();
  const { value, setValue, submit, isPending } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      inputRef.current?.focus();
    }
  }, [isChatOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isPending) return;
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setValue(prompt);
    inputRef.current?.focus();
  };

  if (!isChatOpen) {
    // Floating button when closed
    return (
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 p-3.5 bg-[var(--color-accent)] text-white rounded-full 
                   shadow-lg hover:bg-[var(--color-accent-hover)] transition-colors z-50"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className="flex flex-col w-80 bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">AI Assistant</h3>
            <p className="text-xs text-gray-400">Describe your workflow</p>
          </div>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {(!thread?.messages || thread.messages.length === 0) && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageSquare
                  size={14}
                  className="text-[var(--color-accent)]"
                />
                <span className="font-medium text-gray-800 text-sm">
                  Welcome to FireFlow!
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Describe the workflow you want to create in natural language,
                and I'll build it for you.
              </p>
            </div>

            {/* Suggested prompts */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Try these examples:</p>
              <div className="space-y-1.5">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="w-full text-left p-2.5 bg-white border border-gray-100 rounded-lg
                               hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-light)] transition-colors
                               text-xs text-gray-600 group flex items-center justify-between"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                    <ArrowRight
                      size={12}
                      className="text-gray-300 group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0 ml-2"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages list */}
        {thread?.messages?.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 ${
                message.role === "user"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {/* Text content */}
              {message.content && Array.isArray(message.content) ? (
                message.content
                  .filter(
                    (part): part is { type: "text"; text: string } =>
                      part?.type === "text" && typeof part?.text === "string",
                  )
                  .map((part, i) => (
                    <p key={i} className="text-xs whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ))
              ) : message.content ? (
                <p className="text-xs whitespace-pre-wrap">
                  {String(message.content)}
                </p>
              ) : null}

              {/* Rendered component */}
              {message.renderedComponent && (
                <div className="mt-2">{message.renderedComponent}</div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <Loader2
                  size={14}
                  className="animate-spin text-[var(--color-accent)]"
                />
                <span className="text-xs text-gray-500">
                  Creating your workflow...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Workflow context indicator */}
      {workflow.nodes.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            <span className="text-gray-500">{workflow.name}</span>
            <span className="mx-1.5">•</span>
            {workflow.nodes.length} nodes
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow..."
            rows={2}
            disabled={isPending}
            className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-lg
                       resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30 
                       focus:border-[var(--color-accent)] placeholder:text-gray-400 text-xs
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="submit"
            disabled={!value.trim() || isPending}
            className="absolute right-2 bottom-2 p-1.5 bg-[var(--color-accent)] text-white rounded-md
                       hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400 text-center">
          Enter to send • Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
