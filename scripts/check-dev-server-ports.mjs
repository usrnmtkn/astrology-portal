import http from "node:http";

const checks = [
  {
    app: "public web",
    port: 5173,
    expectedTitle: "tldrastro",
    wrongAppHint: "admin Content Studio"
  },
  {
    app: "admin",
    port: 5174,
    expectedTitle: "TLDR Astro Admin",
    wrongAppHint: "public web app"
  }
];

function fetchLocalHtml(port) {
  return new Promise((resolve, reject) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        timeout: 750
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve(body);
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Timed out checking 127.0.0.1:${port}`));
    });
    request.on("error", reject);
  });
}

function titleFromHtml(html) {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
}

const findings = [];
const skipped = [];

for (const check of checks) {
  try {
    const html = await fetchLocalHtml(check.port);
    const title = titleFromHtml(html);

    if (title !== check.expectedTitle) {
      findings.push(
        `${check.app} port 127.0.0.1:${check.port} returned title "${title || "(none)"}"; expected "${check.expectedTitle}". ` +
        `A stale ${check.wrongAppHint} server may be bound to the wrong port.`
      );
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";

    if (code === "ECONNREFUSED") {
      continue;
    }

    if (code === "EPERM") {
      skipped.push(`127.0.0.1:${check.port} could not be probed in this sandbox (${error.message}).`);
      continue;
    }

    findings.push(error instanceof Error ? error.message : String(error));
  }
}

if (findings.length > 0) {
  console.error(["Dev server port guard failed:", ...findings.map((finding) => `- ${finding}`)].join("\n"));
  process.exit(1);
}

if (skipped.length > 0) {
  console.warn(["Dev server port guard skipped live probes:", ...skipped.map((finding) => `- ${finding}`)].join("\n"));
}

console.log("Dev server port guard passed.");
