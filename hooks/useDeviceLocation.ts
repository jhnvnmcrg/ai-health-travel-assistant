import { useCallback, useState } from "react";
import * as Location from "expo-location";

/**
 * Turns the device's position into a place name the assistant can look up.
 *
 * It deliberately stops at a name rather than passing coordinates through:
 * `fetch_location_environment_data` takes a place string, and a name is also
 * what the user needs to see to know the advice is about where they actually
 * are.
 */
export function useDeviceLocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string>();

  const resolvePlaceName = useCallback(async (): Promise<
    string | undefined
  > => {
    setError(undefined);
    setIsLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setError(
          "Location access is off. Type a place name instead, or enable it in Settings.",
        );
        return undefined;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const name = place?.city ?? place?.subregion ?? place?.region;

      if (!name) {
        setError("Couldn't work out which place you're in. Try typing it.");
        return undefined;
      }

      return name;
    } catch (err) {
      console.error("Failed to read device location:", err);
      setError("Couldn't read your location. Try typing a place name.");
      return undefined;
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { resolvePlaceName, isLocating, error };
}
