import { Alert } from "react-native";

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Label for the affirmative button. Native only — web shows OK/Cancel. */
  confirmLabel?: string;
  destructive?: boolean;
};

/**
 * Native: a real `Alert`, resolved to a boolean so callers can `await` it
 * instead of burying the action inside a button callback.
 *
 * There is a web variant beside this file because React Native Web ships
 * `Alert.alert` as a literal empty function — see confirm.web.ts.
 */
export function confirm({
  title,
  message,
  confirmLabel = "OK",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      // Android's back button dismisses the dialog without touching either
      // button; without this the promise would never settle.
      { onDismiss: () => resolve(false) },
    );
  });
}
