import { Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNetInfo } from "@react-native-community/netinfo";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatComposer } from "@/components/ChatComposer";
import { MessageList } from "@/components/MessageList";
import { useChat } from "@/hooks/useChat";

export default function HomeScreen() {
  const {
    message,
    setMessage,
    sendMessage,
    isSending,
    isResponding,
    isReady,
    conversationId,
    conversations,
    startNewConversation,
    selectConversation,
    error,
  } = useChat();

  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  const statusText = () => {
    if (error) {
      return error;
    }
    if (isOffline) {
      return "You're offline. Messages cannot be sent";
    }
    if (!isReady) {
      return "Preparing conversation...";
    }
    return "";
  };

  const status = statusText();
  const isAlert = !!error || isOffline;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <Box className="flex-1 bg-background">
          <ChatHeader
            conversations={conversations}
            conversationId={conversationId}
            onSelectConversation={selectConversation}
            onNewConversation={startNewConversation}
          />

          <Box className="flex-1">
            <MessageList
              conversationId={conversationId}
              onSuggestionPress={setMessage}
            />
          </Box>

          {status !== "" && (
            <Text
              size="xs"
              className={`px-5 py-2 text-center ${
                isAlert ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {status}
            </Text>
          )}

          <ChatComposer
            value={message}
            onChangeText={setMessage}
            onSend={sendMessage}
            // Blocked while the assistant is mid-reply, so two turns cannot
            // interleave in the same conversation.
            isSending={isSending || isResponding || isOffline || !isReady}
          />
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
