import { useState, useRef, useEffect } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import {
  Send,
  Sparkles,
  MessageSquare,
  X,
  Loader2,
  ChevronDown,
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
  const [isExpanded, setIsExpanded] = useState(true);

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
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-purple-500 
                   text-white rounded-full shadow-lg hover:shadow-xl transition-all
                   hover:scale-105 active:scale-95 z-50"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div
      className={`
        flex flex-col bg-white border-l border-gray-200 transition-all duration-300
        ${isExpanded ? "w-96" : "w-80"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              AI Assistant
            </h3>
            <p className="text-xs text-gray-500">Describe your workflow</p>
          </div>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {(!thread?.messages || thread.messages.length === 0) && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-blue-500" />
                <span className="font-medium text-gray-700 text-sm">
                  Welcome to VibeFlow!
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Describe the workflow you want to create in natural language,
                and I'll build it for you.
              </p>
            </div>

            {/* Suggested prompts */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 px-1">
                Try these examples:
              </p>
              <div className="space-y-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg
                               hover:border-blue-300 hover:bg-blue-50 transition-all
                               text-sm text-gray-700 group"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                    <ChevronDown
                      size={14}
                      className="inline ml-1 -rotate-90 text-gray-400 group-hover:text-blue-500 transition-colors"
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
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === "user"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
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
                    <p key={i} className="text-sm whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ))
              ) : message.content ? (
                <p className="text-sm whitespace-pre-wrap">
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
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
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
          <p className="text-xs text-gray-500">
            Current workflow:{" "}
            <span className="font-medium text-gray-700">{workflow.name}</span>
            <span className="mx-1">•</span>
            {workflow.nodes.length} nodes
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow..."
            rows={2}
            disabled={isPending}
            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl
                       resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                       focus:border-blue-500 placeholder:text-gray-400 text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!value.trim() || isPending}
            className="absolute right-2 bottom-2 p-2 bg-blue-500 text-white rounded-lg
                       hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
