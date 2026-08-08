import type { ReactNode } from "react";
import { Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { XIcon } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type SheetModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Shared shell for the sheets reachable from the header menu, so a new one is
 * a list of rows rather than another hand-authored screen.
 */
export function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: SheetModalProps) {
  return (
    <Modal
      animationType="slide"
      visible={visible}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1 }} className="bg-background">
        <Box className="flex-1 bg-background px-5 py-4">
          <VStack space="xs">
            <HStack className="items-center justify-between">
              <Heading size="lg" className="text-foreground">
                {title}
              </Heading>

              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
              >
                <Icon as={XIcon} size="lg" className="text-foreground" />
              </TouchableOpacity>
            </HStack>

            {subtitle ? (
              <Text size="sm" className="text-muted-foreground">
                {subtitle}
              </Text>
            ) : null}
          </VStack>

          <Box className="flex-1 pt-4">{children}</Box>
        </Box>
      </SafeAreaView>
    </Modal>
  );
}
