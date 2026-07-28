import { View, Text } from "react-native";
import { CloudSunIcon } from "lucide-react-native";
import { MenuHeader } from "./MenuHeader";

export function ChatHeader() {
  return (
    <View className="relative z-50 flex-row items-center justify-between px-5 py-4 border-b border-[#16281F] bg-[#1F3A2E]">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-[#BF4E27] items-center justify-center">
          <CloudSunIcon size={20} color="#F5F1E6" />
        </View>
        <View>
          <Text className="text-[#F5F1E6] text-lg font-bold leading-tight">
            Travel Health Guide
          </Text>
          <Text className="text-[#C4D3C9] text-xs">
            Your personal trip advisor
          </Text>
        </View>
      </View>
      <MenuHeader />
    </View>
  );
}
