import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

type ChatMessageProps = {
  role: "user" | "assistant";
  text: string;
};

export function ChatMessage({ role, text }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <Box
      className={`mx-4 my-2 max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser ? "self-end bg-primary-600" : "self-start bg-background-100"
      }`}
    >
      <Text className={isUser ? "text-black" : "text-typography-900"}>
        {text}
      </Text>
    </Box>
  );
}
