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
import type * as ai_systemPrompt from "../ai/systemPrompt.js";
import type * as ai_types from "../ai/types.js";
import type * as chat from "../chat.js";
import type * as context from "../context.js";
import type * as conversations from "../conversations.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as messages from "../messages.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/client": typeof ai_client;
  "ai/context": typeof ai_context;
  "ai/generate": typeof ai_generate;
  "ai/systemPrompt": typeof ai_systemPrompt;
  "ai/types": typeof ai_types;
  chat: typeof chat;
  context: typeof context;
  conversations: typeof conversations;
  "lib/gemini": typeof lib_gemini;
  messages: typeof messages;
  users: typeof users;
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
