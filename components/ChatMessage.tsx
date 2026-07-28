import { View, Text } from "react-native";

type ChatMessageProps = {
  role: "user" | "assistant";
  text: string;
};

export function ChatMessage({ role, text }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <View className={`px-5 py-2 ${isUser ? "items-end" : "items-start"}`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#1F3A2E] rounded-br-md"
            : "bg-[#FBF8F1] border border-[#E4D9C4] rounded-bl-md"
        }`}
      >
        <Text
          className={
            isUser
              ? "text-[#F5F1E6] text-base leading-6"
              : "text-[#2A2420] text-base leading-6"
          }
        >
          {text}
        </Text>
      </View>
    </View>
  );
}
