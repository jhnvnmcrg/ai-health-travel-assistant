import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloudSunIcon } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Shared shell for the sign-in, sign-up and verification steps. */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: AuthScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <Box className="flex-1 justify-center bg-background px-6">
        <VStack space="2xl">
          <HStack space="sm" className="items-center">
            <Icon as={CloudSunIcon} size="lg" className="text-primary" />
            <Text className="font-semibold text-foreground">Travel Health</Text>
          </HStack>

          <VStack space="xs">
            <Heading size="2xl" className="text-foreground">
              {title}
            </Heading>
            {subtitle ? (
              <Text size="sm" className="text-muted-foreground">
                {subtitle}
              </Text>
            ) : null}
          </VStack>

          {children}

          {footer}
        </VStack>
      </Box>
    </SafeAreaView>
  );
}

type AuthFieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

export function AuthField({ label, error, children }: AuthFieldProps) {
  return (
    <VStack space="xs">
      <Text size="xs" className="uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>

      {children}

      {error ? (
        <Text size="xs" className="text-destructive">
          {error}
        </Text>
      ) : null}
    </VStack>
  );
}
