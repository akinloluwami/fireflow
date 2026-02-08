import { useEffect } from "react";
import { useTamboThread } from "@tambo-ai/react";
import { useWorkflowStore } from "@/lib/workflow/store";

/**
 * ChatThreadSync - Syncs the Tambo thread ID to the workflow store
 * This component only handles SAVING the thread ID when a new thread is created.
 * Thread SWITCHING is handled by WorkflowChat when it mounts.
 */
export function ChatThreadSync() {
  const { thread } = useTamboThread();
  const { workflow, setChatThreadId } = useWorkflowStore();

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
