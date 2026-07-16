import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { SafetyVerdictBadge } from "./SafetyVerdictBadge";
import { EnvironmentSummaryCard } from "./EnvironmentSummaryCard";

type EnvironmentalMetadata = {
  latitude: number;
  longitude: number;
  altitude: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pm25: number;
  pm10: number;
  safetyVerdict: "Safe" | "Caution" | "High Risk";
};

type ChatMessageProps = {
  role: "user" | "assistant";
  text: string;
  environmentalMetadata?: EnvironmentalMetadata;
};

export function ChatMessage({
  role,
  text,
  environmentalMetadata,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <Box
      className={`mx-4 my-2 max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser ? "self-end bg-primary-600" : "self-start bg-background-100"
      }`}
    >
      {environmentalMetadata && (
        <>
          <SafetyVerdictBadge verdict={environmentalMetadata.safetyVerdict} />

          <EnvironmentSummaryCard
            temperature={environmentalMetadata.temperature}
            humidity={environmentalMetadata.humidity}
            windSpeed={environmentalMetadata.windSpeed}
            pm25={environmentalMetadata.pm25}
            pm10={environmentalMetadata.pm10}
            altitude={environmentalMetadata.altitude}
          />
        </>
      )}
      <Text className={isUser ? "text-black" : "text-typography-900"}>
        {text}
      </Text>
    </Box>
  );
}
