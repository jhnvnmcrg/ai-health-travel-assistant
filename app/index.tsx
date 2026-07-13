import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function HomeScreen() {
  const message = useQuery(api.hello.hello);

  return (
    <Center className="flex-1 bg-black">
      <Text className="text-2xl font-bold text-white">
        {message ?? "Loading..."}
      </Text>
    </Center>
  );
}
