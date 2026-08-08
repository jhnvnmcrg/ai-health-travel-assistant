import { useState } from "react";
import { ConvexError } from "convex/values";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConversation } from "@/hooks/useConversation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const GENERIC_SEND_ERROR = "Your message couldn't be sent. Please try again.";

/**
 * Server-side `ConvexError`s carry a message meant for the person typing (rate
 * limit, length). Anything else is redacted in production and is not something
 * a user could act on, so it gets the generic line.
 */
function readSendError(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }

  return GENERIC_SEND_ERROR;
}

export function useChat() {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string>();

  const { convexUser, isLoading } = useCurrentUser();
  const {
    conversationId,
    conversations,
    isReady,
    error: conversationError,
    startNewConversation,
    selectConversation,
  } = useConversation(!!convexUser);

  const createMessage = useMutation(api.messages.createMessage);

  // MessageList subscribes to this same query, so watching it here is free —
  // and it is the only honest source for "the assistant is still writing",
  // now that the client no longer waits on the action that writes it.
  const messages = useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip",
  );

  const isResponding = messages?.[messages.length - 1]?.status === "streaming";

  const sendMessage = async () => {
    const text = message.trim();

    if (!text) return;
    if (!conversationId) return;
    if (isSending) return;

    setSendError(undefined);
    setIsSending(true);

    try {
      // The reply is scheduled server-side and arrives over the query
      // subscription, so this resolves as soon as the message is stored.
      await createMessage({ conversationId, text });

      // Only clear once the message is actually stored, so a failed send does
      // not lose what the user typed.
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setSendError(readSendError(error));
    } finally {
      setIsSending(false);
    }
  };

  return {
    message,
    setMessage,
    sendMessage,
    conversationId,
    conversations,
    isReady,
    isLoading,
    isSending,
    isResponding,
    startNewConversation,
    selectConversation,
    error: sendError ?? conversationError,
  };
}
