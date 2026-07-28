import { action } from "./_generated/server";
import { v } from "convex/values";
import { getEnvironmentDashboardService } from "./services/environmentService";

export const fetchLocationEnvironmentData = action({
  args: {
    location: v.string(),
  },

  handler: async (_, { location }) => {
    return await getEnvironmentDashboardService(location);
  },
});

export const getEnvironmentDashboard = action({
  args: {
    location: v.string(),
  },

  handler: async (_, { location }) => {
    return await getEnvironmentDashboardService(location);
  },
});
