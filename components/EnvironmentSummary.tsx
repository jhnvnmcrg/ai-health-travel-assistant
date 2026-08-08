import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * Every metric is optional because the upstream feeds have real coverage gaps.
 * A missing one is left out of the strip rather than shown as zero — "PM2.5 0"
 * reads as pristine air, which is the opposite of "we don't know".
 */
type EnvironmentMetadata = {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  uvIndex?: number;
  rainProbability?: number;
  heatIndex?: number;
  pm25?: number;
  pm10?: number;
  altitude?: number;
};

type EnvironmentSummaryProps = {
  metadata: EnvironmentMetadata;
};

/**
 * The readings the assistant's tools returned for this reply. Values are shown
 * as-is (rounded) — nothing is derived or re-interpreted here.
 */
export function EnvironmentSummary({ metadata }: EnvironmentSummaryProps) {
  const metrics = [
    { label: "Heat index", value: metadata.heatIndex, unit: "°C" },
    { label: "Temp", value: metadata.temperature, unit: "°C" },
    { label: "UV", value: metadata.uvIndex, unit: "" },
    { label: "PM2.5", value: metadata.pm25, unit: "" },
    { label: "PM10", value: metadata.pm10, unit: "" },
    { label: "Humidity", value: metadata.humidity, unit: "%" },
    { label: "Wind", value: metadata.windSpeed, unit: " km/h" },
    { label: "Rain", value: metadata.rainProbability, unit: "%" },
    { label: "Elevation", value: metadata.altitude, unit: " m" },
  ].flatMap(({ label, value, unit }) =>
    value === undefined
      ? []
      : [{ label, value: `${Math.round(value)}${unit}` }],
  );

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Box className="border-t border-border pt-3">
      <HStack className="flex-wrap gap-x-5 gap-y-3">
        {metrics.map((metric) => (
          <VStack key={metric.label}>
            <Text
              size="xs"
              className="uppercase tracking-wide text-muted-foreground"
            >
              {metric.label}
            </Text>
            <Text size="sm" className="font-medium text-foreground">
              {metric.value}
            </Text>
          </VStack>
        ))}
      </HStack>
    </Box>
  );
}
