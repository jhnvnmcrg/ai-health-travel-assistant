import { useUser } from "@clerk/expo";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  // The row is looked up from the verified JWT server-side, so there is no
  // clerkUserId argument to pass.
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  return {
    clerkUser: user,
    convexUser,
    isLoading:
      !isLoaded || isAuthLoading || (isAuthenticated && convexUser === undefined),
  };
}
