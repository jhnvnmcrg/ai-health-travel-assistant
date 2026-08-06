import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type StatusScreenProps = {
  message?: string;
  showSpinner?: boolean;
};

/**
 * Full-screen spinner or message for the moments before a route can render:
 * Clerk loading in app/index.tsx, and the auth/user-sync gate in
 * app/(protected)/_layout.tsx. Without it those frames are blank.
 */
export function StatusScreen({
  message,
  showSpinner = true,
}: StatusScreenProps) {
  return (
    <Box className="flex-1 items-center justify-center bg-background px-8">
      <VStack space="md" className="items-center">
        {showSpinner && <Spinner size="large" className="text-primary" />}
        {message ? (
          <Text size="sm" className="text-center text-muted-foreground">
            {message}
          </Text>
        ) : null}
      </VStack>
    </Box>
  );
}
