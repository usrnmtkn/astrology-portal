import type { ReactNode } from "react";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SegmentedControl } from "../../components/SegmentedControl";

type YouTab = "transits" | "chart";

export type PersonalTimingSummary = {
  headline: string;
  summary: string;
  keyFactors: string[];
  status: "idle" | "loading" | "ready" | "error";
};

export type YouPageProps = {
  aspectRows: ReactNode[];
  bigThreeRows: ReactNode[];
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  hasSavedBirthDetails: boolean;
  hasSavedCurrentCity: boolean;
  natalChart: ReactNode;
  natalChartPending: boolean;
  natalAspectRows: ReactNode[];
  onCreateChart: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
  planetRows: ReactNode[];
  profileAvatarUrl?: string;
  profileEmail: string;
  profileName: string;
  setupStepsLeft: number;
  showNatalSignatures: boolean;
  signatureBody: string;
  signatureTitle: string;
  signaturesReady: boolean;
  transitsDrawn: boolean;
};

function YouEmptyState({
  onCreateChart,
  setupStepsLeft
}: {
  onCreateChart: () => void;
  setupStepsLeft: number;
}) {
  return (
    <section className="you-empty-state" aria-label="Create your chart">
      <h1>Create your chart.</h1>
      <p>
        Add your birth details to see your natal placements and what today's sky may be bringing up.
      </p>
      <button type="button" className="you-empty-cta" onClick={onCreateChart}>
        <span className="you-empty-cta-icon" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <span className="you-empty-cta-copy">
          <strong>Create your chart</strong>
          <em>{setupStepsLeft} steps left</em>
        </span>
      </button>
      <div className="you-empty-features" aria-label="Chart unlocks">
        <span>☉ Placements</span>
        <span>△ Aspects</span>
        <span>↗ Daily transits</span>
      </div>
    </section>
  );
}

function YouProfileSummary({
  displayMoon,
  displayRising,
  displaySun,
  profileAvatarUrl,
  profileEmail,
  profileName,
  signaturesReady
}: {
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  profileAvatarUrl?: string;
  profileEmail: string;
  profileName: string;
  signaturesReady: boolean;
}) {
  return (
    <div className="you-profile-card" aria-label="Profile summary">
      <ProfileAvatar
        avatarUrl={profileAvatarUrl}
        className="you-profile-monogram"
        email={profileEmail}
        name={profileName}
        size="large"
      />
      <div className="you-profile-copy">
        <h1>{profileName}</h1>
        {signaturesReady ? (
          <div className="you-signature-row" aria-label="Big three">
            <span><span aria-hidden="true">☉</span>{displaySun}</span>
            <span><span aria-hidden="true">☽</span>{displayMoon}</span>
            <span><span aria-hidden="true">↑</span>{displayRising}</span>
          </div>
        ) : (
          <p className="you-profile-status">Calculating chart signatures...</p>
        )}
      </div>
    </div>
  );
}

function YouNatalChartPanel({
  natalChart,
  natalChartPending
}: {
  natalChart: ReactNode;
  natalChartPending: boolean;
}) {
  return (
    <aside className="chart-layout__visual" aria-label="Natal chart">
      {natalChart}
      {natalChartPending && (
        <section className="you-empty-card you-calculating-card" aria-label="Chart calculation">
          <span>Chart</span>
          <h3>Reading your chart.</h3>
          <p>The chart wheel and core signatures will appear as soon as the calculation finishes.</p>
        </section>
      )}
    </aside>
  );
}

function YouNatalTab({
  bigThreeRows,
  elementalSummaryLabel,
  elementalSummarySentence,
  natalAspectRows,
  planetRows,
  showNatalSignatures,
  signatureBody,
  signatureTitle
}: {
  bigThreeRows: ReactNode[];
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  natalAspectRows: ReactNode[];
  planetRows: ReactNode[];
  showNatalSignatures: boolean;
  signatureBody: string;
  signatureTitle: string;
}) {
  return (
    <div className="subpane" id="sub-chart">
      {showNatalSignatures && (
        <>
          <span className="eyebrow section-label">Your signatures</span>
          <section className="you-signatures-card" aria-label="Your signatures">
            <div className="you-signatures-main">
              <h3>{signatureTitle}</h3>
              <p>{signatureBody}</p>
            </div>
            <div className="elemental-balance" aria-label="Elemental balance">
              <div className="elemental-balance-head">
                <span className="eyebrow section-label">Elemental balance</span>
                <span>{elementalSummaryLabel}</span>
              </div>
              <p>{elementalSummarySentence}</p>
            </div>
          </section>
        </>
      )}

      <span className="eyebrow section-label">Big Three</span>
      <div className="list you-list-card planet-placement-list" aria-label="Big three">
        {bigThreeRows}
      </div>

      {planetRows.length > 0 && (
        <>
          <span className="eyebrow section-label">Planets</span>
          <div className="list you-list-card planet-placement-list" aria-label="Planets">
            {planetRows}
          </div>
        </>
      )}

      {natalAspectRows.length > 0 && (
        <>
          <span className="eyebrow section-label">Aspects</span>
          <div className="list you-aspects-list aspect-row-list natal-aspects-list" aria-label="Aspects">
            {natalAspectRows}
          </div>
        </>
      )}
    </div>
  );
}

function YouUpdatesTab({
  aspectRows,
  hasSavedCurrentCity,
  onCreateChart,
  personalTimingSummary,
  transitsDrawn
}: {
  aspectRows: ReactNode[];
  hasSavedCurrentCity: boolean;
  onCreateChart: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
  transitsDrawn: boolean;
}) {
  return (
    <div className="subpane updates-section" id="sub-transits">
      {hasSavedCurrentCity && personalTimingSummary && (
        <section className="personal-timing-summary" aria-label="Personal timing summary">
          <span className="eyebrow section-label">Timing</span>
          <h3>{personalTimingSummary.headline}</h3>
          <p>{personalTimingSummary.summary}</p>
          {personalTimingSummary.keyFactors.length > 0 && (
            <ul>
              {personalTimingSummary.keyFactors.slice(0, 4).map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      <span className="eyebrow section-label">Aspects</span>
      {!hasSavedCurrentCity && (
        <section className="you-empty-card" aria-label="Current city needed">
          <span>Updates</span>
          <h3>Add your current city.</h3>
          <p>We need your current city to localize today’s sky against your chart.</p>
          <button type="button" onClick={onCreateChart}>Add current city →</button>
        </section>
      )}
      {hasSavedCurrentCity && aspectRows.length > 0 && transitsDrawn && (
        <div className="updates-aspect-list" aria-label="Aspects">
          {aspectRows}
        </div>
      )}
      {hasSavedCurrentCity && (!transitsDrawn || aspectRows.length === 0) && (
        <section className="you-empty-card" aria-label="Transit setup">
          <span>Updates</span>
          <h3>No major updates to your chart today.</h3>
          <p>The sky is still moving, but nothing is pressing hard on your natal placements right now.</p>
          <button type="button" onClick={onCreateChart}>Edit details →</button>
        </section>
      )}
    </div>
  );
}

export function YouPage({
  aspectRows,
  bigThreeRows,
  displayMoon,
  displayRising,
  displaySun,
  elementalSummaryLabel,
  elementalSummarySentence,
  hasSavedBirthDetails,
  hasSavedCurrentCity,
  natalAspectRows,
  natalChart,
  natalChartPending,
  onCreateChart,
  personalTimingSummary,
  planetRows,
  profileAvatarUrl,
  profileEmail,
  profileName,
  setupStepsLeft,
  showNatalSignatures,
  signatureBody,
  signatureTitle,
  signaturesReady,
  transitsDrawn
}: YouPageProps) {
  const [profileTab, setProfileTab] = useState<YouTab>("chart");

  if (!hasSavedBirthDetails) {
    return <YouEmptyState onCreateChart={onCreateChart} setupStepsLeft={setupStepsLeft} />;
  }

  return (
    <section className="you-page you-chart-page page-shell" aria-label="You">
      <div className="chart-layout">
        <YouNatalChartPanel natalChart={natalChart} natalChartPending={natalChartPending} />

        <main className="chart-layout__content">
          <YouProfileSummary
            displayMoon={displayMoon}
            displayRising={displayRising}
            displaySun={displaySun}
            profileAvatarUrl={profileAvatarUrl}
            profileEmail={profileEmail}
            profileName={profileName}
            signaturesReady={signaturesReady}
          />

          <SegmentedControl
            id="you-subtabs"
            value={profileTab}
            options={[
              { value: "transits", label: "Updates" },
              { value: "chart", label: "Natal Chart" }
            ]}
            onChange={setProfileTab}
            ariaLabel="Profile sections"
            className="app-tabs profile-tabs you-profile-tabs you-chart-tabs"
          />

          {profileTab === "chart" && (
            <YouNatalTab
              bigThreeRows={bigThreeRows}
              elementalSummaryLabel={elementalSummaryLabel}
              elementalSummarySentence={elementalSummarySentence}
              natalAspectRows={natalAspectRows}
              planetRows={planetRows}
              showNatalSignatures={showNatalSignatures}
              signatureBody={signatureBody}
              signatureTitle={signatureTitle}
            />
          )}

          {profileTab === "transits" && (
            <YouUpdatesTab
              aspectRows={aspectRows}
              hasSavedCurrentCity={hasSavedCurrentCity}
              onCreateChart={onCreateChart}
              personalTimingSummary={personalTimingSummary}
              transitsDrawn={transitsDrawn}
            />
          )}
        </main>
      </div>
    </section>
  );
}
