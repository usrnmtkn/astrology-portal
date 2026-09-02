from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text()


def write(path, text):
    (ROOT / path).write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

# Planet/sign vocabulary: deterministic keyset hydration and invalidatable cache.
path = "apps/web/src/services/planetTopicVocabulary.ts"
text = read(path)
text = replace_once(
    text,
    '''type PlanetTopicVocabularyRow = {
  content_key: string;''',
    '''type PlanetTopicVocabularyRow = {
  id: string;
  content_key: string;
  updated_at: string;''',
    "vocabulary row identity"
)
text = replace_once(
    text,
    '''let loadingVocabulary: Promise<PlanetTopicVocabulary> | null = null;
const warnedFallbacks = new Set<string>();''',
    '''let loadingVocabulary: Promise<PlanetTopicVocabulary> | null = null;
const warnedFallbacks = new Set<string>();

export function clearPlanetTopicVocabularyCache() {
  cachedVocabulary = null;
  cachedSignStyles = null;
  cachedSignNeeds = null;
  loadingVocabulary = null;
}''',
    "vocabulary cache reset"
)
old_loop = '''    const rows: PlanetTopicVocabularyRow[] = [];
    const pageSize = 1000;

    for (let page = 0; page < 5; page += 1) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("generated_interpretations")
        .select("content_key, status, lane, review_state, facts, flags, provider, source_snapshot, headline, body, sections")
        .eq("surface", "modifier")
        .eq("status", "LIVE")
        .eq("lane", "serving")
        .is("review_state", null)
        .or("content_key.like.fallback-vocab/%,content_key.like.cc/planet/%,content_key.like.cc/sign/%")
        .range(from, to)
        .returns<PlanetTopicVocabularyRow[]>();

      if (error) {
        console.warn("Planet topic vocabulary failed to load; topic slots will be blank.", error);
        cachedVocabulary = new Map();
        cachedSignStyles = new Map();
        cachedSignNeeds = new Map();
        return cachedVocabulary;
      }

      rows.push(...(data ?? []));

      if (!data || data.length < pageSize) {
        break;
      }
    }

    const servableRows = rows.filter(isReaderServableGeneratedContentRow);
    cachedVocabulary = planetTopicVocabularyFromRows(servableRows);
    cachedSignStyles = signStyleVocabularyFromRows(servableRows);
    cachedSignNeeds = signNeedVocabularyFromRows(servableRows);
    return cachedVocabulary;
  })();

  return loadingVocabulary;'''
new_loop = '''    const rows: PlanetTopicVocabularyRow[] = [];
    const pageSize = 1000;
    let cursorId: string | null = null;

    for (let page = 0; page < 5; page += 1) {
      let query = supabase
        .from("generated_interpretations")
        .select("id, content_key, updated_at, status, lane, review_state, facts, flags, provider, source_snapshot, headline, body, sections")
        .eq("surface", "modifier")
        .eq("status", "LIVE")
        .eq("lane", "serving")
        .is("review_state", null)
        .or("content_key.like.fallback-vocab/%,content_key.like.cc/planet/%,content_key.like.cc/sign/%")
        .order("id", { ascending: true })
        .limit(pageSize);
      if (cursorId) query = query.gt("id", cursorId);
      const { data, error } = await query.returns<PlanetTopicVocabularyRow[]>();

      if (error) {
        console.warn("Planet topic vocabulary failed to load; topic slots will be blank until the next retry.", error);
        return new Map();
      }

      rows.push(...(data ?? []));
      const lastId = data?.at(-1)?.id ?? null;
      if (!data || data.length < pageSize || !lastId) break;
      cursorId = lastId;
    }

    const servableRows = rows
      .filter(isReaderServableGeneratedContentRow)
      .sort((first, second) => {
        const firstUpdated = Date.parse(first.updated_at);
        const secondUpdated = Date.parse(second.updated_at);
        if (firstUpdated !== secondUpdated) return firstUpdated - secondUpdated;
        return first.id.localeCompare(second.id);
      });
    cachedVocabulary = planetTopicVocabularyFromRows(servableRows);
    cachedSignStyles = signStyleVocabularyFromRows(servableRows);
    cachedSignNeeds = signNeedVocabularyFromRows(servableRows);
    return cachedVocabulary;
  })();

  try {
    return await loadingVocabulary;
  } finally {
    loadingVocabulary = null;
  }'''
text = replace_once(text, old_loop, new_loop, "vocabulary stable hydration")
write(path, text)

# Natal card taglines: refresh after CMS updates and do not permanently cache a transient read failure.
path = "apps/web/src/services/natalPlacementTaglines.ts"
text = read(path)
text = replace_once(
    text,
    '''type NatalCardTaglineRow = {
  content_key: string;''',
    '''type NatalCardTaglineRow = {
  id: string;
  content_key: string;
  updated_at: string;''',
    "tagline row identity"
)
text = replace_once(
    text,
    '''let cachedTaglines: Map<string, string> | null = null;
let loadingTaglines: Promise<Map<string, string>> | null = null;''',
    '''let cachedTaglines: Map<string, string> | null = null;
let loadingTaglines: Promise<Map<string, string>> | null = null;

export function clearNatalCardTaglineCache() {
  cachedTaglines = null;
  loadingTaglines = null;
}''',
    "tagline cache reset"
)
text = replace_once(
    text,
    '''      .select("content_key, status, lane, review_state, flags, body, sections")
      .eq("status", "LIVE")''',
    '''      .select("id, content_key, updated_at, status, lane, review_state, flags, body, sections")
      .eq("status", "LIVE")''',
    "tagline row version selection"
)
text = replace_once(
    text,
    '''      .eq("prompt_version", "tagline-v1")
      .like("content_key", "vocab/natal-card-tagline/%")
      .returns<NatalCardTaglineRow[]>();''',
    '''      .eq("prompt_version", "tagline-v1")
      .like("content_key", "vocab/natal-card-tagline/%")
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<NatalCardTaglineRow[]>();''',
    "tagline deterministic precedence"
)
text = replace_once(
    text,
    '''    if (error) {
      console.warn("Natal card taglines failed to load; code fallbacks will be used.", error);
      cachedTaglines = new Map();
      return cachedTaglines;
    }

    cachedTaglines = natalCardTaglinesFromRows((data ?? []).filter(isReaderServableGeneratedContentRow));
    return cachedTaglines;
  })();

  return loadingTaglines;''',
    '''    if (error) {
      console.warn("Natal card taglines failed to load; code fallbacks will be used until the next retry.", error);
      return new Map();
    }

    cachedTaglines = natalCardTaglinesFromRows((data ?? []).filter(isReaderServableGeneratedContentRow));
    return cachedTaglines;
  })();

  try {
    return await loadingTaglines;
  } finally {
    loadingTaglines = null;
  }''',
    "tagline transient retry"
)
write(path, text)

# Existing cross-tab/same-tab CMS signal must clear all generated-content-derived in-memory caches.
path = "apps/web/src/services/contentUpdateSignal.ts"
text = read(path)
text = replace_once(
    text,
    '''import { clearSharedGeneratedContentCache } from "./sharedGeneratedContentCache";''',
    '''import { clearSharedGeneratedContentCache } from "./sharedGeneratedContentCache";
import { clearPlanetTopicVocabularyCache } from "./planetTopicVocabulary";
import { clearNatalCardTaglineCache } from "./natalPlacementTaglines";''',
    "content update cache imports"
)
text = replace_once(
    text,
    '''  const notify = (notice: ContentUpdateNotice) => {
    clearSharedGeneratedContentCache();
    listener(notice);
  };''',
    '''  const notify = (notice: ContentUpdateNotice) => {
    clearSharedGeneratedContentCache();
    clearPlanetTopicVocabularyCache();
    clearNatalCardTaglineCache();
    listener(notice);
  };''',
    "content update cache clearing"
)
write(path, text)

write("scripts/test-content-studio-runtime-cache-invalidation.mjs", r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const vocabulary = fs.readFileSync("apps/web/src/services/planetTopicVocabulary.ts", "utf8");
const taglines = fs.readFileSync("apps/web/src/services/natalPlacementTaglines.ts", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");

assert.match(vocabulary, /export function clearPlanetTopicVocabularyCache/u);
assert.match(vocabulary, /\.gt\("id", cursorId\)/u, "Vocabulary hydration must use a stable cursor.");
assert.doesNotMatch(vocabulary, /\.range\(/u, "Vocabulary hydration must not use OFFSET pagination.");
assert.match(vocabulary, /\.sort\(\(first, second\) => \{[\s\S]*?firstUpdated - secondUpdated/u, "Vocabulary duplicate precedence must be deterministic and newest rows must win after map assembly.");
assert.match(vocabulary, /topic slots will be blank until the next retry/u, "A transient vocabulary read failure must remain retryable.");
assert.match(vocabulary, /finally \{\s*loadingVocabulary = null/u);

assert.match(taglines, /export function clearNatalCardTaglineCache/u);
assert.match(taglines, /\.order\("updated_at", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/u, "Tagline duplicate precedence must be deterministic.");
assert.match(taglines, /code fallbacks will be used until the next retry/u, "A transient tagline read failure must remain retryable.");
assert.match(taglines, /finally \{\s*loadingTaglines = null/u);

assert.match(signal, /clearPlanetTopicVocabularyCache\(\)/u, "Publishing from Content Studio must invalidate planet/sign vocabulary cache.");
assert.match(signal, /clearNatalCardTaglineCache\(\)/u, "Publishing from Content Studio must invalidate natal tagline cache.");

console.log("Content Studio runtime cache invalidation contract passed.");
''')

print("Content Studio runtime cache hydration patch written.")
