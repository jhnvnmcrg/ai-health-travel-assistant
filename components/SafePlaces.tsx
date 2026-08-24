import { TouchableOpacity } from "react-native";
import * as Linking from "expo-linking";
import {
  BusIcon,
  ChevronRightIcon,
  HospitalIcon,
  NavigationIcon,
  ShieldIcon,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  bearingInDegrees,
  compassDirection,
  distanceInKm,
  formatDistance,
  type Coordinates,
} from "@/lib/geo";

type SafePlaceCategory = "town" | "police" | "hospital" | "transport";

type SafePlace = {
  name: string;
  category: SafePlaceCategory;
  latitude: number;
  longitude: number;
};

type SafePlacesProps = {
  safePlaces: {
    origin: Coordinates;
    places: SafePlace[];
  };
};

/** Beyond this, walking directions are the wrong default to hand someone. */
const WALKING_LIMIT_KM = 6;

const VISIBLE_COUNT = 4;

const CATEGORY_ICON: Record<SafePlaceCategory, LucideIcon> = {
  town: NavigationIcon,
  police: ShieldIcon,
  hospital: HospitalIcon,
  transport: BusIcon,
};

const CATEGORY_LABEL: Record<SafePlaceCategory, string> = {
  town: "Town",
  police: "Police",
  hospital: "Hospital",
  transport: "Transport",
};

/**
 * Opens Google Maps directions to a destination.
 *
 * `origin` is deliberately omitted. Google Maps then routes from the device's
 * own live position, which is more current than anything we stored when the
 * reply was written — someone lost has probably kept moving since. The stored
 * origin is used only to describe distance and direction in the card.
 *
 * The `api=1` universal URL is handled by the Maps app on Android and iOS and
 * by the browser on web, so this needs no platform split.
 */
function openDirections(place: SafePlace, distanceKm: number) {
  const destination = `${place.latitude},${place.longitude}`;
  const travelmode = distanceKm <= WALKING_LIMIT_KM ? "walking" : "driving";

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(destination)}` +
    `&travelmode=${travelmode}`;

  Linking.openURL(url).catch((error) => {
    console.error("Failed to open Google Maps:", error);
  });
}

/**
 * The `safePlaces` a reply looked up, as tappable rows.
 *
 * Distance and bearing are computed here from the stored search origin — the
 * model is never asked for them, and never asked to describe a route. Tapping
 * hands the actual navigation to Google Maps.
 */
export function SafePlaces({ safePlaces }: SafePlacesProps) {
  const { origin, places } = safePlaces;

  const ranked = places
    .map((place) => {
      const distance = distanceInKm(origin, place);

      return {
        ...place,
        distance,
        direction: compassDirection(bearingInDegrees(origin, place)),
      };
    })
    .sort((a, b) => a.distance - b.distance);

  const visible = ranked.slice(0, VISIBLE_COUNT);

  if (visible.length === 0) {
    return null;
  }

  return (
    <Box className="border-t border-border pt-3">
      <VStack space="sm">
        <HStack space="xs" className="items-center">
          <Icon
            as={NavigationIcon}
            size="xs"
            className="text-muted-foreground"
          />
          <Text
            size="xs"
            className="uppercase tracking-wide text-muted-foreground"
          >
            Head for safety
          </Text>
        </HStack>

        <VStack space="xs">
          {visible.map((place) => (
            <TouchableOpacity
              key={`${place.name}-${place.latitude}-${place.longitude}`}
              onPress={() => openDirections(place, place.distance)}
              accessibilityRole="link"
              accessibilityLabel={`${place.name}, ${CATEGORY_LABEL[place.category]}, ${formatDistance(place.distance)} ${place.direction}. Opens directions in Google Maps.`}
              className="rounded-xl border border-border bg-card px-3 py-2.5 active:bg-accent"
            >
              <HStack space="sm" className="items-center">
                <Icon
                  as={CATEGORY_ICON[place.category]}
                  size="sm"
                  className="text-primary"
                />

                <VStack className="flex-1">
                  <Text
                    size="sm"
                    numberOfLines={1}
                    className="font-medium text-foreground"
                  >
                    {place.name}
                  </Text>
                  <Text size="xs" className="text-muted-foreground">
                    {`${CATEGORY_LABEL[place.category]} · ${formatDistance(place.distance)} ${place.direction}`}
                  </Text>
                </VStack>

                <Icon
                  as={ChevronRightIcon}
                  size="sm"
                  className="text-muted-foreground"
                />
              </HStack>
            </TouchableOpacity>
          ))}
        </VStack>

        {/* Said once, here, rather than trusted to the model every time. */}
        <Text size="xs" className="text-muted-foreground">
          Straight-line distance — tap for directions in Google Maps. Call 911
          if you are in danger.
        </Text>
      </VStack>
    </Box>
  );
}
