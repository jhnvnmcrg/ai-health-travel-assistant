import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { EllipsisVertical, Trash2, User } from "lucide-react-native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserProfileView } from "@clerk/expo/native";

export function MenuHeader() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { convexUser, isLoading } = useCurrentUser();
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const conversations = useQuery(
    api.conversations.listConversations,
    convexUser
      ? {
          userId: convexUser._id,
        }
      : "skip",
  );

  if (isLoading || conversations === undefined) {
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
      <View className="flex-row items-center justify-end">
        <TouchableOpacity
          onPress={() => setMenuVisible(!menuVisible)}
          className="w-10 h-10 rounded-full items-center justify-center active:bg-[#F5F1E6]/10"
        >
          <EllipsisVertical size={20} color="#F5F1E6" />
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <>
          <Pressable
            className="absolute top-0 left-0 right-0 bottom-0 h-[1000%] w-[1000%] z-40"
            onPress={() => setMenuVisible(false)}
          />
          <View className="absolute right-5 top-16 bg-[#FBF8F1] border border-[#E4D9C4] p-1.5 rounded-xl shadow-lg w-48 z-50">
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                setIsAuthOpen(true);
              }}
              className="flex-row items-center gap-3 p-2.5 rounded-lg active:bg-[#C08552]/15"
            >
              <User size={16} color="#1F3A2E" />
              <Text className="text-[#2A2420] font-medium text-sm">
                Account
              </Text>
            </TouchableOpacity>

            {item && item.title !== undefined && (
              <TouchableOpacity
                disabled={isDeleteDisabled}
                onPress={handleDeleteChat}
                className="flex-row items-center gap-3 p-2.5 rounded-lg active:bg-[#C08552]/15"
              >
                <Trash2 size={16} color="#A23B2D" />
                <Text className="text-[#A23B2D] font-medium text-sm">
                  Delete Chat
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
