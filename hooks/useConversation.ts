import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Resolves the single conversation the UI works with: the most recent one, or a
 * freshly created one. There is no conversation switcher yet.
 */
export function useConversation(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const canLoad = enabled && isAuthenticated;

  const conversations = useQuery(
    api.conversations.listConversations,
    canLoad ? {} : "skip",
  );

  const createConversation = useMutation(api.conversations.createConversation);

  const [conversationId, setConversationId] = useState<Id<"conversations">>();
  const [error, setError] = useState<string>();

  // Guards against a second create while the first is still in flight — the
  // query re-runs on every reactivity tick, and this effect with it.
  const isCreating = useRef(false);

  useEffect(() => {
    if (!canLoad || conversations === undefined) return;

    if (conversations.length > 0) {
      isCreating.current = false;
      setConversationId(conversations[0]._id);
      return;
    }

    if (isCreating.current) return;
    isCreating.current = true;

    createConversation({})
      .then((id) => {
        setError(undefined);
        setConversationId(id);
      })
      .catch((err) => {
        console.error("Failed to create a conversation:", err);
        isCreating.current = false;
        setError("Couldn't start a conversation. Reopen the app to try again.");
      });
  }, [canLoad, conversations, createConversation]);

  return {
    conversationId,
    isReady: !!conversationId,
    error,
  };
}
