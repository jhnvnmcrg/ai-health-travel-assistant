import { tokenCache as secureStoreTokenCache } from "@clerk/expo/token-cache";

/**
 * Native: Clerk's SecureStore-backed cache, so the session survives an app
 * restart. See `tokenCache.web.ts` for why web gets nothing instead.
 */
export const tokenCache = secureStoreTokenCache;
