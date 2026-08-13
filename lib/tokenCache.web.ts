/**
 * Web gets no token cache, deliberately.
 *
 * `@clerk/expo/token-cache` calls `expo-secure-store` unconditionally, and
 * SecureStore's web build is a literal `export default {}` — every method is
 * missing. `getToken` would throw inside its own catch handler, and
 * `saveToken` has no catch at all, so each token write became an unhandled
 * rejection.
 *
 * Passing `undefined` is not a downgrade: Clerk's JS SDK persists the session
 * itself in the browser. The cache exists on native precisely because there is
 * no browser storage to fall back to.
 */
export const tokenCache = undefined;
