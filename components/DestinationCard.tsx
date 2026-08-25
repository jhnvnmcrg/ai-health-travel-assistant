import { useState } from "react";
import { TouchableOpacity } from "react-native";
import * as Linking from "expo-linking";
import {
  ChevronRightIcon,
  FootprintsIcon,
  MapPinIcon,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { distanceInKm, formatDistance } from "@/lib/geo";
import { buildDirectionsUrl, shouldAssertWalking } from "@/lib/maps";
import { philippineHour } from "@/lib/tripSchedule";

type PinEnd = {
  name: string;
  label?: string;
  latitude: number;
  longitude: number;
};

type DestinationPin = {
  destination: PinEnd & { query?: string };
  origin?: PinEnd;
};

type DestinationCardProps = {
  destinationPin: DestinationPin;
};

/**
 * The only distance at which this card asserts a travel mode.
 *
 * Deliberately far below the 6km in components/SafePlaces.tsx, and the two
 * numbers should stay apart. That card's reader is on foot by definition —
 * lost, no vehicle, choosing between walking and staying put — so a long walk
 * may genuinely be the plan. This reader is choosing, in a country where a
 * tricycle or jeepney fare is nearly always available. In a travel-health app,
 * handing someone a one-tap 5km walk at a heat index of 41°C is the product
 * arguing against itself.
 *
 * Past this, no mode is sent at all rather than "driving": Google defaults to
 * driving anyway, and asserting it would claim a car the traveller may not
 * have.
 */
const WALKING_LIMIT_KM = 2;

/**
 * The geocoder's own name, falling back to coordinates.
 *
 * A reverse lookup that found nothing still leaves a usable point, and showing
 * the numbers is honest where a blank line would not be.
 */
function endLabel(end: PinEnd): string {
  return end.name || `${end.latitude.toFixed(4)}, ${end.longitude.toFixed(4)}`;
}

function openDirections(destination: PinEnd, walking: boolean) {
  const url = buildDirectionsUrl({
    destination,
    travelMode: walking ? "walking" : undefined,
  });

  Linking.openURL(url).catch((error) => {
    console.error("Failed to open Google Maps:", error);
  });
}

/**
 * Somewhere the traveller asked the way to, as one tappable row.
 *
 * A pin and a straight line, never a path. The distance is computed here from
 * the stored coordinates — the model is never asked for it, and is never asked
 * to describe the way there. Tapping hands the routing to Google Maps, the
 * only thing in this stack that knows where the roads are.
 *
 * There is no compass bearing, unlike components/SafePlaces.tsx, and the
 * difference is deliberate. On the refuge card "the village is 4km northeast"
 * is standard guidance for open country where the alternative is nothing. On a
 * street it is a heading, and a heading gets walked — into a one-way road, a
 * walled subdivision, a river. Saying how far without saying which way is the
 * honest half.
 *
 * Two lines exist to make a wrong match visible rather than merely unlucky.
 * The province shows always, because there are dozens of San Jose, Santa Cruz
 * and Poblacion and the name alone cannot tell a traveller in Batangas they
 * have been handed the Nueva Ecija one. And where the geocoder's name differs
 * from what they typed, both show — "You asked for: the market" above "Baguio
 * City Public Market" is a match confirmed in a second, and above "Rizal
 * Street, Bacolod" it is a mistake caught in one.
 *
 * The footer ends on 911, folded into a sentence rather than standing alone
 * the way SafePlaces' does. The orchestrator drops this card whenever the turn
 * also searched for refuges, so a traveller the model recognised as lost never
 * reaches it — but that backstop only fires if the model recognised them. This
 * line is what is left when it did not, and a Text node cannot be argued out
 * of a sentence the way a prompt can.
 */
export function DestinationCard({ destinationPin }: DestinationCardProps) {
  const { destination, origin } = destinationPin;

  const distance = origin ? distanceInKm(origin, destination) : undefined;

  // Philippine time rather than the device's, so the rule holds for a
  // traveller whose phone is set to another timezone.
  //
  // Sampled once when the card mounts, via a lazy initialiser: reading the
  // clock in the render body is genuinely impure and the React Compiler lint
  // rejects it. The cost is that a card mounted at 16:55 and still on screen at
  // 18:30 keeps its walking mode — accepted, because the model's prose carries
  // the daylight judgement too, and a timer here would re-render rows inside
  // MessageList for no other reason.
  const [hour] = useState(() => philippineHour(Date.now()));

  const couldWalk = distance !== undefined && distance <= WALKING_LIMIT_KM;
  const walking = shouldAssertWalking(distance, WALKING_LIMIT_KM, hour);
  const afterDark = couldWalk && !walking;

  const name = endLabel(destination);

  const asked =
    destination.query &&
    destination.query.toLowerCase() !== destination.name.toLowerCase()
      ? destination.query
      : undefined;

  // Named, not bare: a distance measured from a street name the geocoder had
  // to guess at is only checkable if the guess is on screen beside it.
  const measurement =
    distance !== undefined && origin
      ? `${formatDistance(distance)} from ${endLabel(origin)}${walking ? " · walking" : ""}`
      : undefined;

  const spokenLabel = [
    name,
    destination.label,
    asked ? `You asked for ${asked}` : undefined,
    measurement ? `${measurement} in a straight line` : undefined,
    `Opens ${walking ? "walking " : ""}directions in Google Maps`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Box className="border-t border-border pt-3">
      <VStack space="sm">
        <HStack space="xs" className="items-center">
          <Icon as={MapPinIcon} size="xs" className="text-muted-foreground" />
          <Text
            size="xs"
            className="uppercase tracking-wide text-muted-foreground"
          >
            Where you&apos;re going
          </Text>
        </HStack>

        <TouchableOpacity
          onPress={() => openDirections(destination, walking)}
          accessibilityRole="link"
          accessibilityLabel={spokenLabel}
          className="rounded-xl border border-border bg-card px-3 py-2.5 active:bg-accent"
        >
          <HStack space="sm" className="items-center">
            <VStack space="xs" className="flex-1">
              <Text
                size="sm"
                numberOfLines={1}
                className="font-medium text-foreground"
              >
                {name}
              </Text>

              {destination.label && (
                <Text
                  size="xs"
                  numberOfLines={2}
                  className="text-muted-foreground"
                >
                  {destination.label}
                </Text>
              )}

              {asked && (
                <Text
                  size="xs"
                  numberOfLines={1}
                  className="text-muted-foreground"
                >
                  {`You asked for: ${asked}`}
                </Text>
              )}

              {measurement && (
                <HStack space="xs" className="items-center">
                  {walking && (
                    <Icon
                      as={FootprintsIcon}
                      size="xs"
                      className="text-muted-foreground"
                    />
                  )}
                  <Text size="xs" className="text-muted-foreground">
                    {measurement}
                  </Text>
                </HStack>
              )}
            </VStack>

            <Icon
              as={ChevronRightIcon}
              size="sm"
              className="text-muted-foreground"
            />
          </HStack>
        </TouchableOpacity>

        {/* Shown only where a walk was the thing on offer, so it reads as a
            reason rather than as noise on a journey nobody was going to walk. */}
        {afterDark && (
          <Text size="xs" className="text-muted-foreground">
            It gets dark quickly here and the roads are unlit — a tricycle or
            jeepney is safer than walking now.
          </Text>
        )}

        {/* Said once, here, rather than trusted to the model every turn. */}
        <Text size="xs" className="text-muted-foreground">
          Straight-line distance — Google Maps works out the real route, from
          where your phone is now. Many places here share a name: if this is the
          wrong one, tell me the province and I&apos;ll map it again. Call 911
          if you are in trouble.
        </Text>
      </VStack>
    </Box>
  );
}
