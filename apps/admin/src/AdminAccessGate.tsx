import { StudioButton, StudioInput } from "./StudioControls";
import { studioSignInHref } from "../../web/src/services/studioAuthReturn";
import { LogIn, RefreshCw } from "lucide-react";
import type { KeyboardEvent } from "react";

type AdminAccessGateProps = {
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  value: string;
};

/** Vercel preview hosts carry the branch or deployment id in the hostname. */
function isPreviewDeployment() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("-git-") || /-[a-z0-9]{6,}-[a-z0-9-]+\.vercel\.app$/u.test(host) || host === "localhost" || host === "127.0.0.1";
}

export default function AdminAccessGate({ disabled, onChange, onSubmit, value }: AdminAccessGateProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") onSubmit();
  }

  return (
    <section className="studio-surface admin-access-gate" aria-label="Admin access required">
      <div className="admin-access-gate-intro">
        <p className="admin-eyebrow">Owner access required</p>
        <h2>Sign in to Content Studio</h2>
        <p>
          Sign in with your owner account to open Content Studio.
          {isPreviewDeployment() && " Sign in separately on this preview."}
        </p>
        <a
          className="admin-create-button admin-access-owner-signin"
          href={studioSignInHref(`${window.location.pathname}${window.location.search}${window.location.hash}`)}
        >
          <LogIn size={16} aria-hidden="true" />
          Sign in as owner
        </a>
        <p className="admin-access-gate-note">
          You’ll return here after signing in.
        </p>
      </div>
      <div className="admin-access-gate-actions">
        <div className="admin-access-divider">
          <span>Or use emergency access</span>
        </div>
        <label className="admin-access-inline-field">
          <span>Emergency admin secret</span>
          <StudioInput
            aria-label="Emergency admin secret"
            type="password"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste emergency admin secret"
          />
        </label>
        <p className="admin-access-secret-note">
          Use this deployment’s <code>CONTENT_GENERATION_SECRET</code>.
        </p>
        <StudioButton type="button" onClick={onSubmit} disabled={disabled}>
          <RefreshCw size={16} aria-hidden="true" />
          Verify emergency access
        </StudioButton>
      </div>
    </section>
  );
}
