import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

/**
 * Resolves which conversation the UI is working with.
 *
 * The default is the most recently active one, but a selection overrides it —
 * and the selection is validated against the live list every render, so
 * deleting the conversation you were reading falls back rather than leaving
 * the screen pointed at a document that no longer exists.
 */
export function useConversation(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const canLoad = enabled && isAuthenticated;

  const conversations = useQuery(
    api.conversations.listConversations,
    canLoad ? {} : "skip",
  );

  const createConversation = useMutation(api.conversations.createConversation);

  const [selectedId, setSelectedId] = useState<Id<"conversations">>();
  const [error, setError] = useState<string>();

  // Guards against a second create while the first is still in flight — the
  // query re-runs on every reactivity tick, and this effect with it.
  const isCreating = useRef(false);

  const conversationId = useMemo(() => {
    if (conversations === undefined) {
      return undefined;
    }

    if (
      selectedId &&
      conversations.some((conversation) => conversation._id === selectedId)
    ) {
      return selectedId;
    }

    return conversations[0]?._id;
  }, [conversations, selectedId]);

  useEffect(() => {
    if (!canLoad || conversations === undefined) return;

    if (conversations.length > 0) {
      isCreating.current = false;
      return;
    }

    if (isCreating.current) return;
    isCreating.current = true;

    createConversation({})
      .then((id) => {
        setError(undefined);
        setSelectedId(id);
      })
      .catch((err) => {
        console.error("Failed to create a conversation:", err);
        isCreating.current = false;
        setError("Couldn't start a conversation. Reopen the app to try again.");
      });
  }, [canLoad, conversations, createConversation]);

  const startNewConversation = useCallback(async () => {
    try {
      const id = await createConversation({});
      setError(undefined);
      setSelectedId(id);
    } catch (err) {
      console.error("Failed to start a new conversation:", err);
      setError("Couldn't start a new conversation. Please try again.");
    }
  }, [createConversation]);

  const selectConversation = useCallback((id: Id<"conversations">) => {
    setSelectedId(id);
  }, []);

  return {
    conversationId,
    conversations: (conversations ?? []) as Doc<"conversations">[],
    isReady: !!conversationId,
    error,
    startNewConversation,
    selectConversation,
  };
}
