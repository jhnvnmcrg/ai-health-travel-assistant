import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getEnvironmentDashboardService } from "./services/environmentService";

/**
 * Internal: reached only through the Gemini tool loop
 * (convex/ai/toolRegistry.ts). Public would let anyone use this deployment as
 * a free geocoding/weather proxy.
 */
export const fetchLocationEnvironmentData = internalAction({
  args: {
    location: v.string(),
  },

  handler: async (_, { location }) => {
    return await getEnvironmentDashboardService(location);
  },
});
