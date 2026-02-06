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
  const hasInitialized = useRef(false);
  const lastWorkflowId = useRef<string | null>(null);

  // When workflow changes or loads, switch to the correct thread
  useEffect(() => {
    if (!workflow.id) return;

    // Only run when workflow ID changes
    if (lastWorkflowId.current === workflow.id && hasInitialized.current) {
      return;
    }
    lastWorkflowId.current = workflow.id;

    // If workflow has a chat thread ID, switch to it
    if (workflow.chatThreadId) {
      switchCurrentThread(workflow.chatThreadId);
      hasInitialized.current = true;
    } else {
      // No thread yet - will be set when first message is sent
      hasInitialized.current = true;
    }
  }, [workflow.id, workflow.chatThreadId, switchCurrentThread]);

  // When thread changes and we don't have a chatThreadId saved, save it
  useEffect(() => {
    if (!thread?.id || !workflow.id) return;

    // If this is a new thread (workflow doesn't have one yet), save it
    if (!workflow.chatThreadId && thread.id) {
      setChatThreadId(thread.id);
    }
  }, [thread?.id, workflow.id, workflow.chatThreadId, setChatThreadId]);

  return null;
}
