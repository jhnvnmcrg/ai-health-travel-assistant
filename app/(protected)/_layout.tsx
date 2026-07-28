import { View, ActivityIndicator } from "react-native";
import { Redirect, Stack } from "expo-router";
import { UserButton } from "@clerk/expo/native";
import { useAuth } from "@clerk/expo";
import { House, MessageCircleIcon, CircleUserRound } from "lucide-react-native";

export default function HomeLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
