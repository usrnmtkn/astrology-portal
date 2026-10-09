export const SKY_INGRESS_ESSAY_FORMAT: "ingress-essay-v2";
export type SkyArticleFormat = typeof SKY_INGRESS_ESSAY_FORMAT | "saved-template";
export const SKY_INGRESS_ESSAY_TEMPLATE: string;
export const SKY_INGRESS_ESSAY_INSTRUCTIONS: string;
export const skyIngressEssayFields: readonly { name: string; description: string }[];
export function isSkyIngressEssay(format: unknown): format is typeof SKY_INGRESS_ESSAY_FORMAT;
