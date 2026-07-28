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
    isReady,
    conversationId,
  } = useChat();

  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  const statusText = () => {
    if (isOffline) {
      return "You're offline. Messages cannot be sent";
    }
    if (!isReady) {
      return "Preparing conversation...";
    }
    return "";
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-[#1F3A2E]">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <Box className="flex-1 bg-[#F5F1E6]">
          <ChatHeader />

          <Box className="flex-1">
            <MessageList conversationId={conversationId} />
          </Box>

          <Text
            className={`text-center py-2 font-mono text-[11px] uppercase tracking-widest ${
              isOffline ? "text-red-200" : "text-[#9C8F7E]"
            }`}
          >
            {statusText()}
          </Text>

          <ChatComposer
            value={message}
            onChangeText={setMessage}
            onSend={sendMessage}
            isSending={isSending || isOffline}
          />
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
