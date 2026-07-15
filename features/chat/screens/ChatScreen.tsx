import { Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ChatHeader } from "../components/ChatHeader";
import { ChatComposer } from "../components/ChatComposer";
import { MessageList } from "../components/MessageList";
import { useChat } from "../hooks/useChat";

export function ChatScreen() {
  const {
    message,
    setMessage,
    sendMessage,
    isSending,
    isReady,
    conversationId,
  } = useChat();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <Box className="flex-1 bg-background-0">
          <ChatHeader />

          <Box className="flex-1">
            <MessageList conversationId={conversationId} />
          </Box>

          <Text className="text-center py-2">
            {isReady ? "Conversation Ready" : "Preparing Conversation..."}
          </Text>

          <ChatComposer
            value={message}
            onChangeText={setMessage}
            onSend={sendMessage}
            isSending={isSending}
          />
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
