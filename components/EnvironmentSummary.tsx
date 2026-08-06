import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type EnvironmentMetadata = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  rainProbability: number;
  heatIndex: number;
  pm25: number;
  pm10: number;
  altitude: number;
};

type EnvironmentSummaryProps = {
  metadata: EnvironmentMetadata;
};

/**
 * The `environmentalMetadata` the assistant fetched for this reply. Values are
 * shown as-is (rounded) — nothing is derived or re-interpreted here.
 */
export function EnvironmentSummary({ metadata }: EnvironmentSummaryProps) {
  const metrics = [
    { label: "Heat index", value: `${Math.round(metadata.heatIndex)}°C` },
    { label: "Temp", value: `${Math.round(metadata.temperature)}°C` },
    { label: "UV", value: `${Math.round(metadata.uvIndex)}` },
    { label: "PM2.5", value: `${Math.round(metadata.pm25)}` },
    { label: "PM10", value: `${Math.round(metadata.pm10)}` },
    { label: "Humidity", value: `${Math.round(metadata.humidity)}%` },
    { label: "Wind", value: `${Math.round(metadata.windSpeed)} km/h` },
    { label: "Rain", value: `${Math.round(metadata.rainProbability)}%` },
    { label: "Elevation", value: `${Math.round(metadata.altitude)} m` },
  ];

  return (
    <Box className="border-t border-border pt-3">
      <HStack className="flex-wrap gap-x-5 gap-y-3">
        {metrics.map((metric) => (
          <VStack key={metric.label}>
            <Text size="xs" className="uppercase tracking-wide text-muted-foreground">
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
