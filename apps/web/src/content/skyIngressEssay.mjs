/** Versioned rendering layouts. Prose authority lives in the server ingress contract. */
export const SKY_INGRESS_ESSAY_FORMAT = "ingress-essay-v2";
export const SKY_INGRESS_ARTICLE_FORMAT = "ingress-essay-v3";

export const skyIngressEssayFields = [
  { name: "articleTitle", description: "Saved articleTitle field. Edit existing text or select Ingress article for new generation." },
  { name: "when", description: "Saved when field. Edit existing text or select Ingress article for new generation." },
  { name: "what", description: "Saved what field. Edit existing text or select Ingress article for new generation." },
  { name: "takeaway", description: "Saved takeaway field. Edit existing text or select Ingress article for new generation." },
  { name: "overviewHeading", description: "Saved overviewHeading field. Edit existing text or select Ingress article for new generation." },
  { name: "overviewBody", description: "Saved overviewBody field. Edit existing text or select Ingress article for new generation." },
  { name: "majorTransitSections", description: "Saved majorTransitSections field. Edit existing text or select Ingress article for new generation." },
  { name: "priorOccurrenceSection", description: "Saved priorOccurrenceSection field. Edit existing text or select Ingress article for new generation." },
  { name: "otherDatesSection", description: "Saved otherDatesSection field. Edit existing text or select Ingress article for new generation." },
  { name: "closingHeading", description: "Saved closingHeading field. Edit existing text or select Ingress article for new generation." },
  { name: "closingBody", description: "Saved closingBody field. Edit existing text or select Ingress article for new generation." }
];

export const SKY_INGRESS_ESSAY_TEMPLATE = `# {{articleTitle}}

## Summary

When: {{when}}

What: {{what}}

Takeaway: {{takeaway}}

## {{overviewHeading}}

{{overviewBody}}

{{majorTransitSections}}

{{priorOccurrenceSection}}

{{otherDatesSection}}

## {{closingHeading}}

{{closingBody}}`;

// The old field names and template exist only to render/edit saved editions.
// New generation is restricted to the current article format at both server entries.
export const skyIngressArticleFields = [
  {
    "name": "articleTitle",
    "description": "Calculated article title."
  },
  {
    "name": "when",
    "description": "Complete calculated entry and exit in ET."
  },
  {
    "name": "what",
    "description": "Brief article metadata."
  },
  {
    "name": "takeaway",
    "description": "Article takeaway metadata."
  },
  {
    "name": "articleBody",
    "description": "Complete article body. Current server ingress instructions govern writing."
  },
  {
    "name": "priorOccurrenceSection",
    "description": "Optional verified prior-occurrence section."
  },
  {
    "name": "otherDatesSection",
    "description": "Calculated Key dates, assembled by the application."
  }
];

export const SKY_INGRESS_ARTICLE_TEMPLATE = `# {{articleTitle}}

**When:** {{when}}

{{articleBody}}

{{priorOccurrenceSection}}

{{otherDatesSection}}`;

export function isSkyIngressArticle(format) {
  return format === SKY_INGRESS_ARTICLE_FORMAT;
}

export function isSkyIngressEssay(format) {
  return format === SKY_INGRESS_ESSAY_FORMAT || isSkyIngressArticle(format);
}

export function skyIngressFieldsForFormat(format) {
  return isSkyIngressArticle(format) ? skyIngressArticleFields : skyIngressEssayFields;
}

export function skyIngressTemplateForFormat(format) {
  return isSkyIngressArticle(format) ? SKY_INGRESS_ARTICLE_TEMPLATE : SKY_INGRESS_ESSAY_TEMPLATE;
}
