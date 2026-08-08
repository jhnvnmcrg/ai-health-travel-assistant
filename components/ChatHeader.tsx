import { CloudSunIcon } from "lucide-react-native";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { MenuHeader } from "./MenuHeader";

type ChatHeaderProps = {
  conversations: Doc<"conversations">[];
  conversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewConversation: () => void;
};

export function ChatHeader({
  conversations,
  conversationId,
  onSelectConversation,
  onNewConversation,
}: ChatHeaderProps) {
  const title = conversations.find(
    (conversation) => conversation._id === conversationId,
  )?.title;

  return (
    // `relative z-50` keeps MenuHeader's absolute dropdown above the message list.
    <Box className="relative z-50 border-b border-border bg-background px-5 py-3">
      <HStack className="items-center justify-between">
        <HStack space="sm" className="flex-1 items-center">
          <Icon as={CloudSunIcon} size="lg" className="text-primary" />
          <VStack className="flex-1">
            <Text numberOfLines={1} className="font-semibold text-foreground">
              {title ?? "Travel Health"}
            </Text>
            <Text size="xs" className="text-muted-foreground">
              Philippines · live conditions
            </Text>
          </VStack>
        </HStack>

        <MenuHeader
          conversations={conversations}
          conversationId={conversationId}
          onSelectConversation={onSelectConversation}
          onNewConversation={onNewConversation}
        />
      </HStack>
    </Box>
  );
}
