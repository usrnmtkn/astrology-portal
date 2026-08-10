export type ReportReadyMailInput = { reportId: string; userId: string; reportUrl: string };
export type ReportMailProvider = { sendReportReady(input: ReportReadyMailInput): Promise<{ provider: string; messageId?: string }> };

export function createReportMailProvider(fetchImpl: typeof fetch = fetch): ReportMailProvider {
  return {
    async sendReportReady(input) {
      const endpoint = process.env.REPORT_MAIL_ENDPOINT;
      const token = process.env.REPORT_MAIL_TOKEN;
      const templateId = process.env.REPORT_READY_MAIL_TEMPLATE_ID;
      if (!endpoint || !token || !templateId) throw new Error("Report mail credentials and template ID are not configured.");
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ templateId, recipientUserId: input.userId, variables: { reportId: input.reportId, reportUrl: input.reportUrl } })
      });
      const payload = await response.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? `Report mail provider failed with ${response.status}.`);
      return { provider: new URL(endpoint).hostname, messageId: payload?.id };
    }
  };
}
