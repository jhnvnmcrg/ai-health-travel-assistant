import { MapPinIcon, SendIcon } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useDeviceLocation } from "@/hooks/useDeviceLocation";

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending?: boolean;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  isSending = false,
}: ChatComposerProps) {
  const { resolvePlaceName, isLocating, error } = useDeviceLocation();

  /**
   * Fills the composer rather than sending, so the question stays editable —
   * "how are conditions" is rarely the whole of what someone wants to ask.
   */
  const useMyLocation = async () => {
    const place = await resolvePlaceName();

    if (place) {
      onChangeText(`I'm in ${place} right now — how are conditions for me?`);
    }
  };

  return (
    <Box className="border-t border-border bg-background px-4 py-3">
      <VStack space="xs">
        {error ? (
          <Text size="xs" className="px-1 text-destructive">
            {error}
          </Text>
        ) : null}

        <HStack space="sm" className="items-end">
          <Button
            size="icon"
            variant="outline"
            onPress={useMyLocation}
            isDisabled={isLocating}
            accessibilityLabel="Use my current location"
            className="rounded-full"
          >
            {isLocating ? (
              <Spinner size="small" />
            ) : (
              <ButtonIcon as={MapPinIcon} size="sm" />
            )}
          </Button>

          <Box className="flex-1 rounded-2xl border border-border bg-card px-3">
            {/* This vendored Input has no size/variant variants — styling is all
                className, and the placeholder colour comes from its base style. */}
            <Input className="h-auto border-0 bg-transparent">
              <InputField
                value={value}
                onChangeText={onChangeText}
                placeholder="Ask about your trip..."
                className="py-2 text-foreground"
                multiline={true}
                maxLength={500}
              />
            </Input>
          </Box>

          <Button
            size="icon"
            onPress={onSend}
            isDisabled={isSending || !value.trim()}
            accessibilityLabel={isSending ? "Sending message" : "Send message"}
            className="rounded-full"
          >
            {isSending ? (
              <Spinner size="small" />
            ) : (
              <ButtonIcon as={SendIcon} size="sm" />
            )}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
