/**
 * Web gets no push registration.
 *
 * Expo push tokens are a native concept; browsers need the Web Push API with
 * a service worker and VAPID keys, which is a separate implementation
 * altogether. convex/push.ts already treats a missing token as "in-app
 * reminder only", so web users still get the trip reminder in the
 * conversation — just not on their lock screen.
 */
export function usePushRegistration(_enabled: boolean) {
  // Intentionally empty.
}
