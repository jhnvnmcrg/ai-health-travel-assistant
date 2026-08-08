import { useEffect, useState } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatusScreen } from "@/components/StatusScreen";

const SLOW_CONNECT_MS = 6000;

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const syncUser = useMutation(api.users.syncUser);

  const [isSynced, setIsSynced] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const [isSlow, setIsSlow] = useState(false);

  const clerkUserId = user?.id;
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName ?? undefined;

  /**
   * Every authenticated route mounts this layout, so both sign-in and sign-up
   * end up with a Convex user row — conversations and messages are keyed off it.
   * `syncUser` is an idempotent upsert and takes the Clerk id from the verified
   * JWT, not from these arguments.
   */
  useEffect(() => {
    if (!isAuthenticated || !clerkUserId) return;

    let cancelled = false;

    syncUser({ email, displayName })
      .then(() => {
        if (cancelled) return;
        setSyncError(undefined);
        setIsSynced(true);
      })
      .catch((error) => {
        console.error("Failed to sync user:", error);
        if (cancelled) return;
        setSyncError(
          "We couldn't finish setting up your account. Check your connection and reopen the app.",
        );
      });

    return () => {
      cancelled = true;
    };
    // Primitives only: depending on the Clerk `user` object would re-run this
    // mutation on every identity change.
  }, [isAuthenticated, clerkUserId, email, displayName, syncUser]);

  const isConnecting =
    !isLoaded || (isSignedIn && (isAuthLoading || (!isSynced && !syncError)));

  useEffect(() => {
    if (!isConnecting) return;

    const timer = setTimeout(() => setIsSlow(true), SLOW_CONNECT_MS);

    return () => {
      clearTimeout(timer);

      // Reset on the way out rather than in the effect body: a setState in the
      // body runs synchronously during render and cascades, and undoing what
      // the timer above may have set is what cleanup is for.
      setIsSlow(false);
    };
  }, [isConnecting]);

  useEffect(() => {
    if (!isSlow || isAuthenticated) return;

    console.warn(
      "Convex has not authenticated this session. Check that a JWT template " +
        'named "convex" exists in Clerk and that CLERK_JWT_ISSUER_DOMAIN is set ' +
        "on the Convex deployment (npx convex env set CLERK_JWT_ISSUER_DOMAIN ...).",
    );
  }, [isSlow, isAuthenticated]);

  if (!isLoaded) {
    return <StatusScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (syncError) {
    return <StatusScreen showSpinner={false} message={syncError} />;
  }

  if (isConnecting) {
    return (
      <StatusScreen message={isSlow ? "Still connecting..." : undefined} />
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
