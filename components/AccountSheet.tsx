import { Modal } from "react-native";
import { UserProfileView } from "@clerk/expo/native";

type AccountSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Native: Clerk's own profile UI, rendered by clerk-ios / clerk-android.
 *
 * The web variant beside this file swaps in Clerk's React `UserProfile`.
 * `UserProfileView` does not crash on web — it degrades to an empty `View` —
 * which is worse than crashing, because the account panel would open blank
 * with nothing to explain why.
 */
export function AccountSheet({ visible, onClose }: AccountSheetProps) {
  return (
    <Modal
      animationType="slide"
      visible={visible}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <UserProfileView onDismiss={onClose} />
    </Modal>
  );
}
