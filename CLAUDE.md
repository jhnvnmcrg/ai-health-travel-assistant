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

npm run typecheck         # both tsconfigs — app, then convex/
npm test                  # vitest, the pure modules only
npm run lint              # eslint flat config
npm run format            # prettier --write
```

Typecheck, lint, tests and `prettier --check` are all **clean** — treat any failure as new.

Three fixes made the typechecks possible and are easy to undo by accident:

- `tsconfig.json` carried `"ignoreDeprecations": "6.0"`, which TS 5.9 rejects outright, so `tsc` exited before reading a single file. Nothing needed the flag; it's gone.
- The vendored `badge`/`spinner` used `nativeStyleToProp`, deprecated in `react-native-css` v3 and typed as `undefined`. They now use `nativeStyleMapping` — that is what lets `<Spinner className="text-primary" />` reach the native `color` prop at all.
- [vitest.config.ts](vitest.config.ts) derives its root from `fileURLToPath(import.meta.url)` rather than `new URL(...)`. The app tsconfig resolves the DOM `URL`, which is not assignable to `node:url`'s.

`.prettierrc` sets `"endOfLine": "auto"` deliberately: the working tree is CRLF, and prettier's `lf` default flags all 46 checked-in files as unformatted without changing a single character of code.

Native modules are in play (`expo-secure-store`, `expo-location`, `@clerk/expo/native` UI), so a development build is required — `npx expo run:android` / `run:ios`, or an EAS build (`eas.json` defines `development`, `preview`, `production`).

### Environment variables

- `.env` (gitignored, client): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`. [lib/clerk.ts](lib/clerk.ts) throws at import if the Clerk key is missing.
- Convex deployment env (`npx convex env set` or the dashboard): `GEMINI_API_KEY` ([convex/ai/client.ts](convex/ai/client.ts)) and `CLERK_JWT_ISSUER_DOMAIN` ([convex/auth.config.ts](convex/auth.config.ts)).
- Clerk dashboard: a **JWT template named `convex`**. Without it (or without `CLERK_JWT_ISSUER_DOMAIN`) Convex never authenticates the session, every function sees no identity, and `(protected)/_layout.tsx` sits on its connecting spinner — it logs a console warning naming both after 6 seconds.

## Architecture

### Routing and auth

`app/` is expo-router file-based. [app/_layout.tsx](app/_layout.tsx) nests `ClerkProvider` → `ConvexProviderWithClerk` → `GluestackUIProvider`; the Clerk-aware Convex provider is what makes `ctx.auth` work server-side. [app/index.tsx](app/index.tsx) redirects on Clerk's `isSignedIn`.

Clerk usage follows the newer imperative API (`useSignIn().signIn.password()`, `signUp.verifications.verifyEmailCode()`, `signIn.finalize({ navigate })`), not the older `setActive`/`create` style. The Clerk skills in `.agents/skills/clerk*` are the reference for this.

[app/(auth)/sign-in.tsx](<app/(auth)/sign-in.tsx>) handles both post-password statuses, and they are not the same thing: `needs_client_trust` is new-device verification and always arrives by email, while `needs_second_factor` is real MFA and depends on what the account enrolled. The latter picks from `signIn.supportedSecondFactors` in `MFA_PREFERENCE` order (`totp` first — no round trip; `backup_code` last — using one spends it) and holds the choice in state, because the same code field then has to verify through a different `signIn.mfa.*` method. Only `phone_code`/`email_code` get a resend button; `totp`/`backup_code` are generated on the user's device, so there is nothing to resend.

[app/(auth)/sign-up.tsx](<app/(auth)/sign-up.tsx>) branches on `signUp.missingFields` before `unverifiedFields`, and that order matters. A Clerk instance can require fields this screen doesn't collect (a username, a phone number); gating the verify step on `missingFields.length === 0` sent those attempts back to the initial form, where the button appeared to do nothing. It now names what is still required. It also renders `StatusScreen` rather than `null` while `finalize` navigates — `null` is a blank screen for as long as that takes.

[app/(protected)/_layout.tsx](<app/(protected)/_layout.tsx>) is the single choke point for authenticated state. It redirects unauthenticated users to `/sign-in`, calls `users.syncUser` (an idempotent upsert), and **blocks rendering until Convex is authenticated and the user row exists** — so `useCurrentUser`/`useConversation` downstream never have to cope with a signed-in session that has no Convex `Id<"users">`. Both sign-in and sign-up finalize into `/home` and therefore through this layout; don't move the sync back into a single screen.

### Authorization model

Every Convex function derives identity from the verified JWT via the helpers in [convex/lib/auth.ts](convex/lib/auth.ts) (`requireIdentity`, `getAuthedUser`, `requireUser`, `requireConversation`, `getOwnedConversation`). **No function takes a `userId` or `clerkUserId` argument** — reintroducing one reopens the hole where any client could read or delete another user's conversations.

Two conventions worth preserving:

- **Mutations and actions throw** on missing identity or a non-owned conversation. `requireConversation` returns the same "Conversation not found." for missing and not-owned, so it can't be used to probe which ids exist.
- **Queries degrade** to `[]`/`null` instead of throwing, because a subscribed component can outlive the document it renders — `MessageList` re-queries a conversation the menu just deleted, and a throw there would crash the tree rather than render an empty list.

Anything only the server calls is `internalMutation`/`internalQuery`/`internalAction`, so it is unreachable from a client: the assistant-message writers in [convex/messages.ts](convex/messages.ts), `conversations.updateTitle`, the Gemini context and first-message queries, and both tool actions ([convex/environment.ts](convex/environment.ts), [convex/hospital.ts](convex/hospital.ts) — made public they would be an open geocoding/Overpass proxy). `messages.createMessage` is the only message writer a client can reach and is fixed to `role: "user"`.

### Chat data flow

`useChat` → `useCurrentUser` (Convex row from the JWT) → `useConversation`. The active conversation is the most recently updated one unless a selection overrides it, and the selection is re-validated against the live list every render, so deleting the conversation you were reading falls back instead of pointing at a missing document. A ref guard stops a duplicate create while one is in flight.

`listConversations` orders by the compound `by_user_updated` index — most recently _active_ first. Ordering on the implicit `_creationTime` instead would hand the UI the newest-created conversation rather than the one being used.

Sending a message ([hooks/useChat.ts](hooks/useChat.ts)):

1. `messages.createMessage` validates (non-empty, ≤ `MAX_MESSAGE_LENGTH`, per-user token bucket), takes the conversation's reply lock, inserts the user row, bumps `updatedAt`, and **schedules** `internal.chat.processUserMessage`. That is the whole of what the client awaits.
2. `chat.processUserMessage` is an `internalAction` — unreachable from a client, and running with no caller identity, which is why it reads the conversation through `internal.conversations.getById` instead of the ownership-checked public query. Step 1 did the ownership check before scheduling.
3. It creates the streaming row **first**, so "Checking conditions..." is on screen while the tools run rather than after them. Every failure from here on has a row to land in.
4. [convex/ai/orchestrator.ts](convex/ai/orchestrator.ts) loads `internal.messages.getConversationContext` (last `CONTEXT_MESSAGE_LIMIT` non-empty, non-error messages), builds the system instruction from the user's saved health conditions, and loops: generate → execute `functionCalls` via `toolRegistry` → append results → generate again, up to `MAX_TOOL_ROUNDS = 4`.
5. Streaming is **real** ([convex/ai/generate.ts](convex/ai/generate.ts) uses `generateContentStream`). Text is pushed to the row every `FLUSH_THRESHOLD_CHARS`, and `finishStreamingMessage` writes the canonical text plus `environmentalMetadata` and `nearbyHospitals`.

**The model's tool-calling turn is replayed verbatim, never reconstructed.** Gemini 3 attaches an opaque `thoughtSignature` to function-call parts, and it sits on the **`Part`**, not on the `FunctionCall` inside it. `generateChatTurn` therefore accumulates `chunk.candidates[0].content.parts` and hands them to `appendToolResults` as-is; building the turn from `functionCalls` instead loses the signature and the next request dies with `400 Function call is missing a thought_signature`. `__tests__/context.test.ts` pins this. For the same reason the stream is walked part by part rather than through the `chunk.text` / `chunk.functionCalls` getters — those return only the extracted values, and `chunk.text` also warns on every chunk mixing text with a tool call. Walking the parts is also what lets `thought: true` parts be excluded from the advice: they are reasoning summaries, not the reply.

Two things about the streaming that are load-bearing:

- **`onAdvice` receives the cumulative advice, not a delta**, and `updateStreamingMessage` patches the whole text. That makes the write idempotent, which is what lets a retried model turn overwrite the previous attempt instead of concatenating a second copy of the answer into the bubble.
- **Nothing is emitted until the `SAFETY_VERDICT` header has fully arrived.** That doubles as the gate keeping tool-calling turns silent: a turn that only calls tools never produces a header, so there is no flicker of partial text before the real answer.

Failures are visible rather than silent: a throwing tool or an exhausted Gemini retry marks the row via `failMessage`, and `useChat` surfaces `ConvexError` messages (rate limit, length) verbatim while anything else gets a generic line — plain `Error` messages are redacted in production, which is why the user-facing throws use `ConvexError`. `ChatMessage` renders `status === "error"` rows in rust instead of cream. Partial advice is kept but prefixed with a truncation notice: health advice that stops early may be missing the sentence that mattered.

### The reply lock

`conversations.respondingSince` is a timestamp, set by `createMessage` as it schedules the reply and cleared by `finishStreamingMessage`/`failMessage`. It does two jobs that a client-side "is it replying?" flag cannot:

- **Two turns can't interleave.** The check runs inside a mutation, so two races cannot both observe an unlocked conversation. Deriving this from the last message's status left a real window — `createMessage` returns before the scheduled action has created the streaming row, and a fast second send in that gap started a second generation on the same conversation.
- **A dead reply expires instead of wedging the thread.** If the action is killed before it can report anything (action timeout, a deploy landing mid-generation), the lock is stale rather than permanent: after `RESPONSE_TIMEOUT_MS` the next `createMessage` marks any stranded `streaming` row as errored and proceeds. `useChat` releases the composer on the same deadline via a single `setTimeout`, so the UI unlocks at the moment the server would accept a send. A boolean lock would have needed a cron to clean up; a timestamp needs nothing.

`RESPONSE_TIMEOUT_MS` and `MAX_MESSAGE_LENGTH` live in [lib/chatLimits.ts](lib/chatLimits.ts) — a dependency-free module, so importing it into `convex/` doesn't drag React Native into the server bundle.

Rate limiting is the `@convex-dev/rate-limiter` component, mounted in [convex/convex.config.ts](convex/convex.config.ts). The hand-rolled version it replaces counted recent rows inside the mutation, which races under concurrency and loses quota whenever a transaction rolls back. Adding a component means `npx convex codegen` (or `dev`) before `components.rateLimiter` exists in `_generated`.

`getConversationContext` appends a compact `[Already fetched this conversation — …]` line to any assistant message carrying `environmentalMetadata`. That text exists only in the model's context, never in the database and never on screen; it is what lets "what about tomorrow?" reuse a reading instead of re-geocoding.

### AI tools

Declared as Gemini `FunctionDeclaration`s in [convex/ai/tools.ts](convex/ai/tools.ts) / [convex/ai/hospitalTool.ts](convex/ai/hospitalTool.ts), wired to internal Convex actions in [convex/ai/toolRegistry.ts](convex/ai/toolRegistry.ts). Adding a tool means touching three places: declaration, registry entry, and the action itself — plus the `AVAILABLE TOOLS` section of [convex/ai/systemPrompt.ts](convex/ai/systemPrompt.ts).

- `fetch_location_environment_data` → `internal.environment.fetchLocationEnvironmentData`: Nominatim geocode (the query appends `, Philippines`), then Open-Meteo forecast, air-quality and elevation in parallel ([convex/services/environmentService.ts](convex/services/environmentService.ts)). Heat index is computed locally by [convex/utils/heatIndex.ts](convex/utils/heatIndex.ts) (NWS Rothfusz regression).
- `search_nearby_hospitals` → [convex/hospital.ts](convex/hospital.ts): Overpass API, 10km radius, three mirror endpoints tried in order, 15s abort timeout. On total failure it returns `{ hospitals: [], error }` instead of throwing — the system prompt instructs the model to report "lookup temporarily unavailable" rather than "no hospitals nearby".

**A failing tool does not fail the turn.** [convex/ai/orchestrator.ts](convex/ai/orchestrator.ts) catches whatever a tool throws and feeds it back to the model as `{ error }`, so the model can respond to it. Letting it propagate meant a mistyped place name — "Bagiuo" — surfaced as "Sorry, please send your message again", which hid the real problem and advised the one thing guaranteed to fail identically. The messages thrown by [environmentService.ts](convex/services/environmentService.ts) are written to be read by the model for this reason: `Location not found: Bagiuo` carries enough for it to suggest the spelling. The `WHEN A TOOL FAILS` block in the prompt tells it how to distinguish a bad place name from a downed feed, and `MAX_TOOL_ROUNDS` still bounds any retry loop that follows.

Two things in the environment tool exist for reasons that are not obvious from the code:

- **Geocode results are cached** in the `geocodeCache` table for 30 days, keyed on the normalized query. Nominatim's usage policy caps callers at roughly one request a second and asks that results be cached; place coordinates never move, so the TTL is about the policy, not freshness. Live conditions are deliberately **not** cached.
- **Weather is required, air quality and elevation are not.** If either enrichment feed is down the advice is still worth giving with fewer metrics beside it. Temperature and humidity are different — they drive the heat index, which is the headline risk in this climate.

Every measurement is optional all the way through (`Conditions`, the schema validator, `EnvironmentSummary`). The feeds genuinely return null for some coordinates, and the previous `?? 0` turned "we don't know" into `pm25: 0`, which renders as pristine air.

### The response contract

The model returns **plain text**, not JSON: a `SAFETY_VERDICT: <verdict>` header line, a blank line, then prose. `AIResponse` in [convex/ai/types.ts](convex/ai/types.ts) is those two fields and nothing else.

That is the whole contract, because **the model no longer transcribes any data**. `environmentalMetadata` and `nearbyHospitals` are captured straight off the tool results by [convex/ai/orchestrator.ts](convex/ai/orchestrator.ts) and written by [convex/chat.ts](convex/chat.ts). An LLM never re-types a heat index or a hospital's coordinates, so there is no prompt-side mirror of `environmentalMetadataValidator` to keep in sync — only [convex/schema.ts](convex/schema.ts), which [convex/messages.ts](convex/messages.ts) imports so the validators exist once.

This replaced a design where the prompt asked the model to copy 11 floats out of the tool result into its own JSON. The tell that it never really worked: `chat.ts` used to carry a `COORDINATE_TOLERANCE` heuristic to check the model's reported coordinates against the geocoder's before trusting a place name. Both are gone.

Plain text also buys the streaming. JSON has to arrive complete before any of it can be shown; a header line settles in the first few tokens and everything after it is the answer. It removes a failure class too — no brace matching, and no "the model wrote a trailing comma so the health advice is unparseable".

Attribution rules, enforced server-side in `orchestrator.ts`:

- `environmentalMetadata` is attached **only when the turn resolved exactly one place**. "Compare Baguio and Davao" gets prose covering both and no metric strip, because one strip cannot honestly be labelled with two places.
- `nearbyHospitals` needs exactly one hospital search, and if there is also an environmental reading the search origin must agree with it within `HOSPITAL_ORIGIN_TOLERANCE` (~2km). The UI measures distances from the environmental reading, so a search run against different coordinates would render distances that mean nothing.

Every fallback in [convex/ai/parseResponse.ts](convex/ai/parseResponse.ts) forces `safetyVerdict: "Caution"` — unparseable health advice must never be labelled `"Safe"` — and the header only matches at position 0, so a `SAFETY_VERDICT:` appearing mid-prose cannot be mistaken for one.

The three persisted fields are rendered by [components/ChatMessage.tsx](components/ChatMessage.tsx): `safetyVerdict` as a chip ([SafetyVerdict.tsx](components/SafetyVerdict.tsx)), `environmentalMetadata` as a metric strip ([EnvironmentSummary.tsx](components/EnvironmentSummary.tsx)), and `nearbyHospitals` as a ranked list ([NearbyHospitals.tsx](components/NearbyHospitals.tsx)).

### Conversation titles

`chat.generateTitle` is scheduled by `createMessage`, not awaited inside `processUserMessage`. It is a second model round trip, and running it inline meant the first message of every conversation sat on "Checking conditions..." while a title the user cannot see yet was written. A missing title is cosmetic; it must not cost the reply latency, and it must not be able to fail the reply.

`createConversation` reuses the most recent conversation when nothing has been said in it. "New chat" is a button someone can press three times in a row, and each press would otherwise leave an identical empty thread in the switcher.

### The health profile

`users.healthConditions` is appended to the system instruction on **every** turn by `buildSystemInstruction` in [convex/ai/systemPrompt.ts](convex/ai/systemPrompt.ts), not replayed as a message. The conversation window is finite, so "I have asthma" said once would otherwise scroll out and stop informing the advice — in an app whose prompt opens by telling the model to weigh the user's health conditions. Edited from [components/HealthProfileSheet.tsx](components/HealthProfileSheet.tsx).

### Models

`gemini-3.5-flash-lite` for chat, streamed, with up to 3 attempts ([convex/ai/generate.ts](convex/ai/generate.ts)); `gemini-2.5-flash` for conversation titles ([convex/ai/generateConversationTitle.ts](convex/ai/generateConversationTitle.ts)).

Retries are **classified**, not blanket: only 408/429/5xx and status-less network failures are retried. A 400 — a malformed request, or an unknown model id — is just as invalid on the third attempt, and retrying it turns a fast failure into a slow one.

### Query shape

`convex/_generated/ai/guidelines.md` is the authority here and is worth reading before touching `convex/`. Three of its rules bit this codebase:

- **No unbounded `.collect()`.** `getConversationContext` read the entire thread to keep the last 20 messages of it, on every turn. It now scans newest-first with the exclusions pushed into the index scan and `.take(CONTEXT_MESSAGE_LIMIT)`. `listMessages` and `listConversations` are bounded too — past `MESSAGE_HISTORY_LIMIT` the oldest messages stop being fetched, which is the point to paginate if threads ever get that long.
- **No wall clock in a query.** A query is not rerun merely because time passed, so a freshness test inside one can answer from a moment that has gone. `environment.readGeocodeCache` returns the entry and its `fetchedAt`; the **action** compares it against `GEOCODE_TTL_MS`.
- **Batch large deletes.** `deleteConversation` removes the conversation row (which is what makes it vanish from the UI, since `listMessages` resolves ownership through it) and then schedules `deleteMessageBatch` to clear messages `DELETE_BATCH_SIZE` at a time. Deleting them all in one mutation would fail the whole delete on a long thread rather than part of it.

One guideline is knowingly not followed: `convex/lib/auth.ts` keys identity on `identity.subject` where the guidelines prefer `tokenIdentifier`. The schema is keyed on `clerkUserId`, so changing it is a data migration, and `subject` is stable within a single Clerk instance — the guideline is about uniqueness across providers.

## Testing

`npm test` runs vitest over `__tests__/`, and covers the pure modules only: `parseAIResponse` (including that no fallback path can return `"Safe"`, and that the streaming gate refuses a header without its newline), `calculateHeatIndex` (pinned to published NWS table values, converted to Celsius, rather than to whatever the implementation returned the day it was written), and `lib/geo.ts`.

Anything touching Convex, React Native or the network needs a different harness and is deliberately not faked.

## Styling

NativeWind v5 preview + Tailwind v4 CSS-first, **semantic tokens only**. There are no hex values or numbered colours left in `app/`, `components/` (outside `components/ui/**`), `hooks/`, or `lib/`; a grep for `#[0-9A-Fa-f]{3,6}` outside `components/ui/` should stay empty. Reintroducing a hex breaks dark mode silently, which is why the rule is absolute rather than stylistic.

Tokens live in [global.css](global.css): `@layer theme` CSS variables → `@theme inline` → `--color-*` utilities. There is no `tailwind.config.js` despite the alias for one in [babel.config.js](babel.config.js). Beyond the stock shadcn-style set, three verdict tokens were added, each with a **solid** `-subtle` companion so chips never depend on alpha compositing in this preview build:

| token                                | carries                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `success` / `success-subtle`         | `safetyVerdict: "Safe"`                                   |
| `warning` / `warning-subtle`         | `safetyVerdict: "Caution"`                                |
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

Feature components compose `Box`/`VStack`/`HStack`/`Text`/`Heading` and `Icon as={LucideIcon}` from `components/ui`. Deliberate exceptions: `MessageList` and `ConversationSheet` use raw `FlatList`s (list virtualisation), and `MenuHeader`/`SheetModal` keep RN `TouchableOpacity`/`Pressable`/`Modal` — `MenuHeader`'s oversized backdrop `Pressable` is intentional, since the dropdown is absolutely positioned inside the header and `inset-0` would only cover the header itself.

`MessageList` also follows new content via `onContentSizeChange`, but only while the user is within `NEAR_BOTTOM_THRESHOLD` of the end — a streaming reply changes content height constantly, so an unconditional `scrollToEnd` would yank the view down while someone is re-reading history.

Three shells exist so layout doesn't get re-authored per screen: the four auth layouts (sign-in, its MFA step, sign-up, its verification step) share [components/AuthScreen.tsx](components/AuthScreen.tsx) (`AuthScreen` + `AuthField`); [components/StatusScreen.tsx](components/StatusScreen.tsx) is the full-screen spinner/message used by both `app/index.tsx` (Clerk's first frame) and the protected layout's auth-and-sync gate; and [components/SheetModal.tsx](components/SheetModal.tsx) backs the two sheets reachable from the header menu ([ConversationSheet.tsx](components/ConversationSheet.tsx), [HealthProfileSheet.tsx](components/HealthProfileSheet.tsx)).

`MenuHeader` takes the conversation list and the selection callbacks as props rather than querying for them, so `useConversation` stays the single owner of which conversation is active.

### Accessibility

Almost everything this app conveys visually is conveyed by _colour or position_, which is exactly what a screen reader cannot see. Three places carry explicit labels for that reason, and they are easy to strip out by accident:

- **`EnvironmentSummary`** labels each metric as one node (`accessible` + `Heat index: 41°C`). Left as two loose `Text`s, the strip reads as nine unattached fragments with nothing joining a label to its value.
- **`SafetyVerdict`** and `status: "error"` rows announce what they _mean_ ("Safety verdict: Caution", `accessibilityRole="alert"`), because the rust/amber/green distinction is the entire signal otherwise.
- **`ChatMessage`** restates the speaker ("You said:" / "Assistant:"), since who said what is carried only by alignment and background.

Do **not** put `accessible={true}` on the assistant `VStack` — it collapses the verdict chip, metric strip and hospital list into a single unreadable node.

[components/ui/gluestack-ui-provider/config.ts](components/ui/gluestack-ui-provider/config.ts) holds a hand-authored v4-style `vars()` palette (`--color-primary-500` etc.) that nothing imports — the live system is `global.css`. Don't style against those names.

`expo-location` is used by [hooks/useDeviceLocation.ts](hooks/useDeviceLocation.ts), behind the map-pin button in the composer. It stops at a **place name** rather than passing coordinates through: `fetch_location_environment_data` takes a location string, and a name is also what the user needs to see to know the advice is about where they actually are. It fills the composer rather than sending, so the question stays editable.

## Skills

`.agents/skills/` holds vendored Clerk and gluestack-ui skills tracked with hashes in `skills-lock.json` — treat them as generated; don't hand-edit. `.claude/settings.json` enables the official `expo` plugin.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
