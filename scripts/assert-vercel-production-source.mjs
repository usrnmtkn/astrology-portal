const productionBranch = "main";
const vercelEnvironment = process.env.VERCEL_ENV?.trim();
const vercelTargetEnvironment = process.env.VERCEL_TARGET_ENV?.trim();
const gitRef = process.env.VERCEL_GIT_COMMIT_REF?.trim();
const isProduction =
  vercelEnvironment === "production" || vercelTargetEnvironment === "production";

if (!isProduction) {
  process.exit(0);
}

if (gitRef === productionBranch) {
  console.log(
    `[vercel-production-guard] Production source verified: ${productionBranch}.`,
  );
  process.exit(0);
}

const source = gitRef || "no Git branch metadata";

console.error(
  [
    "[vercel-production-guard] Refusing production build.",
    `Expected VERCEL_GIT_COMMIT_REF=${productionBranch}; received ${source}.`,
    "Deploy this commit as a preview, merge it into main, and let the Vercel Git integration publish main.",
  ].join("\n"),
);

process.exit(1);
