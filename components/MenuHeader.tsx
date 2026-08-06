import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Alert, Modal, Pressable, TouchableOpacity } from "react-native";
import { EllipsisVertical, Trash2, User } from "lucide-react-native";
import { UserProfileView } from "@clerk/expo/native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function MenuHeader() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const conversations = useQuery(
    api.conversations.listConversations,
    isAuthenticated ? {} : "skip",
  );

  if (conversations === undefined) {
    return null;
  }

  const item = conversations[0];

  const handleDeleteChat = () => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteConversation({
              conversationId: item._id,
            });
          },
        },
      ],
    );
    setMenuVisible(false);
  };

  const isDeleteDisabled = !item;

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuVisible(!menuVisible)}
        accessibilityRole="button"
        accessibilityLabel={menuVisible ? "Close menu" : "Open menu"}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
      >
        <Icon as={EllipsisVertical} size="lg" className="text-foreground" />
      </TouchableOpacity>

      {menuVisible && (
        <>
          {/* Oversized so a tap anywhere outside the menu dismisses it. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            className="absolute bottom-0 left-0 right-0 top-0 z-40 h-[1000%] w-[1000%]"
            onPress={() => setMenuVisible(false)}
          />
          <Box className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                setIsAuthOpen(true);
              }}
              className="rounded-lg p-2.5 active:bg-accent"
            >
              <HStack space="sm" className="items-center">
                <Icon as={User} size="sm" className="text-popover-foreground" />
                <Text size="sm" className="font-medium text-popover-foreground">
                  Account
                </Text>
              </HStack>
            </TouchableOpacity>

            {item && item.title !== undefined && (
              <TouchableOpacity
                disabled={isDeleteDisabled}
                onPress={handleDeleteChat}
                className="rounded-lg p-2.5 active:bg-accent"
              >
                <HStack space="sm" className="items-center">
                  <Icon as={Trash2} size="sm" className="text-destructive" />
                  <Text size="sm" className="font-medium text-destructive">
                    Delete Chat
                  </Text>
                </HStack>
              </TouchableOpacity>
            )}
          </Box>
        </>
      )}

      <Modal
        animationType="slide"
        visible={isAuthOpen}
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAuthOpen(false)}
      >
        <UserProfileView onDismiss={() => setIsAuthOpen(false)} />
      </Modal>
    </>
  );
}
