import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

const SUGGESTIONS = [
  "Is it safe to hike Mount Apo tomorrow?",
  "I have asthma — how is the air in Baguio?",
  "Which hospitals are near Lake Sebu?",
];

type EmptyStateProps = {
  /** Fills the composer instead of sending, so the prompt can be edited. */
  onSuggestionPress?: (text: string) => void;
};

export function EmptyState({ onSuggestionPress }: EmptyStateProps) {
  return (
    <Box className="flex-1 justify-center px-5">
      <VStack space="xl">
        <VStack space="xs">
          <Heading size="xl" className="text-foreground">
            Where are you headed?
          </Heading>
          <Text size="sm" className="text-muted-foreground">
            Ask about conditions, health risks, or care nearby.
          </Text>
        </VStack>

        {onSuggestionPress && (
          <VStack space="sm">
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => onSuggestionPress(suggestion)}
                className="rounded-xl border border-border bg-card px-4 py-3 active:bg-accent"
              >
                <Text size="sm" className="text-foreground">
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
