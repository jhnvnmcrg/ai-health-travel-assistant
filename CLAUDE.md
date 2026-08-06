# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Expo (SDK 54) React Native chat app: a Philippines-focused travel-health advisor. Clerk handles auth, Convex is the backend/database, and Google Gemini (`@google/genai`) runs inside Convex actions with function calling for live environmental and hospital data.

## Commands

```bash
npm start                 # expo start (Metro) — connects to a dev client, not Expo Go
npm run android           # expo start --android
npm run ios               # expo start --ios
npm run web               # expo start --web
npx convex dev            # REQUIRED alongside Metro: runs backend + regenerates convex/_generated
npx tsc --noEmit          # typecheck the app
npx tsc --noEmit -p convex/tsconfig.json   # typecheck convex/ (also done by convex dev)
```

There is no test suite and no eslint/prettier config file (both are devDependencies only, with no scripts).

Both typechecks are **clean** — treat any error as new. Two fixes made that possible and are easy to undo by accident:

- `tsconfig.json` carried `"ignoreDeprecations": "6.0"`, which TS 5.9 rejects outright, so `tsc` exited before reading a single file. Nothing needed the flag; it's gone.
- The vendored `badge`/`spinner` used `nativeStyleToProp`, deprecated in `react-native-css` v3 and typed as `undefined`. They now use `nativeStyleMapping` — that is what lets `<Spinner className="text-primary" />` reach the native `color` prop at all.

Native modules are in play (`expo-secure-store`, `expo-location`, `@clerk/expo/native` UI), so a development build is required — `npx expo run:android` / `run:ios`, or an EAS build (`eas.json` defines `development`, `preview`, `production`).

### Environment variables

- `.env` (gitignored, client): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`. [lib/clerk.ts](lib/clerk.ts) throws at import if the Clerk key is missing.
- Convex deployment env (`npx convex env set` or the dashboard): `GEMINI_API_KEY` ([convex/ai/client.ts](convex/ai/client.ts)) and `CLERK_JWT_ISSUER_DOMAIN` ([convex/auth.config.ts](convex/auth.config.ts)).
- Clerk dashboard: a **JWT template named `convex`**. Without it (or without `CLERK_JWT_ISSUER_DOMAIN`) Convex never authenticates the session, every function sees no identity, and `(protected)/_layout.tsx` sits on its connecting spinner — it logs a console warning naming both after 6 seconds.

## Architecture

### Routing and auth

`app/` is expo-router file-based. [app/_layout.tsx](app/_layout.tsx) nests `ClerkProvider` → `ConvexProviderWithClerk` → `GluestackUIProvider`; the Clerk-aware Convex provider is what makes `ctx.auth` work server-side. [app/index.tsx](app/index.tsx) redirects on Clerk's `isSignedIn`.

Clerk usage follows the newer imperative API (`useSignIn().signIn.password()`, `signUp.verifications.verifyEmailCode()`, `signIn.finalize({ navigate })`), not the older `setActive`/`create` style. The Clerk skills in `.agents/skills/clerk*` are the reference for this.

[app/(protected)/_layout.tsx](app/(protected)/_layout.tsx) is the single choke point for authenticated state. It redirects unauthenticated users to `/sign-in`, calls `users.syncUser` (an idempotent upsert), and **blocks rendering until Convex is authenticated and the user row exists** — so `useCurrentUser`/`useConversation` downstream never have to cope with a signed-in session that has no Convex `Id<"users">`. Both sign-in and sign-up finalize into `/home` and therefore through this layout; don't move the sync back into a single screen.

### Authorization model

Every Convex function derives identity from the verified JWT via the helpers in [convex/lib/auth.ts](convex/lib/auth.ts) (`requireIdentity`, `getAuthedUser`, `requireUser`, `requireConversation`, `getOwnedConversation`). **No function takes a `userId` or `clerkUserId` argument** — reintroducing one reopens the hole where any client could read or delete another user's conversations.

Two conventions worth preserving:

- **Mutations and actions throw** on missing identity or a non-owned conversation. `requireConversation` returns the same "Conversation not found." for missing and not-owned, so it can't be used to probe which ids exist.
- **Queries degrade** to `[]`/`null` instead of throwing, because a subscribed component can outlive the document it renders — `MessageList` re-queries a conversation the menu just deleted, and a throw there would crash the tree rather than render an empty list.

Anything only the server calls is `internalMutation`/`internalQuery`/`internalAction`, so it is unreachable from a client: the assistant-message writers in [convex/messages.ts](convex/messages.ts), `conversations.updateTitle`, the Gemini context query, and both tool actions ([convex/environment.ts](convex/environment.ts), [convex/hospital.ts](convex/hospital.ts) — public, those are an open geocoding/Overpass proxy). `messages.createMessage` is the only message writer a client can reach and is fixed to `role: "user"`.

### Chat data flow

`useChat` → `useCurrentUser` (Convex row from the JWT) → `useConversation` (most recent conversation, or creates one; a ref guard stops a duplicate create while one is in flight). The UI is effectively single-conversation: `useConversation` and `MenuHeader` both use `conversations[0]`; there is no conversation list/switcher.

Sending a message ([hooks/useChat.ts](hooks/useChat.ts)):

1. `messages.createMessage` inserts the user row and bumps `conversation.updatedAt`.
2. `chat.processUserMessage` action runs. Its first call is `api.conversations.getConversation`, which throws unless the caller owns the conversation — that is the ownership gate for everything after it, which is why the internal mutations below don't re-check.
3. [convex/ai/orchestrator.ts](convex/ai/orchestrator.ts) loads `internal.messages.getConversationContext` (**last 5 non-empty, non-error messages, `role` + `text` only**), converts to Gemini `Content[]`, and loops: generate → execute any `functionCalls` via `toolRegistry` → append results → generate again, up to `MAX_TOOL_ROUNDS = 4`.
4. [convex/ai/parseResponse.ts](convex/ai/parseResponse.ts) strips code fences, slices the outermost `{…}`, and validates `advice` + `safetyVerdict`; any failure falls back to `{ advice: rawText, safetyVerdict: "Caution" }` — unparseable health advice must not be labelled `"Safe"`.
5. Streaming is **simulated server-side** in [convex/chat.ts](convex/chat.ts): `createStreamingMessage` → `appendToStreamingMessage` in 40-char chunks every 40ms → `finishStreamingMessage` attaches `environmentalMetadata` + `nearbyHospitals`. The client "streams" purely through Convex query reactivity in `MessageList`. The reply is fully generated before the loop starts, so chunk size is a pure cost knob — one mutation per chunk.

Failures are visible rather than silent: a throwing tool or exhausted Gemini retry writes an assistant row with `status: "error"` (`createErrorMessage`), a mid-stream failure marks the partial row via `failMessage`, and `useChat` exposes an `error` string that `home.tsx` shows above the composer. `ChatMessage` renders `status === "error"` rows in rust instead of cream.

Consequence of step 3: tool results and stored `environmentalMetadata` are **not** replayed into later turns — the model only ever sees plain message text, so it re-calls tools when it needs data again.

### AI tools

Declared as Gemini `FunctionDeclaration`s in [convex/ai/tools.ts](convex/ai/tools.ts) / [convex/ai/hospitalTool.ts](convex/ai/hospitalTool.ts), wired to internal Convex actions in [convex/ai/toolRegistry.ts](convex/ai/toolRegistry.ts). Adding a tool means touching three places: declaration, registry entry, and the action itself — plus the `AVAILABLE TOOLS` section of [convex/ai/systemPrompt.ts](convex/ai/systemPrompt.ts).

- `fetch_location_environment_data` → `internal.environment.fetchLocationEnvironmentData` → [convex/services/environmentService.ts](convex/services/environmentService.ts): Nominatim geocode (query is hard-coded to append `, Philippines`), then Open-Meteo forecast, air-quality, and elevation. Heat index is computed locally by [convex/utils/heatIndex.ts](convex/utils/heatIndex.ts) (NWS Rothfusz regression). All fetch failures throw, and now surface as an error message row.
- `search_nearby_hospitals` → [convex/hospital.ts](convex/hospital.ts): Overpass API, 10km radius, three mirror endpoints tried in order, 15s abort timeout. On total failure it returns `{ hospitals: [], error }` instead of throwing — the system prompt instructs the model to report "lookup temporarily unavailable" rather than "no hospitals nearby".

### The response contract lives in three places

The AI must return JSON matching the schema spelled out in [convex/ai/systemPrompt.ts](convex/ai/systemPrompt.ts) (`RESPONSE FORMAT` section). The same shape is mirrored in:

- [convex/ai/types.ts](convex/ai/types.ts) — `AIResponse` (the TypeScript view)
- [convex/schema.ts](convex/schema.ts) — `environmentalMetadataValidator` / `nearbyHospitalsValidator`, exported and imported by [convex/messages.ts](convex/messages.ts) so the Convex validators exist once. The stored metadata carries two fields the model never sends: `safetyVerdict` (merged in from the top-level field) and `locationName` (from the geocoder) — both added by [convex/chat.ts](convex/chat.ts).

Adding or renaming an environmental field means editing the prompt, `AIResponse`, and the schema validator — miss the validator and Convex rejects the write at runtime.

All three persisted fields are rendered by [components/ChatMessage.tsx](components/ChatMessage.tsx): `safetyVerdict` as a chip ([SafetyVerdict.tsx](components/SafetyVerdict.tsx)), `environmentalMetadata` as a metric strip ([EnvironmentSummary.tsx](components/EnvironmentSummary.tsx)), and `nearbyHospitals` as a ranked list ([NearbyHospitals.tsx](components/NearbyHospitals.tsx)). Hospital distances are derived from the stored coordinates via [lib/geo.ts](lib/geo.ts), so they only appear when the same reply also carries environmental metadata to measure from.

`environmentalMetadata.locationName` is the **geocoder's** name for what it matched, captured from the tool result by [convex/ai/orchestrator.ts](convex/ai/orchestrator.ts) and attached in [convex/chat.ts](convex/chat.ts) — never echoed back by the model. When one turn resolves several places, the model's reported coordinates must agree with a lookup within ~5km (`COORDINATE_TOLERANCE`) or the name is dropped: mislabelling health advice with the wrong place is worse than showing no place at all.

### Models

`gemini-3.5-flash-lite` for chat with 3 retries and linear backoff ([convex/ai/generate.ts](convex/ai/generate.ts)); `gemini-2.5-flash` for conversation titles ([convex/ai/generateConversationTitle.ts](convex/ai/generateConversationTitle.ts)).

## Styling

NativeWind v5 preview + Tailwind v4 CSS-first, **semantic tokens only**. There are no hex values or numbered colours left in `app/`, `components/` (outside `components/ui/**`), `hooks/`, or `lib/`; a grep for `#[0-9A-Fa-f]{3,6}` outside `components/ui/` should stay empty. Reintroducing a hex breaks dark mode silently, which is why the rule is absolute rather than stylistic.

Tokens live in [global.css](global.css): `@layer theme` CSS variables → `@theme inline` → `--color-*` utilities. There is no `tailwind.config.js` despite the alias for one in [babel.config.js](babel.config.js). Beyond the stock shadcn-style set, three verdict tokens were added, each with a **solid** `-subtle` companion so chips never depend on alpha compositing in this preview build:

| token | carries |
| --- | --- |
| `success` / `success-subtle` | `safetyVerdict: "Safe"` |
| `warning` / `warning-subtle` | `safetyVerdict: "Caution"` |
| `destructive` / `destructive-subtle` | `safetyVerdict: "High Risk"`, plus `status: "error"` rows |

Adding a token means editing four blocks in `@layer theme` (`:root`, the `prefers-color-scheme: dark` media query, `:root.dark`, `:root.light`) plus one in `@theme inline`. Miss the dark blocks and the colour silently stays light.

### Dark mode

Three things have to line up; it breaks if any one regresses:

1. [app.json](app.json) — `userInterfaceStyle: "automatic"`. It was `"light"`, which pins iOS to light no matter what the tokens say.
2. [app/_layout.tsx](app/_layout.tsx) — `GluestackUIProvider mode="system"`.
3. [components/ui/gluestack-ui-provider/index.tsx](components/ui/gluestack-ui-provider/index.tsx) — patched. The vendored copy passed `mode` straight into `Appearance.setColorScheme`, which throws an invariant on anything but `'light' | 'dark' | null`, so `"system"` crashed. It now maps `"system"` → `null`, which is what hands control back to the OS.

### Components

`components/ui/**` are gluestack-ui v5 primitives copied into the repo (with `.web.tsx` platform variants and `styles.tsx` `tva` definitions) — prefer regenerating via `npx gluestack-ui@latest add <component>` over hand-editing. Three carry local fixes a regeneration would wipe: the provider patch above, and `nativeStyleMapping` in `badge`/`spinner`.

The vendored `Input` defines **no** `size`/`variant` variants — passing them is a type error and does nothing at runtime. Style it with `className`, and let its base style supply the placeholder colour instead of passing `placeholderTextColor` (which needs a raw colour value).

Feature components compose `Box`/`VStack`/`HStack`/`Text`/`Heading` and `Icon as={LucideIcon}` from `components/ui`. Two deliberate exceptions: `MessageList` uses a raw `FlatList` (list virtualisation), and `MenuHeader` keeps RN `TouchableOpacity`/`Pressable`/`Modal` — its oversized backdrop `Pressable` is intentional, since the dropdown is absolutely positioned inside the header and `inset-0` would only cover the header itself.

`MessageList` also follows new content via `onContentSizeChange`, but only while the user is within `NEAR_BOTTOM_THRESHOLD` of the end — replies arrive in ~40-char chunks, so an unconditional `scrollToEnd` would yank the view down while someone is re-reading history.

Two shells exist so layout doesn't get re-authored per screen: the four auth layouts (sign-in, its MFA step, sign-up, its verification step) share [components/AuthScreen.tsx](components/AuthScreen.tsx) (`AuthScreen` + `AuthField`), and [components/StatusScreen.tsx](components/StatusScreen.tsx) is the full-screen spinner/message used by both `app/index.tsx` (Clerk's first frame) and the protected layout's auth-and-sync gate.

[components/ui/gluestack-ui-provider/config.ts](components/ui/gluestack-ui-provider/config.ts) holds a hand-authored v4-style `vars()` palette (`--color-primary-500` etc.) that nothing imports — the live system is `global.css`. Don't style against those names.

`expo-location` is installed and declared in [app.json](app.json) with a permission string, but nothing imports it yet.

## Skills

`.agents/skills/` holds vendored Clerk and gluestack-ui skills tracked with hashes in `skills-lock.json` — treat them as generated; don't hand-edit. `.claude/settings.json` enables the official `expo` plugin.
