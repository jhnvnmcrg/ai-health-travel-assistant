/**
 * Limits shared by the Convex mutation that enforces them and the UI that has
 * to agree about them. Kept in a dependency-free module so importing it into
 * `convex/` does not drag React Native into the server bundle, or vice versa.
 */

/**
 * How long a reply may be in flight before it is presumed dead.
 *
 * Generous on purpose: four tool rounds against three third-party APIs is not
 * fast. It exists so a reply killed mid-flight — an action timeout, a deploy
 * — cannot wedge a conversation permanently.
 */
export const RESPONSE_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * The composer caps input well below this; that is a courtesy. This is the
 * limit, because a direct call to the mutation is not bound by the UI.
 */
export const MAX_MESSAGE_LENGTH = 2000;
