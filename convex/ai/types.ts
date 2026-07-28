export interface AIResponse {
  safetyVerdict: "Safe" | "Caution" | "High Risk";
  advice: string;
  medicalDisclaimer: string;
  environmentalMetadata?: {
    latitude: number;
    longitude: number;
    altitude: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    rainProbability: number;
    heatIndex: number;
    pm25: number;
    pm10: number;
  };
  nearbyHospitals?: {
    name: string;
    latitude: number;
    longitude: number;
  }[];
}
