import { useState } from "react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useConversation } from "./useConversation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useChat() {
  const [message, setMessage] = useState("");
  const { convexUser, isLoading } = useCurrentUser();
  const { conversationId, isReady } = useConversation(convexUser?._id);
  const createMessage = useMutation(api.messages.createMessage);
  const [isSending, setIsSending] = useState(false);

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
