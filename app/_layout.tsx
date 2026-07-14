import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { Stack } from "expo-router";
import { ConvexProvider } from "convex/react";
import { convex } from "../lib/convex";
import { clerkPublishableKey } from "../lib/clerk";

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexProvider client={convex}>
        <GluestackUIProvider mode="light">
          <Stack screenOptions={{ headerShown: false }} />
        </GluestackUIProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}
