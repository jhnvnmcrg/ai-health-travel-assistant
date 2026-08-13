import { useState } from "react";
import { Pressable, TouchableOpacity } from "react-native";
import {
  EllipsisVertical,
  HeartPulse,
  MessagesSquare,
  SquarePen,
  User,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AccountSheet } from "./AccountSheet";
import { ConversationSheet } from "./ConversationSheet";
import { HealthProfileSheet } from "./HealthProfileSheet";

type MenuHeaderProps = {
  conversations: Doc<"conversations">[];
  conversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewConversation: () => void;
};

type MenuItemProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      className="rounded-lg p-2.5 active:bg-accent"
    >
      <HStack space="sm" className="items-center">
        <Icon as={icon} size="sm" className="text-popover-foreground" />
        <Text size="sm" className="font-medium text-popover-foreground">
          {label}
        </Text>
      </HStack>
    </TouchableOpacity>
  );
}

export function MenuHeader({
  conversations,
  conversationId,
  onSelectConversation,
  onNewConversation,
}: MenuHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isChatsOpen, setIsChatsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const close = () => setMenuVisible(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuVisible(!menuVisible)}
        accessibilityRole="button"
        accessibilityLabel={menuVisible ? "Close menu" : "Open menu"}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
      >
        <Icon as={EllipsisVertical} size="lg" className="text-foreground" />
      </TouchableOpacity>

      {menuVisible && (
        <>
          {/* Oversized so a tap anywhere outside the menu dismisses it. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            className="absolute bottom-0 left-0 right-0 top-0 z-40 h-[1000%] w-[1000%]"
            onPress={close}
          />
          <Box className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
            <MenuItem
              icon={SquarePen}
              label="New chat"
              onPress={() => {
                close();
                onNewConversation();
              }}
            />

            <MenuItem
              icon={MessagesSquare}
              label="Your chats"
              onPress={() => {
                close();
                setIsChatsOpen(true);
              }}
            />

            <MenuItem
              icon={HeartPulse}
              label="Health profile"
              onPress={() => {
                close();
                setIsProfileOpen(true);
              }}
            />

            <MenuItem
              icon={User}
              label="Account"
              onPress={() => {
                close();
                setIsAccountOpen(true);
              }}
            />
          </Box>
        </>
      )}

      <ConversationSheet
        visible={isChatsOpen}
        onClose={() => setIsChatsOpen(false)}
        conversations={conversations}
        conversationId={conversationId}
        onSelect={onSelectConversation}
      />

      <HealthProfileSheet
        visible={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <AccountSheet
        visible={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </>
  );
}
