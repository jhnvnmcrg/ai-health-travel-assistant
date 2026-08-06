import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConversation } from "@/hooks/useConversation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useChat() {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string>();

  const { convexUser, isLoading } = useCurrentUser();
  const {
    conversationId,
    isReady,
    error: conversationError,
  } = useConversation(!!convexUser);

  const createMessage = useMutation(api.messages.createMessage);
  const processUserMessage = useAction(api.chat.processUserMessage);

  const sendMessage = async () => {
    const text = message.trim();

    if (!text) return;
    if (!conversationId) return;
    if (isSending) return;

    setSendError(undefined);
    setIsSending(true);

    try {
      await createMessage({
        conversationId,
        text,
      });

      // Only clear once the message is actually stored, so a failed send does
      // not lose what the user typed.
      setMessage("");

      // Failures inside the assistant are reported as an error message row by
      // convex/chat.ts; this only throws if the call itself could not run.
      await processUserMessage({
        conversationId,
        text,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setSendError("Your message couldn't be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return {
    message,
    setMessage,
    sendMessage,
    conversationId,
    isReady,
    isLoading,
    isSending,
    error: sendError ?? conversationError,
  };
}
