import { action } from "./_generated/server";
import { v } from "convex/values";

export const fetchLocationEnvironmentData = action({
  args: {
    location: v.string(),
  },

  handler: async (_, { location }) => {
    // ---------- Geocoding ----------
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location,
      )}, Philippines`,
      {
        headers: {
          "User-Agent": "AIHealthTravelAssistant/1.0",
        },
      },
    );

    if (!geoResponse.ok) {
      throw new Error("Unable to geocode location.");
    }

    const geo = await geoResponse.json();

    if (!geo.length) {
      throw new Error("Location not found.");
    }

    const latitude = Number(geo[0].lat);
    const longitude = Number(geo[0].lon);

    // ---------- Weather ----------
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`,
    );

    if (!weatherResponse.ok) {
      throw new Error("Unable to fetch weather.");
    }

    const weather = await weatherResponse.json();

    // ---------- Air Quality ----------
    const airResponse = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10`,
    );

    if (!airResponse.ok) {
      throw new Error("Unable to fetch air quality.");
    }

    const air = await airResponse.json();

    // ---------- Elevation ----------
    const elevationResponse = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`,
    );

    if (!elevationResponse.ok) {
      throw new Error("Unable to fetch elevation.");
    }

    const elevation = await elevationResponse.json();

    return {
      latitude,
      longitude,

      altitude: elevation.elevation?.[0] ?? 0,

      temperature: weather.current.temperature_2m,

      humidity: weather.current.relative_humidity_2m,

      windSpeed: weather.current.wind_speed_10m,

      pm25: air.current.pm2_5,

      pm10: air.current.pm10,
    };
  },
});
