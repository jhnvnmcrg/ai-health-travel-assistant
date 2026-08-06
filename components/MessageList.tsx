import { useRef } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "./EmptyState";
import { ChatMessage } from "./ChatMessage";

/** How close to the bottom still counts as following the conversation. */
const NEAR_BOTTOM_THRESHOLD = 120;

type MessageListProps = {
  conversationId?: Id<"conversations">;
  onSuggestionPress?: (text: string) => void;
};

export function MessageList({
  conversationId,
  onSuggestionPress,
}: MessageListProps) {
  const messages = useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip",
  );

  const listRef = useRef<FlatList<Doc<"messages">>>(null);
  const isFollowing = useRef(true);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromEnd =
      contentSize.height - contentOffset.y - layoutMeasurement.height;

    isFollowing.current = distanceFromEnd <= NEAR_BOTTOM_THRESHOLD;
  };

  /**
   * Replies arrive one chunk at a time, so content height changes constantly.
   * Follow it — but not if the user has scrolled up to re-read something, and
   * without animation, so a streaming reply reads as growing text rather than
   * dozens of queued scroll animations.
   */
  const handleContentSizeChange = () => {
    if (!isFollowing.current) return;

    listRef.current?.scrollToEnd({ animated: false });
  };

  if (!conversationId || messages === undefined) {
    return null;
  }

  if (messages.length === 0) {
    return <EmptyState onSuggestionPress={onSuggestionPress} />;
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item._id}
      className="bg-background"
      renderItem={({ item }) => <ChatMessage message={item} />}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
      contentContainerStyle={{
        paddingVertical: 12,
      }}
    />
  );
}
