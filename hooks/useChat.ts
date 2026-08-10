import { useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConversation } from "@/hooks/useConversation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RESPONSE_TIMEOUT_MS } from "@/lib/chatLimits";

const GENERIC_SEND_ERROR = "Your message couldn't be sent. Please try again.";

/**
 * Server-side `ConvexError`s carry a message meant for the person typing (rate
 * limit, length, "still answering"). Anything else is redacted in production
 * and is not something a user could act on, so it gets the generic line.
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

  // `respondingSince` is the server's own lock on the conversation, so the
  // composer is disabled by the same fact that stops a second turn being
  // accepted — rather than by a guess made from the last message's status.
  const respondingSince = conversations.find(
    (conversation) => conversation._id === conversationId,
  )?.respondingSince;

  const [clockTick, setClockTick] = useState(() => Date.now());

  /**
   * A reply that dies without reporting anything leaves the lock set. The
   * server clears it on the next send; this releases the composer at the same
   * moment so the user can make that send in the first place.
   */
  useEffect(() => {
    if (respondingSince === undefined) return;

    const remaining = respondingSince + RESPONSE_TIMEOUT_MS - Date.now();

    if (remaining <= 0) return;

    const timer = setTimeout(() => setClockTick(Date.now()), remaining);

    return () => clearTimeout(timer);
  }, [respondingSince]);

  const isResponding =
    respondingSince !== undefined &&
    clockTick - respondingSince < RESPONSE_TIMEOUT_MS;

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
