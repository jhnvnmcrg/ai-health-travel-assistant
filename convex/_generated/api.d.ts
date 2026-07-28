/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_client from "../ai/client.js";
import type * as ai_context from "../ai/context.js";
import type * as ai_generate from "../ai/generate.js";
import type * as ai_generateConversationTitle from "../ai/generateConversationTitle.js";
import type * as ai_hospitalTool from "../ai/hospitalTool.js";
import type * as ai_orchestrator from "../ai/orchestrator.js";
import type * as ai_parseResponse from "../ai/parseResponse.js";
import type * as ai_systemPrompt from "../ai/systemPrompt.js";
import type * as ai_toolRegistry from "../ai/toolRegistry.js";
import type * as ai_tools from "../ai/tools.js";
import type * as ai_types from "../ai/types.js";
import type * as chat from "../chat.js";
import type * as context from "../context.js";
import type * as conversations from "../conversations.js";
import type * as environment from "../environment.js";
import type * as hospital from "../hospital.js";
import type * as messages from "../messages.js";
import type * as services_environmentService from "../services/environmentService.js";
import type * as users from "../users.js";
import type * as utils_heatIndex from "../utils/heatIndex.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/client": typeof ai_client;
  "ai/context": typeof ai_context;
  "ai/generate": typeof ai_generate;
  "ai/generateConversationTitle": typeof ai_generateConversationTitle;
  "ai/hospitalTool": typeof ai_hospitalTool;
  "ai/orchestrator": typeof ai_orchestrator;
  "ai/parseResponse": typeof ai_parseResponse;
  "ai/systemPrompt": typeof ai_systemPrompt;
  "ai/toolRegistry": typeof ai_toolRegistry;
  "ai/tools": typeof ai_tools;
  "ai/types": typeof ai_types;
  chat: typeof chat;
  context: typeof context;
  conversations: typeof conversations;
  environment: typeof environment;
  hospital: typeof hospital;
  messages: typeof messages;
  "services/environmentService": typeof services_environmentService;
  users: typeof users;
  "utils/heatIndex": typeof utils_heatIndex;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
