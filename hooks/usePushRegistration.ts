import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Requests notification permission once and stores the Expo push token, so
 * convex/trips.ts can send the day-before trip reminder.
 *
 * Failing is fine and silent. A declined permission, a simulator, or a missing
 * EAS project id all just mean no token — and convex/push.ts treats a missing
 * token as "in-app reminder only" rather than an error. Nothing about the app
 * should break because someone said no to notifications.
 *
 * There is a `.web.ts` variant that does nothing: browsers need a separate
 * web-push implementation, and Expo push tokens are not it.
 */
export function usePushRegistration(enabled: boolean) {
  const registerPushToken = useMutation(api.users.registerPushToken);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const register = async () => {
      try {
        // A simulator cannot receive push, and asking wastes a permission
        // prompt the user only gets once.
        if (!Device.isDevice) return;

        const existing = await Notifications.getPermissionsAsync();

        let granted = existing.granted;

        // Only ask when the OS says we may. Re-asking after a denial does
        // nothing on iOS and is merely annoying on Android.
        if (!granted && existing.canAskAgain) {
          const requested = await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }

        if (!granted || cancelled) return;

        // Android needs a channel or notifications arrive silently.
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("trip-reminders", {
            name: "Trip reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        if (!projectId) {
          console.warn("No EAS project id; skipping push registration.");
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId });

        if (cancelled || !token?.data) return;

        await registerPushToken({ pushToken: token.data });
      } catch (error) {
        console.warn("Push registration skipped:", error);
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [enabled, registerPushToken]);
}
