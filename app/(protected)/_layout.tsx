import { View, ActivityIndicator } from "react-native";
import { Stack, Redirect } from "expo-router";
import { UserButton } from "@clerk/expo/native";
import { useAuth } from "@clerk/expo";

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

  return (
    <Stack
      screenOptions={{
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <UserButton />
          </View>
        ),
      }}
    />
  );
}
