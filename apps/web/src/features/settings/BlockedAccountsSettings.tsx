import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import {
  listSocialBlocks,
  unblockSocialUser,
  type SocialBlock
} from "../../services/socialFriends";

type BlockedAccountsStatus = "loading" | "ready" | "updating" | "error";

export function BlockedAccountsSettings({ onBack }: { onBack: () => void }) {
  const [blocks, setBlocks] = useState<SocialBlock[]>([]);
  const [status, setStatus] = useState<BlockedAccountsStatus>("loading");
  const [message, setMessage] = useState("");

  const refreshBlocks = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      setBlocks(await listSocialBlocks());
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load blocked accounts.");
    }
  }, []);

  useEffect(() => {
    void refreshBlocks();
  }, [refreshBlocks]);

  async function unblock(block: SocialBlock) {
    setStatus("updating");
    setMessage("");

    try {
      await unblockSocialUser(block.userId);
      setBlocks((current) => current.filter((candidate) => candidate.userId !== block.userId));
      setStatus("ready");
      setMessage(`${block.displayName} was unblocked.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not unblock this account.");
    }
  }

  return (
    <section className="settings-page settings-subpage page-shell--narrow" aria-label="Blocked accounts settings">
      <div className="page-back-row settings-back-row">
        <button className="settings-back-button floating-back-button" type="button" onClick={onBack}>
          <ChevronLeft size={20} aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>

      <div className="settings-header">
        <h1>blocked accounts.</h1>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Blocked accounts">
          <span className="settings-group-label">Restrictions</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row settings-row-control settings-blocked-summary">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Blocked accounts</span>
                  <small className="settings-row-description">
                    Blocked people cannot find you, send requests, or view your shared chart.
                  </small>
                </div>
                <span className="settings-row__value" aria-live="polite">
                  {status === "loading" ? "Loading…" : blocks.length === 0 ? "None" : blocks.length}
                </span>
              </div>

              {blocks.map((block) => (
                <div className="settings-row settings-blocked-row" key={block.userId}>
                  <ProfileAvatar avatarUrl={block.avatarUrl} email="" name={block.displayName} />
                  <span className="settings-blocked-copy">
                    <strong>{block.displayName}</strong>
                    <small>@{block.handle}</small>
                  </span>
                  <button
                    className="settings-unblock-button"
                    type="button"
                    disabled={status === "updating"}
                    onClick={() => void unblock(block)}
                  >
                    Unblock
                  </button>
                </div>
              ))}

              {status === "error" && (
                <div className="settings-row settings-blocked-error">
                  <span className="settings-row-description" role="status">{message}</span>
                  <button className="settings-unblock-button" type="button" onClick={() => void refreshBlocks()}>
                    Retry
                  </button>
                </div>
              )}

              {message && status === "ready" && (
                <p className="settings-blocked-message" role="status">{message}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
