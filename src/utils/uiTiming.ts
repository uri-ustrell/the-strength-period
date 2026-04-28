/**
 * Universal UI feedback timing constants (milliseconds).
 *
 * Use these instead of hard-coded `setTimeout` literals so the entire app
 * shares a coherent rhythm for confirmations, transitions and auto-dismiss.
 */

/**
 * Duration a transient confirmation badge stays visible before the UI
 * advances (e.g. "Saved ✓" before navigating back).
 *
 * Long enough to register subconsciously, short enough not to feel like a wait.
 */
export const FEEDBACK_CONFIRM_MS = 700

/**
 * Duration for non-blocking toasts that the user does not need to act on.
 */
export const FEEDBACK_TOAST_MS = 2000

/**
 * Duration for a subtle micro-interaction (e.g. button press echo).
 */
export const FEEDBACK_MICRO_MS = 200
