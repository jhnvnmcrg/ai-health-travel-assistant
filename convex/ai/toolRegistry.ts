import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export type ToolExecutor = (
  ctx: ActionCtx,
  args: Record<string, unknown>,
) => Promise<unknown>;

export const toolRegistry: Record<string, ToolExecutor> = {
  async fetch_location_environment_data(ctx, args) {
    return await ctx.runAction(
      internal.environment.fetchLocationEnvironmentData,
      {
        location: args.location as string | undefined,
        latitude: args.latitude as number | undefined,
        longitude: args.longitude as number | undefined,
      },
    );
  },

  async find_safe_places(ctx, args) {
    return await ctx.runAction(internal.safePlaces.findSafePlaces, {
      latitude: args.latitude as number,
      longitude: args.longitude as number,
    });
  },

  async search_nearby_hospitals(ctx, args) {
    return await ctx.runAction(internal.hospital.searchNearbyHospitals, {
      latitude: args.latitude as number,
      longitude: args.longitude as number,
    });
  },
};
