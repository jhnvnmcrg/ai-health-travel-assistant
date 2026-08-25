/**
 * Which captured tool results a reply is allowed to render.
 *
 * Pure and dependency-free so the rules can be tested — they are stated in
 * CLAUDE.md as guarantees that "do not depend on the model agreeing", and both
 * of the ones here have already been got wrong once by counting the wrong
 * thing.
 */

/**
 * The destination pin, or nothing.
 *
 * Both guards count tool **attempts** rather than captured results, and that
 * distinction is the whole point of this module. A tool that throws is caught
 * by the orchestrator and handed back to the model as `{ error }`, capturing
 * nothing — so a rule written against the captured array silently disengages
 * in exactly the failure cases it was written for.
 *
 * `safePlaceAttempts` is the important one, and it is the guard that does not
 * depend on the model agreeing with us. If the turn went looking for refuges
 * at all, the model judged this traveller possibly lost, and "head here for
 * safety" above "here is your route to the beach" is the mixed message that
 * gets somebody hurt at dusk — a tired person taps the nearest affordance. It
 * counts attempts because a refuge search that failed still means the model
 * thought they were lost: an Overpass outage returns `{ places: [], error }`,
 * but a malformed call throws before anything is captured, and both must
 * suppress.
 *
 * `attempts` covers the one-card rule. "How do I get to Sagada, then Banaue"
 * where Banaue's geocode fails leaves exactly one resolved pin, and rendering
 * it would put a card labelled Sagada under advice covering both legs — the
 * mislabelling `pickEnvironment` refuses, arriving through the back door.
 */
export function pickDestinationPin<T>(
  pins: T[],
  attempts: number,
  safePlaceAttempts: number,
): T | undefined {
  if (safePlaceAttempts > 0) {
    return undefined;
  }

  if (attempts !== 1) {
    return undefined;
  }

  return pins.length === 1 ? pins[0] : undefined;
}
