import { UserProfile } from "@clerk/expo/web";
import { SheetModal } from "./SheetModal";

type AccountSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Web: Clerk's React `UserProfile`, which is what `@clerk/expo/web` re-exports
 * for exactly this case. The native `UserProfileView` is backed by clerk-ios /
 * clerk-android and renders an empty `View` in a browser.
 *
 * Wrapped in the app's own sheet shell so it closes the same way every other
 * sheet does — Clerk's web component has no dismiss affordance of its own.
 */
export function AccountSheet({ visible, onClose }: AccountSheetProps) {
  return (
    <SheetModal visible={visible} onClose={onClose} title="Account">
      {/* `hash` keeps Clerk's internal navigation in the URL fragment. The
          default, `path`, expects a catch-all route to live under — which this
          does not, since it renders inside a sheet. */}
      <UserProfile routing="hash" />
    </SheetModal>
  );
}
