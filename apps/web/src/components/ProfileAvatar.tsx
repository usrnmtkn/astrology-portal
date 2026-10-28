export type ProfileAvatarSize = "regular" | "large";

export type ProfileAvatarProps = {
  avatarUrl?: string;
  className?: string;
  email: string;
  name: string;
  size?: ProfileAvatarSize;
  aspect?: string;
};

export function profileInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "tldr";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function ProfileAvatar({ avatarUrl, className, email, name, size = "regular", aspect }: ProfileAvatarProps) {
  return (
    <span className={["profile-avatar", `profile-avatar-${size}`, aspect && "profile-avatar--aspect", className].filter(Boolean).join(" ")} aria-hidden="true">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        profileInitials(name, email)
      )}
      {aspect && <span className="profile-avatar__aspect" data-aspect={aspect}>
        {({ square: "□", trine: "△", sextile: "⚹", opposition: "☍", conjunction: "☌" } as Record<string, string>)[aspect] ?? "✦"}
      </span>}
    </span>
  );
}
