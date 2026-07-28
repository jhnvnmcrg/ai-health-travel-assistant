import { useState } from "react";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SendIcon } from "lucide-react-native";

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
    <Box className="border-t border-[#E4D9C4] bg-[#F5F1E6] px-4 py-3">
      <HStack className="items-center gap-2 bg-[#FBF8F1] rounded-2xl px-4 py-1 border border-[#E4D9C4]">
        <Input
          variant="outline"
          size="md"
          className="flex-1 border-0 h-auto bg-transparent"
        >
          <InputField
            value={value}
            onChangeText={onChangeText}
            placeholder="Ask about the trail ahead..."
            placeholderTextColor="#9C8F7E"
            className="text-[#2A2420] text-base py-2"
            multiline={true}
            maxLength={500}
          />
        </Input>

        <Button
          onPress={onSend}
          isDisabled={isSending || !value.trim()}
          className="w-9 h-9 rounded-full items-center justify-center p-0 bg-[#9C8F7E]"
        >
          {isSending ? (
            <Spinner size="small" />
          ) : (
            <ButtonIcon as={SendIcon} size="lg" className="text-primary" />
          )}
        </Button>
      </HStack>
    </Box>
  );
}
