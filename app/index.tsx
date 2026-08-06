import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { StatusScreen } from "@/components/StatusScreen";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  // Clerk restores the session from secure storage before it can answer, so
  // this is the app's first frame — a spinner rather than a blank screen.
  if (!isLoaded) {
    return <StatusScreen />;
  }

  if (isSignedIn) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/sign-in" />;
}
