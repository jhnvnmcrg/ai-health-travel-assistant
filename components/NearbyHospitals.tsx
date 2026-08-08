import { Hospital } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { distanceInKm, formatDistance, type Coordinates } from "@/lib/geo";

const VISIBLE_COUNT = 3;

type NearbyHospitalsProps = {
  hospitals: { name: string; latitude: number; longitude: number }[];
  /** The reply's own coordinates, when it has them — enables distances. */
  origin?: Coordinates;
};

/**
 * The `nearbyHospitals` the assistant looked up. Distances are derived from the
 * stored coordinates, so they only appear when this reply also carries
 * environmental metadata to measure from.
 */
export function NearbyHospitals({ hospitals, origin }: NearbyHospitalsProps) {
  const ranked = hospitals
    .map((hospital) => ({
      ...hospital,
      distance: origin ? distanceInKm(origin, hospital) : undefined,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  const visible = ranked.slice(0, VISIBLE_COUNT);
  const remaining = ranked.length - visible.length;

  return (
    <Box className="border-t border-border pt-3">
      <VStack space="sm">
        <HStack space="xs" className="items-center">
          <Icon as={Hospital} size="xs" className="text-muted-foreground" />
          <Text
            size="xs"
            className="uppercase tracking-wide text-muted-foreground"
          >
            Nearest care
          </Text>
        </HStack>

        <VStack space="xs">
          {visible.map((hospital) => (
            <HStack
              key={`${hospital.name}-${hospital.latitude}-${hospital.longitude}`}
              space="sm"
              className="items-baseline justify-between"
            >
              <Text size="sm" className="flex-1 text-foreground">
                {hospital.name}
              </Text>
              {hospital.distance !== undefined && (
                <Text size="xs" className="text-muted-foreground">
                  {formatDistance(hospital.distance)}
                </Text>
              )}
            </HStack>
          ))}
        </VStack>

        {remaining > 0 && (
          <Text size="xs" className="text-muted-foreground">
            {`+${remaining} more within 10 km`}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
