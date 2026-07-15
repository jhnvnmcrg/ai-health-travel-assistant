import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export function ChatHeader() {
  return (
    <Box className="border-b border-outline-200 bg-background-0 px-4 py-4">
      <Heading size="lg">AI Health Travel Assistant</Heading>

      <Text className="mt-1 text-typography-500">
        Your personalized travel health advisor
      </Text>
    </Box>
  );
}
