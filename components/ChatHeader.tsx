import { CloudSunIcon } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { MenuHeader } from "./MenuHeader";

export function ChatHeader() {
  return (
    // `relative z-50` keeps MenuHeader's absolute dropdown above the message list.
    <Box className="relative z-50 border-b border-border bg-background px-5 py-3">
      <HStack className="items-center justify-between">
        <HStack space="sm" className="items-center">
          <Icon as={CloudSunIcon} size="lg" className="text-primary" />
          <VStack>
            <Text className="font-semibold text-foreground">Travel Health</Text>
            <Text size="xs" className="text-muted-foreground">
              Philippines · live conditions
            </Text>
          </VStack>
        </HStack>

        <MenuHeader />
      </HStack>
    </Box>
  );
}
