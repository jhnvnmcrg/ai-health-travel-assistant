import { ApiError, type Content, type FunctionCall } from "@google/genai";
import { gemini } from "./client";
import { environmentTool } from "./tools";
import { hospitalTool } from "./hospitalTool";
import { readVerdictHeader, stripLeadingFence } from "./parseResponse";

export const CHAT_MODEL = "gemini-3.5-flash-lite";

const MAX_ATTEMPTS = 3;

/**
 * How much new advice has to accumulate before it is pushed to the client.
 * Every push is a Convex mutation, so this trades write count against how
 * smoothly the reply appears — small enough to read as typing, large enough
 * that a long answer costs tens of writes rather than hundreds.
 */
const FLUSH_THRESHOLD_CHARS = 80;

export type ChatTurn = {
  /** Raw model text for this turn, fences and header included. */
  text: string;
  functionCalls: FunctionCall[];
};

/**
 * Retrying a 400 never helps — a malformed request or an unknown model id is
 * just as invalid the third time, and burning three attempts on it turns a
 * fast failure into a slow one. Only transient conditions are worth another go.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }

  const status = (error as { status?: unknown })?.status;

  if (typeof status === "number") {
    return status === 408 || status === 429 || status >= 500;
  }

  // Network-level failures arrive with no status at all.
  const message = error instanceof Error ? error.message : String(error);

  return /network|fetch failed|timed? ?out|ECONN|EAI_AGAIN|socket/i.test(
    message,
  );
}

/**
 * Runs one model turn, streaming the advice out as it arrives.
 *
 * `onAdvice` receives the **cumulative** advice so far, not a delta. That is
 * deliberate: the consumer writes the whole string each time, so a retry that
 * restarts the turn simply overwrites what the previous attempt had emitted
 * instead of appending a second copy of the answer.
 *
 * Nothing is emitted until the SAFETY_VERDICT header has fully arrived, which
 * doubles as the gate that keeps tool-calling turns silent — a turn that only
 * calls tools never produces a header, so the user sees the thinking
 * placeholder rather than a flicker of partial text.
 */
export async function generateChatTurn(
  history: Content[],
  systemInstruction: string,
  onAdvice?: (adviceSoFar: string) => Promise<void>,
): Promise<ChatTurn> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let text = "";
    const functionCalls: FunctionCall[] = [];
    let flushedLength = 0;

    try {
      const stream = await gemini.models.generateContentStream({
        model: CHAT_MODEL,
        config: {
          systemInstruction,
          tools: [
            {
              functionDeclarations: [environmentTool, hospitalTool],
            },
          ],
        },

        contents: history,
      });

      for await (const chunk of stream) {
        text += chunk.text ?? "";

        const calls = chunk.functionCalls ?? [];
        if (calls.length > 0) {
          functionCalls.push(...calls);
        }

        if (!onAdvice || functionCalls.length > 0) {
          continue;
        }

        const body = stripLeadingFence(text);
        const header = readVerdictHeader(body);

        if (!header) {
          continue;
        }

        const advice = body.slice(header.endIndex);

        if (advice.length - flushedLength >= FLUSH_THRESHOLD_CHARS) {
          flushedLength = advice.length;
          await onAdvice(advice.trimStart());
        }
      }

      return { text, functionCalls };
    } catch (error) {
      lastError = error;

      console.warn(`Gemini attempt ${attempt} failed.`, error);

      if (!isRetryable(error)) {
        throw error;
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
}
