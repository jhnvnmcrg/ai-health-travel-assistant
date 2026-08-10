import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { Doc } from "@/convex/_generated/dataModel";
import { EnvironmentSummary } from "./EnvironmentSummary";
import { NearbyHospitals } from "./NearbyHospitals";
import { SafetyVerdict } from "./SafetyVerdict";

type ChatMessageProps = {
  message: Doc<"messages">;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const { role, text, status, environmentalMetadata, nearbyHospitals } =
    message;

  if (status === "error") {
    return (
      <Box className="px-5 py-3">
        {/* Rust on cream is the whole signal that this went wrong, and colour
            is exactly what a screen reader cannot see. */}
        <Box
          className="rounded-xl border border-destructive/40 bg-destructive-subtle px-4 py-3"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Problem with this reply: ${text}`}
        >
          <Text size="sm" className="text-destructive">
            {text}
          </Text>
        </Box>
      </Box>
    );
  }

  if (role === "user") {
    return (
      <Box className="items-end px-5 py-3">
        {/* The pill hugs its content, and the 4/5 wrapper caps how wide it grows.
            Assistant replies stay bubble-less, so the two never read alike. */}
        <Box className="w-4/5 items-end">
          {/* Who said what is carried by alignment and background, so the
              label has to restate it. */}
          <Box
            className="rounded-2xl bg-muted px-4 py-2.5"
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`You said: ${text}`}
          >
            <Text className="text-foreground">{text}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // An assistant row exists before its first chunk lands, so an empty
  // still-streaming message gets a placeholder rather than blank space.
  if (status === "streaming" && text === "") {
    return (
      <Box className="px-5 py-3">
        <Text
          size="sm"
          className="text-muted-foreground"
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          Checking conditions...
        </Text>
      </Box>
    );
  }

  return (
    <Box className="px-5 py-3">
      <VStack space="md">
        {environmentalMetadata && (
          <VStack space="xs">
            {environmentalMetadata.locationName ? (
              <Text
                size="xs"
                className="uppercase tracking-wide text-muted-foreground"
                accessibilityRole="text"
                accessibilityLabel={`Conditions for ${environmentalMetadata.locationName}`}
              >
                {environmentalMetadata.locationName}
              </Text>
            ) : null}

            <SafetyVerdict verdict={environmentalMetadata.safetyVerdict} />
          </VStack>
        )}

        {/* Not `accessible` on the wrapper: that would collapse the verdict
            chip, the metric strip and the hospital list into this one node. */}
        <Text
          className="text-foreground"
          accessibilityRole="text"
          accessibilityLabel={`Assistant: ${text}`}
        >
          {text}
        </Text>

        {environmentalMetadata && (
          <EnvironmentSummary metadata={environmentalMetadata} />
        )}

        {nearbyHospitals && nearbyHospitals.length > 0 && (
          <NearbyHospitals
            hospitals={nearbyHospitals}
            origin={environmentalMetadata ?? undefined}
          />
        )}
      </VStack>
    </Box>
  );
}
