import { SendIcon } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

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
  return (
    <Box className="border-t border-border bg-background px-4 py-3">
      <HStack space="sm" className="items-end">
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
    </Box>
  );
}
