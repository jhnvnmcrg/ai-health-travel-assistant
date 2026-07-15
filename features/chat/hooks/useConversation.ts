import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useConversation(userId?: Id<"users">) {
  const conversations = useQuery(
    api.conversations.listConversations,
    userId ? { userId } : "skip",
  );

  const createConversation = useMutation(api.conversations.createConversation);

  const [conversationId, setConversationId] = useState<Id<"conversations">>();

  useEffect(() => {
    if (!userId) return;
    if (conversations === undefined) return;

    async function initializeConversation() {
      if (conversations.length > 0) {
        setConversationId(conversations[0]._id);
        return;
      }

      const id = await createConversation({
        userId,
        title: "New Health Consultation",
      });

      setConversationId(id);
    }

    initializeConversation();
  }, [userId, conversations, createConversation]);

  return {
    conversationId,
    isReady: !!conversationId,
  };
}
