import { Sun, X } from "lucide-react";
import { useId, type ReactNode, type Ref } from "react";
import { ModalPortal } from "./ModalPortal";
import { ProfileAvatar, type ProfileAvatarProps } from "./ProfileAvatar";
import { AppearanceToggle, type UiThemeOption } from "./ThemeControls";

interface SiteMenuSheetProps {
  children: ReactNode;
  onClose: () => void;
  theme: UiThemeOption;
  onThemeChange: (theme: UiThemeOption) => void;
  profile?: Pick<ProfileAvatarProps, "name" | "email" | "avatarUrl"> | null;
  handle?: string | null;
  menuRef?: Ref<HTMLDivElement>;
  restoreFocusId: string;
}

/** Shared navigation chrome for the reader and its separate report routes. */
export function SiteMenuSheet({
  children, onClose, theme, onThemeChange, profile, handle, menuRef, restoreFocusId
}: SiteMenuSheetProps) {
  const titleId = useId();
  return (
    <ModalPortal onClose={onClose} closeOnBackdrop restoreFocusId={restoreFocusId}
      titleId={titleId} panelClassName="site-menu-sheet" className="site-menu-modal">
      <div ref={menuRef}>
        <span id={titleId} className="sr-only">Navigation</span>
        <header className="site-menu-profile">
          {profile ? (
            <>
              <ProfileAvatar {...profile} size="large" />
              <span><strong>{profile.name}</strong>{handle ? <small>@{handle}</small> : null}</span>
            </>
          ) : <strong>TLDR Astro</strong>}
          <button type="button" className="site-menu-close" aria-label="Close menu" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="site-menu-theme">
          <Sun size={20} aria-hidden="true" /><span>Theme</span>
          <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
        </div>
        {children}
      </div>
    </ModalPortal>
  );
}
