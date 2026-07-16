import { useState } from "react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useConversation } from "./useConversation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useChat() {
  const [message, setMessage] = useState("");
  const { convexUser, isLoading } = useCurrentUser();
  const { conversationId, isReady } = useConversation(convexUser?._id);
  const createMessage = useMutation(api.messages.createMessage);
  const [isSending, setIsSending] = useState(false);
  const processUserMessage = useAction(api.chat.processUserMessage);

  const sendMessage = async () => {
    const text = message.trim();

    if (!text) return;
    if (!conversationId) return;

    try {
      setIsSending(true);

      await createMessage({
        conversationId,
        role: "user",
        text,
        status: "complete",
      });

      await processUserMessage({
        conversationId,
        text,
      });

      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
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
  };
}
