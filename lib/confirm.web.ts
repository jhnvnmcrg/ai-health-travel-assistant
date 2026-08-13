export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Ignored on web: `window.confirm` only ever offers OK and Cancel. */
  confirmLabel?: string;
  destructive?: boolean;
};

/**
 * Web: `window.confirm`.
 *
 * This variant exists because React Native Web implements `Alert` as
 * `class Alert { static alert() {} }` — an empty function. Calling it does
 * nothing at all, so any action gated behind a native confirmation dialog
 * silently never happens in a browser. Deleting a conversation was exactly
 * that: the button worked, the dialog never appeared, and nothing was deleted.
 */
export function confirm({ title, message }: ConfirmOptions): Promise<boolean> {
  const prompt = message ? `${title}\n\n${message}` : title;

  return Promise.resolve(window.confirm(prompt));
}
