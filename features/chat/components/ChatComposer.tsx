import { useState } from "react";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";

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
    <Box className="border-t border-outline-200 bg-background-0 p-4">
      <HStack space="sm">
        <Input className="flex-1">
          <InputField
            value={value}
            onChangeText={onChangeText}
            placeholder="Type your message..."
          />
        </Input>

        <Button onPress={onSend} isDisabled={isSending || !value.trim()}>
          <ButtonText>{isSending ? "Sending..." : "Send"}</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
}
