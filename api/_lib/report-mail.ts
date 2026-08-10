export type ReportReadyMailInput = { reportId: string; userId: string; reportUrl: string };
export type ReportMailResult = { provider: string; mode: "sent" | "log_only"; messageId?: string; payload: Record<string, unknown> };
export type ReportMailProvider = { sendReportReady(input: ReportReadyMailInput): Promise<ReportMailResult> };

export function createReportMailProvider(fetchImpl: typeof fetch = fetch): ReportMailProvider {
  return {
    async sendReportReady(input) {
      const endpoint = process.env.REPORT_MAIL_ENDPOINT;
      const token = process.env.REPORT_MAIL_TOKEN;
      const templateId = process.env.REPORT_READY_MAIL_TEMPLATE_ID;
      const deliveryPayload = { templateId: templateId || null, recipientUserId: input.userId, variables: { reportId: input.reportId, reportUrl: input.reportUrl } };
      if (!endpoint || !token || !templateId) return { provider: "log-only", mode: "log_only", payload: deliveryPayload };
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(deliveryPayload)
      });
      const providerPayload = await response.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!response.ok) throw new Error(providerPayload?.error ?? `Report mail provider failed with ${response.status}.`);
      return { provider: new URL(endpoint).hostname, mode: "sent", messageId: providerPayload?.id, payload: deliveryPayload };
    }
  };
}
