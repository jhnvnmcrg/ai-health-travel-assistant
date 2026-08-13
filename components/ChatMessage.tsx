import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { Doc } from "@/convex/_generated/dataModel";


type ChatMessageProps = {
  message: Doc<"messages">;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const { role, text, status, environmentalMetadata, nearbyHospitals } =
    message;

  if (status === "error") {
    return (
      <Box className="px-5 py-3">
        <Box
          className="rounded-xl border border-destructive/40 bg-destructive-subtle px-4 py-3"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Problem with this reply: ${text}`}
        >
          <Text size="sm" className="text-destructive">
            {text}
          </Text>
        </Box>
      </Box>
    );
  }

  if (role === "user") {
    return (
      <Box className="items-end px-5 py-3">
        <Box className="w-4/5 items-end">
          <Box
            className="rounded-2xl bg-muted px-4 py-2.5"
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`You said: ${text}`}
          >
            <Text className="text-foreground">{text}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (status === "streaming" && text === "") {
    return (
      <Box className="px-5 py-3">
        <Text
          size="sm"
          className="text-muted-foreground"
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          Checking conditions...
        </Text>
      </Box>
    );
  }

  return (
    <Box className="px-5 py-3">
      <VStack space="md">
        <Text
          className="rounded-2xl bg-muted px-4 py-2.5"
          accessibilityRole="text"
          accessibilityLabel={`Assistant: ${text}`}
        >
          {text}
        </Text>
      </VStack>
    </Box>
  );
}
