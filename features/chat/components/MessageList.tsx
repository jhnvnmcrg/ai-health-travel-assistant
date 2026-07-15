import { FlatList } from "react-native";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { EmptyState } from "./EmptyState";
import { ChatMessage } from "./ChatMessage";

type MessageListProps = {
  conversationId?: Id<"conversations">;
};

export function MessageList({ conversationId }: MessageListProps) {
  const messages = useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip",
  );

  if (!conversationId || messages === undefined) {
    return null;
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ChatMessage role={item.role} text={item.text} />
      )}
      contentContainerStyle={{
        paddingVertical: 12,
      }}
    />
  );
}
