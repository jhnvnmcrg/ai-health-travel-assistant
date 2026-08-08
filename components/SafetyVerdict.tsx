import { tva } from "@gluestack-ui/utils/nativewind-utils";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

export type Verdict = "Safe" | "Caution" | "High Risk";

const chipStyle = tva({
  base: "self-start rounded-full px-3 py-1",
  variants: {
    verdict: {
      Safe: "bg-success-subtle",
      Caution: "bg-warning-subtle",
      "High Risk": "bg-destructive-subtle",
    },
  },
});

const dotStyle = tva({
  base: "h-1.5 w-1.5 rounded-full",
  variants: {
    verdict: {
      Safe: "bg-success",
      Caution: "bg-warning",
      "High Risk": "bg-destructive",
    },
  },
});

const labelStyle = tva({
  base: "font-semibold uppercase tracking-widest",
  variants: {
    verdict: {
      Safe: "text-success",
      Caution: "text-warning",
      "High Risk": "text-destructive",
    },
  },
});

/** The stored `environmentalMetadata.safetyVerdict`, as a chip. */
export function SafetyVerdict({ verdict }: { verdict: Verdict }) {
  return (
    <Box className={chipStyle({ verdict })}>
      <HStack space="xs" className="items-center">
        <Box className={dotStyle({ verdict })} />
        <Text size="xs" className={labelStyle({ verdict })}>
          {verdict}
        </Text>
      </HStack>
    </Box>
  );
}
