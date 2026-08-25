import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * What a tool knows about the turn it is running in, beyond its own arguments.
 *
 * `save_trip` needs the conversation so the reminder it schedules knows where
 * to write itself back to. Passed separately from `args` because it comes from
 * the server, never from the model.
 */
export type ToolContext = {
  conversationId: Id<"conversations">;
};

export type ToolExecutor = (
  ctx: ActionCtx,
  args: Record<string, unknown>,
  toolContext: ToolContext,
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

  async search_nearby_hospitals(ctx, args) {
    return await ctx.runAction(internal.hospital.searchNearbyHospitals, {
      latitude: args.latitude as number,
      longitude: args.longitude as number,
    });
  },

  async find_safe_places(ctx, args) {
    return await ctx.runAction(internal.safePlaces.findSafePlaces, {
      latitude: args.latitude as number,
      longitude: args.longitude as number,
    });
  },

  async show_destination_on_map(ctx, args) {
    return await ctx.runAction(internal.destination.resolveDestination, {
      origin: args.origin as string | undefined,
      originLatitude: args.originLatitude as number | undefined,
      originLongitude: args.originLongitude as number | undefined,
      destination: args.destination as string | undefined,
    });
  },

  async save_trip(ctx, args, { conversationId }) {
    return await ctx.runMutation(internal.trips.saveTrip, {
      conversationId,
      destination: args.destination as string,
      tripDate: args.tripDate as string,
    });
  },
};
