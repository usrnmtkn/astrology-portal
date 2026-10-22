import authority from "../../src/astro-writing/transitIngressEditorialAuthority.cjs";
import { createHash } from 'node:crypto';
import { skyIngressArticleFields, SKY_INGRESS_ARTICLE_TEMPLATE } from "../../apps/web/src/content/skyIngressEssay.mjs";

export const TRANSIT_INGRESS_EDITORIAL_AUTHORITY = authority.TRANSIT_INGRESS_EDITORIAL_AUTHORITY;
export const INGRESS_WRITER_CONTRACT = authority.INGRESS_WRITER_CONTRACT;

export function ingressWriterContractReceipt() {
  return { version: INGRESS_WRITER_CONTRACT.version, format: INGRESS_WRITER_CONTRACT.format,
    sha256: createHash('sha256').update(JSON.stringify({ contract: INGRESS_WRITER_CONTRACT, template: SKY_INGRESS_ARTICLE_TEMPLATE })).digest('hex') };
}

export function ingressArticleFields() {
  return skyIngressArticleFields.map(field => {
    const description = INGRESS_WRITER_CONTRACT.fieldDescriptions[field.name];
    if (typeof description !== 'string' || !description.trim()) throw new Error('Incomplete current ingress writer contract.');
    return { ...field, description };
  });
}
