import { useRef, useEffect, useState, useCallback } from "react";
import { useTamboThread, useTamboThreadInput, useTamboVoice } from "@tambo-ai/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Sparkles,
  MessageSquare,
  X,
  Loader2,
  ArrowRight,
  Mic,
  MicOff,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import ReactMarkdown from "react-markdown";

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
  const {
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
    transcript,
  } = useTamboVoice();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [chatWidth, setChatWidth] = useState(320);
  const isResizingRef = useRef(false);

  // Update input when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setValue(transcript);
      inputRef.current?.focus();
    }
  }, [transcript, setValue]);

  // Handle resize drag
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;
      const startX = e.clientX;
      const startWidth = chatWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = startX - e.clientX;
        const newWidth = Math.min(Math.max(startWidth + delta, 280), 600);
        setChatWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [chatWidth],
  );

  // Reset timeout when workflow changes
  useEffect(() => {
    setHasTimedOut(false);
  }, [workflow.id]);

  // Timeout loading state after 3 seconds
  useEffect(() => {
    if (!workflow.chatThreadId) return;

    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, 3000);

    // Clear timeout if messages load
    if (thread?.messages && thread.messages.length > 0) {
      clearTimeout(timer);
      setHasTimedOut(false);
    }

    return () => clearTimeout(timer);
  }, [workflow.chatThreadId, thread?.messages]);

  // Determine if we're loading a thread (has chatThreadId but thread not loaded yet)
  const threadNotReady = !thread?.id || thread.id === "placeholder";
  const threadSwitchingOrLoading =
    thread?.id === workflow.chatThreadId &&
    (!thread.messages || thread.messages.length === 0);

  const isLoadingThread =
    !hasTimedOut &&
    !!workflow.chatThreadId &&
    (threadNotReady || threadSwitchingOrLoading);

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
    // Reset textarea height after submit
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
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
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 p-3.5 bg-accent text-white rounded-full 
                   shadow-lg hover:bg-accent-hover transition-colors z-50"
      >
        <Sparkles size={20} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: chatWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col bg-white border-l border-gray-200 overflow-hidden relative group"
      style={{ width: chatWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-accent/30 transition-colors z-10"
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">AI Assistant</h3>
            <p className="text-xs text-gray-400">Describe your workflow</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsChatOpen(false)}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <X size={14} className="text-gray-400" />
        </motion.button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading skeleton when fetching existing thread */}
        {isLoadingThread && (
          <div className="space-y-4 animate-pulse">
            {/* Skeleton for user message */}
            <div className="flex justify-end">
              <div className="w-3/4 h-10 bg-gray-200 rounded-xl" />
            </div>
            {/* Skeleton for assistant message */}
            <div className="flex justify-start">
              <div className="w-4/5 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
              </div>
            </div>
            {/* Loading indicator */}
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs py-2">
              <Loader2 size={12} className="animate-spin" />
              <span>Loading conversation...</span>
            </div>
          </div>
        )}

        {/* Welcome message - only show when no chatThreadId and no messages */}
        {!isLoadingThread &&
          (!thread?.messages || thread.messages.length === 0) && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare size={14} className="text-accent" />
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
                <p className="text-xs text-gray-400 mb-2">
                  Try these examples:
                </p>
                <div className="space-y-1.5">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="w-full text-left p-2.5 bg-white border border-gray-100 rounded-lg
                               hover:border-accent/30 hover:bg-accent-light transition-colors
                               text-xs text-gray-600 group flex items-center justify-between"
                    >
                      <span className="line-clamp-2">{prompt}</span>
                      <ArrowRight
                        size={12}
                        className="text-gray-300 group-hover:text-accent transition-colors flex-shrink-0 ml-2"
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
                  ? "bg-accent text-white"
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
                    <div
                      key={i}
                      className="text-xs prose prose-sm prose-gray max-w-none"
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 mb-2 space-y-1">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 mb-2 space-y-1">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          ),
                          code: ({ children }) => (
                            <code className="px-1 py-0.5 bg-gray-200 rounded text-[11px] font-mono">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-800 text-gray-100 p-2 rounded text-[11px] overflow-x-auto my-2">
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {part.text}
                      </ReactMarkdown>
                    </div>
                  ))
              ) : message.content ? (
                <div className="text-xs prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2 space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2 space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="px-1 py-0.5 bg-gray-200 rounded text-[11px] font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-800 text-gray-100 p-2 rounded text-[11px] overflow-x-auto my-2">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {String(message.content)}
                  </ReactMarkdown>
                </div>
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
                <Loader2 size={14} className="animate-spin text-accent" />
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
            onChange={(e) => {
              setValue(e.target.value);
              // Auto-resize textarea
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Describe your workflow..."}
            rows={1}
            disabled={isPending || isRecording || isTranscribing}
            className="w-full px-3 py-2.5 pr-20 bg-gray-50 border border-gray-200 rounded-lg
                       resize-none focus:outline-none focus:ring-1 focus:ring-accent/30 
                       focus:border-accent placeholder:text-gray-400 text-xs
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       min-h-[40px] max-h-[200px] overflow-y-auto"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isPending || isTranscribing}
              className={`p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         ${isRecording 
                           ? "bg-red-500 text-white animate-pulse" 
                           : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
            >
              {isTranscribing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={14} />
              ) : (
                <Mic size={14} />
              )}
            </button>
            <button
              type="submit"
              disabled={!value.trim() || isPending || isRecording || isTranscribing}
              className="p-1.5 bg-accent text-white rounded-md
                         hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400 text-center">
          Enter to send • Shift+Enter for new line
        </p>
      </form>
    </motion.div>
  );
}
