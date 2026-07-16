import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

type Props = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  pm25: number;
  pm10: number;
  altitude: number;
};

export function EnvironmentSummaryCard({
  temperature,
  humidity,
  windSpeed,
  pm25,
  pm10,
  altitude,
}: Props) {
  return (
    <Box className="mb-3 rounded-xl bg-background-100 p-3">
      <Text>🌡 Temperature: {temperature}°C</Text>
      <Text>💧 Humidity: {humidity}%</Text>
      <Text>🌬 Wind: {windSpeed} km/h</Text>
      <Text>🌫 PM2.5: {pm25}</Text>
      <Text>🌫 PM10: {pm10}</Text>
      <Text>🏔 Altitude: {altitude} m</Text>
    </Box>
  );
}
