const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://tldrastro.vercel.app").replace(/\/+$/u, "");
const secret = (process.env.CRON_SECRET || process.env.CONTENT_GENERATION_SECRET || "").trim();

if (!secret) {
  throw new Error("CRON_SECRET or CONTENT_GENERATION_SECRET is required for the deployed writing-kernel smoke check.");
}

const response = await fetch(`${baseUrl}/api/cron/writing-kernel-smoke`, {
  headers: { accept: "application/json", authorization: `Bearer ${secret}` }
});
const payload = await response.json().catch(() => null);

if (response.status !== 200 || payload?.ok !== true || !/^[a-f0-9]{64}$/u.test(payload?.indexSha256 ?? "")) {
  throw new Error(`Deployed writing-kernel smoke failed: status=${response.status}, check=${payload?.check ?? "unknown"}.`);
}

console.log(`Deployed writing-kernel smoke passed at ${baseUrl}; index ${payload.indexSha256}.`);
