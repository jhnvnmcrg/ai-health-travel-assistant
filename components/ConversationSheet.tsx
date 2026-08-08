import { Alert, FlatList, TouchableOpacity } from "react-native";
import { useMutation } from "convex/react";
import { CheckIcon, Trash2Icon } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { SheetModal } from "./SheetModal";

type ConversationSheetProps = {
  visible: boolean;
  onClose: () => void;
  conversations: Doc<"conversations">[];
  conversationId?: Id<"conversations">;
  onSelect: (id: Id<"conversations">) => void;
};

function formatUpdatedAt(updatedAt: number): string {
  return new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ConversationSheet({
  visible,
  onClose,
  conversations,
  conversationId,
  onSelect,
}: ConversationSheetProps) {
  const deleteConversation = useMutation(api.conversations.deleteConversation);

  const confirmDelete = (conversation: Doc<"conversations">) => {
    Alert.alert(
      "Delete conversation",
      `Delete "${conversation.title ?? "this conversation"}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation({ conversationId: conversation._id });
            } catch (error) {
              console.error("Failed to delete conversation:", error);
            }
          },
        },
      ],
    );
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Your chats"
      subtitle="Tap one to pick it back up."
    >
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <Box className="h-px bg-border" />}
        ListEmptyComponent={
          <Text size="sm" className="text-muted-foreground">
            No conversations yet.
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrent = item._id === conversationId;

          return (
            <HStack className="items-center justify-between py-1">
              <TouchableOpacity
                onPress={() => {
                  onSelect(item._id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                className="flex-1 rounded-lg px-1 py-3 active:bg-accent"
              >
                <HStack space="sm" className="items-center">
                  {isCurrent && (
                    <Icon as={CheckIcon} size="sm" className="text-primary" />
                  )}

                  <VStack className="flex-1">
                    <Text
                      size="sm"
                      numberOfLines={1}
                      className={
                        isCurrent
                          ? "font-medium text-foreground"
                          : "text-foreground"
                      }
                    >
                      {item.title ?? "New conversation"}
                    </Text>
                    <Text size="xs" className="text-muted-foreground">
                      {formatUpdatedAt(item.updatedAt)}
                    </Text>
                  </VStack>
                </HStack>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => confirmDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title ?? "conversation"}`}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
              >
                <Icon as={Trash2Icon} size="sm" className="text-destructive" />
              </TouchableOpacity>
            </HStack>
          );
        }}
      />
    </SheetModal>
  );
}
