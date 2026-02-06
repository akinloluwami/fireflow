import { useEffect, useRef } from "react";
import { useTamboThread } from "@tambo-ai/react";
import { useWorkflowStore } from "@/lib/workflow/store";

/**
 * This component syncs the Tambo chat thread with the workflow.
 * - When the workflow has a chatThreadId, it switches to that thread
 * - When a new thread is created, it saves the thread ID to the workflow
 */
export function ChatThreadSync() {
  const { thread, switchCurrentThread } = useTamboThread();
  const { workflow, setChatThreadId } = useWorkflowStore();
  const switchAttemptedRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // When workflow loads with a chatThreadId, switch to it
  useEffect(() => {
    const threadIdToSwitch = workflow.chatThreadId;

    if (!workflow.id || !threadIdToSwitch) {
      return;
    }

    // Only attempt once per thread ID
    if (switchAttemptedRef.current === threadIdToSwitch) {
      return;
    }
    switchAttemptedRef.current = threadIdToSwitch;

    // Perform the switch after a delay for TamboProvider to fully initialize components
    const doSwitch = async () => {
      // Wait longer for TamboProvider to register all components
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!isMountedRef.current) return;

      try {
        await switchCurrentThread(threadIdToSwitch);
      } catch (err) {
        // Component not found errors are expected on first load, retry once
        if (err instanceof Error && err.message.includes("not found")) {
          // Wait a bit more and retry
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!isMountedRef.current) return;
          
          try {
            await switchCurrentThread(threadIdToSwitch);
          } catch (retryErr) {
            console.error("[ChatThreadSync] Thread switch retry failed:", retryErr);
            switchAttemptedRef.current = null;
          }
        } else {
          console.error("[ChatThreadSync] Thread switch failed:", err);
          switchAttemptedRef.current = null;
        }
      }
    };

    doSwitch();
  }, [workflow.id, workflow.chatThreadId, switchCurrentThread]);

  // When thread changes and we don't have a chatThreadId saved, save it
  useEffect(() => {
    if (!thread?.id || !workflow.id) return;

    // Skip placeholder or invalid thread IDs
    if (thread.id === "placeholder" || thread.id.length < 10) return;

    // If this is a new thread (workflow doesn't have one yet), save it
    if (!workflow.chatThreadId && thread.id) {
      setChatThreadId(thread.id);
    }
  }, [thread?.id, workflow.id, workflow.chatThreadId, setChatThreadId]);

  return null;
}
