import { ClerkProvider, useAuth } from "@clerk/expo";
// Platform-split: SecureStore on native, nothing on web. See lib/tokenCache.web.ts.
import { tokenCache } from "../lib/tokenCache";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { convex } from "../lib/convex";
import { clerkPublishableKey } from "../lib/clerk";

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      {/* Passes the Clerk JWT to Convex so ctx.auth works server-side. Plain
          ConvexProvider leaves every function unauthenticated. */}
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {/* "system" follows the OS scheme; the token sets in global.css supply
            both themes. */}
        <GluestackUIProvider mode="system">
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </GluestackUIProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
