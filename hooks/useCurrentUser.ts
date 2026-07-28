import { useUser } from "@clerk/expo";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCurrentUser() {
  const { user, isLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getCurrentUser,
    user
      ? {
          clerkUserId: user.id,
        }
      : "skip",
  );

  return {
    clerkUser: user,
    convexUser,
    isLoading: !isLoaded || (user && convexUser === undefined),
  };
}
