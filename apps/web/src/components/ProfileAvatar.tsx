export type ProfileAvatarSize = "regular" | "large";

export type ProfileAvatarProps = {
  avatarUrl?: string;
  email: string;
  name: string;
  size?: ProfileAvatarSize;
};

export function profileInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "tldr";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function ProfileAvatar({ avatarUrl, email, name, size = "regular" }: ProfileAvatarProps) {
  return (
    <span className={`profile-avatar profile-avatar-${size}`} aria-hidden="true">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        profileInitials(name, email)
      )}
    </span>
  );
}
