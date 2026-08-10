#!/usr/bin/env node

import { REPORT_SKUS } from "../api/_lib/report-fulfillment-config.ts";
import { stripePost } from "../api/_lib/stripe-report-billing.ts";

const dryRun = process.argv.includes("--dry-run");
const currency = process.env.STRIPE_REPORT_CURRENCY ?? "usd";
const results = [];

for (const sku of REPORT_SKUS) {
  const name = process.env[sku.nameEnv]?.trim();
  if (!name) throw new Error(`${sku.nameEnv} must contain owner-approved Stripe product copy.`);
  const amount = Number.parseInt(process.env[sku.amountEnv] ?? "", 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${sku.amountEnv} must be configured in the currency's smallest unit.`);
  }
  if (dryRun) {
    results.push({ sku: sku.key, name, amount, currency, priceEnv: sku.priceEnv });
    continue;
  }
  const product = await stripePost("products", {
    name,
    "metadata[product_key]": sku.key,
    "metadata[report_domain]": sku.reportDomain,
    "metadata[report_horizon]": sku.reportHorizon
  });
  const price = await stripePost("prices", {
    product: product.id,
    unit_amount: amount,
    currency,
    "metadata[product_key]": sku.key
  });
  results.push({ sku: sku.key, productId: product.id, priceId: price.id, priceEnv: sku.priceEnv });
}

console.log(JSON.stringify({ dryRun, results }, null, 2));
