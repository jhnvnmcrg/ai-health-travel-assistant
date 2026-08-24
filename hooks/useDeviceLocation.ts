import { useCallback, useState } from "react";
import * as Location from "expo-location";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  /** Radius of confidence in metres, when the platform reports one. */
  accuracyMetres?: number;
  /**
   * Best-effort only. Reverse geocoding is unsupported on web and returns
   * nothing across much of rural Philippines — which is precisely where
   * someone is likely to be lost.
   */
  placeName?: string;
};

/**
 * Reads the device's position for the composer's map-pin button.
 *
 * **Coordinates are the product here, and the place name is a bonus.** It used
 * to be the other way round: this hook resolved a name and threw the
 * coordinates away, because the only tool at the time took a location string.
 * `find_safe_places` needs real latitude/longitude, and nothing else in the
 * app can supply them — geocoding a town name yields the town centre, which
 * for someone lost 5km outside it makes every distance and bearing wrong.
 */
export function useDeviceLocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string>();

  const resolveLocation = useCallback(async (): Promise<
    DeviceLocation | undefined
  > => {
    setError(undefined);
    setIsLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setError(
          "Location access is off. Type where you are instead, or enable it in Settings.",
        );
        return undefined;
      }

      // High, not Balanced. Balanced is ~100m, and this figure is the origin
      // every safe-place distance and compass bearing is measured from. The
      // extra second and battery is worth it for an explicit button press.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Its own try/catch on purpose: this is the part most likely to fail,
      // and losing the name must never lose the coordinates.
      let placeName: string | undefined;

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        placeName =
          place?.city ?? place?.subregion ?? place?.region ?? undefined;
      } catch (err) {
        console.warn("Reverse geocoding unavailable here:", err);
      }

      return {
        latitude,
        longitude,
        accuracyMetres:
          typeof accuracy === "number" && accuracy > 0 ? accuracy : undefined,
        placeName: placeName?.trim() || undefined,
      };
    } catch (err) {
      console.error("Failed to read device location:", err);
      setError("Couldn't read your location. Try typing where you are.");
      return undefined;
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { resolveLocation, isLocating, error };
}
