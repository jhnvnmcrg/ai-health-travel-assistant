import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function EmptyState() {
  return (
    <Box className="flex-1 items-center justify-center px-6">
      <VStack space="md" className="items-center">
        <Text className="text-5xl">👋</Text>

        <Heading className="text-center">Welcome!</Heading>

        <Text className="text-center text-typography-500">
          Ask about your health and travel plans.
        </Text>

        <Text className="text-center text-typography-400">Example:</Text>

        <Text className="text-center italic">
          "I have asthma and want to visit Lake Sebu tomorrow."
        </Text>
      </VStack>
    </Box>
  );
}
