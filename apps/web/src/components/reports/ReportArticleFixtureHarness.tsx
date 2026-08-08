import fixture from "./fixtures/report-article.fixture.json";
import { ReportArticle, type ReportDocument } from "./ReportArticle";

export function ReportArticleFixtureHarness() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return <ReportArticle report={fixture as unknown as ReportDocument} />;
}
