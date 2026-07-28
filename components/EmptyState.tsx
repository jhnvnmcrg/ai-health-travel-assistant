import { Compass } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function EmptyState() {
  return (
    <Box className="flex-1 items-center justify-center px-6">
      <VStack space="md" className="items-center">
        <Box className="w-16 h-16 rounded-full bg-[#C08552]/20 border border-dashed border-[#C08552] items-center justify-center mb-1">
          <Compass size={26} className="text-[#BF4E27]" />
        </Box>

        <Heading className="text-center text-[#1F3A2E]">
          Ready for the adventure?
        </Heading>

        <Text className="text-center text-[#6B5F52]">
          Ask about your health and travel plans.
        </Text>
      </VStack>
    </Box>
  );
}
