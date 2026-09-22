// The public transport contract. New authoring fields are private by default.
// This module only projects already-authorized rows; admission happens on the
// server before projection. Never trim or reconstruct an approved passage here.
const strings = names => Object.fromEntries(names.split(/\s+/u).filter(Boolean).map(name => [name, 'string']));
const numbers = names => Object.fromEntries(names.split(/\s+/u).filter(Boolean).map(name => [name, 'number']));
const booleans = names => Object.fromEntries(names.split(/\s+/u).filter(Boolean).map(name => [name, 'boolean']));
const approval = { ...strings('approvalLevel recordPath payloadSha256 approvedAt taskId semanticAuthoritySha256') };
const reference = strings('contentKey field sha256');
const source = { ...strings('kind text'), reference };
const ingressSourceNames = `aspectChallengeSentence aspectManifestationSentence1 aspectManifestationSentence2 aspectMechanismSentence aspectResponseSentence astronomySummary challengeSentence closingLine deeperMeaningSentence dignitySentence durationSentence experienceBody experienceCreative experienceGeneral experienceHome experienceMoney experienceRecognition experienceRelationships experienceTime experienceWork historicalCallback introClosingSentence introManifestationSentence manifestationSentence1 manifestationSentence2 manifestationSentence3 openingHook placementCollectiveShadow placementCollectiveTheme placementCorrection placementDignityExpression placementDignityMeaning placementDignityMechanism placementMeaningSentence placementOpportunity placementPractice placementPressure placementShadow placementThesis planetCollectiveExpression planetDescriptor planetFunction planetFunctionSentence planetLore planetProductive planetRole planetShadow planetSignMechanismSentence practiceClosingLine reflectionQuestion responseSentence returnMeaning signCoreDrive signDescriptor signFunctionSentence signGift signMethod signShadow signValues stakesSentence timingFinalPass timingFirstPass timingLongCycle timingReturn timingSinglePass`;
const section = { ...strings('id role heading title body text'), ...booleans('enabled'),
  ingredients: [{ ...strings('id role text body'), ...booleans('enabled') }] };
const phrases = [strings('id role text joinBefore')];
const evergreenSection = { ...strings('id source motion role depth label body'), phrases,
  paragraphs: [{ ...strings('id job'), phrases }], items: [{ ...strings('id action'), phrases }] };
const lunarBlock = value => {
  const prose = ['para', 'heading', 'exact', 'intent', 'section', 'cycle', 'notice', 'prompt', 'tarot'];
  const base = strings('type title label text');
  if (prose.includes(value?.type)) return project(value, { ...base, ...(value.type === 'cycle' ? strings('link') : {}) });
  if (['bullets', 'callin'].includes(value?.type)) return project(value, { ...base, items: ['string'] });
  if (value?.type === 'ritual') return project(value, { ...base, steps: ['string'], notes: ['string'] });
  if (value?.type === 'times') return project(value, { ...strings('type'), items: [strings('city time')] });
  if (value?.type === 'bysign') return project(value, { ...base, items: [strings('sign house text')] });
  return undefined;
};
const packageRecord = {
  ...strings(`contentKey content_role review_status body body_you body_they headline summary
    Body Headline Summary BodyA BodyB SignA SignB AspectType CalendarSourceKind ExactIngressCopy
    Copy Template OverlayBody NewMoonArticle FullMoonArticle EventArticle FallbackArticle ModifierArticle NodeAxisArticle Article LilithArticle
    grammar_frame surface planet sign fromSign toSign oppositeSign axis nodeAxisPole precedence serving_precedence
    render_policy runtime_family runtime_key distribution_lane governance source_package
    studio_content_type studio_version_status source_baseline_sha256
    exact_text_sha256 body_you_sha256 body_they_sha256 body_you_review_status body_they_review_status
    body_you_authorship body_they_authorship body_you_sourceMechanism body_they_sourceMechanism
    sourceMechanism directionality_mode authoring_name_variable body_they_name_variable
    placementArticle placementArticleDirect placementArticleRetrograde tldrWhat tldrTakeaway
    energy intention ritual focus strategy completion mainEvent weekStart weekEnd weeklyHeadline weeklyOverview
    title tagline preview_note core_theme sign_jurisdiction lived_experience rulership_twist history_echo closing_charge
    reader_content_type content_type`),
  ...numbers('word_count body_you_word_count body_they_word_count variant'),
  ...booleans('owner_approved owner_authored reader_only serving_enabled'),
  blocks: [lunarBlock], lunarJournal: { blocks: [lunarBlock] },
  approval, body_you_approval: approval, body_they_approval: approval,
  content_boundary: booleans('mixedOwnerApproved'),
  article_sections: [section], rising_horoscopes: [{ ...strings('body risingSign contentKey'), ...numbers('house') }],
  source_keys: ['string'],
  requiredSlots: ['string'], optionalSlots: ['string'], mainShifts: ['string'],
  component_hashes: strings('bodySha256 bridgeSha256 introSha256 renderedHouseSectionSha256 renderedSignSectionSha256'),
  fallback: { ...strings('hook lived turn'), sections: [evergreenSection] },
  ingress: value => {
    const declared = new Set(ingressSourceNames.split(' '));
    // User-defined source names are public only when an approved reader module
    // actually references them. Each value still passes the explicit shape.
    for (const module of Array.isArray(value?.modules) ? value.modules : []) {
      if (typeof module?.template !== 'string') continue;
      for (const match of module.template.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu)) declared.add(match[1]);
    }
    return project(value, { ...booleans('enabled'), ...numbers('version'),
      modules: [{ ...strings('id label duration motion timing template'), ...booleans('enabled required') }],
      sources: Object.fromEntries([...declared].map(name => [name, source])) });
  },
  _studioVariables: [{ ...strings('id name value updatedAt'), overrides: [strings('scope planet sign value')] }]
};
const metadata = {
  ...strings(`content_role contentRole review_status reviewStatus contentType content_type contentSystem
    distributionState distribution_state packageVersion package_version packagePartition package_partition
    packageContentHash package_content_hash packagePartitionContentHash package_partition_content_hash
    packageKeyManifestHash package_key_manifest_hash packagePartitionKeyManifestHash package_partition_key_manifest_hash
    record_file recordFile file sourceFile sourceType canonicalKey renderer pairSource pairKey`),
  ...numbers('packageKeyCount package_key_count packagePartitionKeyCount package_partition_key_count'),
  ...booleans('servingFloor emergencyFloor owner_approved serving_enabled contentStudioExactAspect'), allowedSlots: ['string'],
  exactSkyAspectIdentity: strings('a b aspect'),
  cardFacts: strings('a b aspect signA signB'),
  skyAspectVoiceLint: numbers('score fails'),
  studioWritingCheck: strings('reviewPolicy contentKey bodyHash'),
  studioPairSourceRevision: strings('bodyHash id'),
  calendarAspectPublication: strings('schema action contentKey sourceBaselineSha256 copySha256 approvedAt'),
  ownerApproval: { ...booleans('approved'), ...strings('action contentKey templateKey templateHash fixedProseHash compiledHash') }
};
const edition = {
  ...strings('schema body compiledHash compiledMarkdown contentKey fixedProseHash headline planet sign templateHash templateKey tldr transitEndInstant transitStartInstant validFrom validTo'),
  ...numbers('entryYear'), articleSections: [section],
  housePassages: [{ ...strings('body contentKey risingSign'), ...numbers('house') }],
  aspectPassages: [strings('aspect body contentKey natalPoint')]
};
const sections = {
  ...strings(`body body_you body_they text tagline energy intention ritual
    experience guidance note expanded_narrative natal_sign_story collective_shift house_integration
    home_scene meaning advice reading collective_reading intro kind hubTitle do dont gift shadow integration`),
  pull_quote: strings('text'), marie_advice: strings('text'),
  topic: strings('you friend natal sky'), tagline: strings('natal text'),
  need: strings('phrase natal sky'), style: strings('phrase style short summary'),
  slots: strings('planet sign phase'),
  sections: [section], blocks: [{ ...section, ...numbers('level'), ...booleans('group'), ...strings('style'),
    list: [{ ...booleans('ordered'), items: ['string'] }] }],
  lunarJournal: { blocks: [lunarBlock] },
  calendarOverview: strings('weeklyOverview weeklyIntegration monthlyOverview monthlyIntegration seasonOverview lunarOverview transitOverview seasonOpening planetaryHighlights newMoonOverview fullMoonOverview lunationConnection'),
  packageRecord, skyArticleEdition: edition,
  articleHoroscopes: { ...strings('schema heading introduction'), passages: [{ ...strings('risingSign heading body'), ...numbers('house') }] }
};
const rowContract = {
  ...strings('id content_key surface mode status lane review_state event_type target_date headline summary body block_type provider model updated_at judge_gate'),
  ...numbers('judge_score'),
  source_snapshot: metadata,
  facts: { ...metadata, ...strings('slug'), related: [strings('label content_key slug')] },
  sections
};

function project(value, contract) {
  if (value === null) return null;
  if (typeof contract === 'function') return contract(value);
  if (typeof contract === 'string') return typeof value === contract ? value : undefined;
  if (Array.isArray(contract)) return Array.isArray(value)
    ? value.map(item => project(item, contract[0])).filter(item => item !== undefined) : undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const output = {};
  for (const [key, shape] of Object.entries(contract)) {
    if (!Object.hasOwn(value, key)) continue;
    const selected = project(value[key], shape);
    if (selected !== undefined) output[key] = selected;
  }
  return output;
}

export { READER_ROW_SCHEMA } from './readerRowSchema.mjs';
export function projectReaderRow(row) {
  const result = project(row, rowContract);
  if (!result || !result.id || !result.content_key || !result.updated_at) return null;
  // Legacy generic article sections also use an array, or a single body string.
  if (Array.isArray(row.sections)) result.sections = project(row.sections, [section]);
  else if (typeof row.sections === 'string') result.sections = row.sections;
  const rawRecord = row.sections?.packageRecord;
  const publicRecord = result.sections?.packageRecord;
  if (rawRecord?.ingress?.sources && publicRecord?.ingress) {
    const referenced = new Set();
    const visit = value => {
      if (typeof value === 'string') for (const match of value.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu)) referenced.add(match[1]);
      else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) if (key !== 'sources') visit(item);
    };
    visit(publicRecord);
    const sources = { ...publicRecord.ingress.sources };
    for (const name of referenced) {
      const selected = project(rawRecord.ingress.sources[name], source);
      if (selected !== undefined) sources[name] = selected;
    }
    publicRecord.ingress.sources = sources;
  }
  return result;
}
