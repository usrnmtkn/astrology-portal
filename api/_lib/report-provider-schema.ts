const COMMON_SCHEMA_KEYWORDS = new Set([
  "type", "description", "enum", "const", "anyOf", "$ref", "$defs"
]);
const OBJECT_SCHEMA_KEYWORDS = new Set(["properties", "required", "additionalProperties"]);
const ARRAY_SCHEMA_KEYWORDS = new Set(["items", "minItems", "maxItems"]);
const STRING_SCHEMA_KEYWORDS = new Set(["pattern", "format"]);
const NUMBER_SCHEMA_KEYWORDS = new Set([
  "multipleOf", "maximum", "exclusiveMaximum", "minimum", "exclusiveMinimum"
]);
const SUPPORTED_STRING_FORMATS = new Set([
  "date-time", "time", "date", "duration", "email", "hostname", "ipv4", "ipv6", "uuid"
]);
const SUPPORTED_TYPES = new Set(["string", "number", "boolean", "integer", "object", "array", "null"]);

export class ReportProviderSchemaError extends Error {
  constructor(message: string) {
    super(`REPORT_PROVIDER_SCHEMA_INVALID: ${message}`);
    this.name = "ReportProviderSchemaError";
  }
}

type SchemaAudit = {
  objectProperties: number;
  stringBudget: number;
  enumValues: number;
};

function schemaTypes(value: unknown, path: string) {
  const values = Array.isArray(value) ? value : [value];
  if (!values.length || values.some((entry) => typeof entry !== "string" || !SUPPORTED_TYPES.has(entry))) {
    throw new ReportProviderSchemaError(`${path}.type contains an unsupported type.`);
  }
  return new Set(values as string[]);
}

function addStringBudget(audit: SchemaAudit, values: unknown[], path: string) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    audit.stringBudget += value.length;
    if (audit.stringBudget > 120_000) {
      throw new ReportProviderSchemaError(`${path} exceeds the 120,000-character schema string budget.`);
    }
  }
}

function assertSchemaNode(
  value: unknown,
  path: string,
  audit: SchemaAudit,
  objectDepth: number,
  root = false
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReportProviderSchemaError(`${path} must be a schema object.`);
  }
  const schema = value as Record<string, unknown>;
  if (root && ("anyOf" in schema || schema.type !== "object")) {
    throw new ReportProviderSchemaError(`${path} must be an object and cannot use root-level anyOf.`);
  }
  const types = "type" in schema ? schemaTypes(schema.type, path) : new Set<string>();
  const allowed = new Set(COMMON_SCHEMA_KEYWORDS);
  if (types.has("object")) for (const keyword of OBJECT_SCHEMA_KEYWORDS) allowed.add(keyword);
  if (types.has("array")) for (const keyword of ARRAY_SCHEMA_KEYWORDS) allowed.add(keyword);
  if (types.has("string")) for (const keyword of STRING_SCHEMA_KEYWORDS) allowed.add(keyword);
  if (types.has("number") || types.has("integer")) for (const keyword of NUMBER_SCHEMA_KEYWORDS) allowed.add(keyword);
  for (const keyword of Object.keys(schema)) {
    if (!allowed.has(keyword)) {
      throw new ReportProviderSchemaError(`${path} uses unsupported keyword '${keyword}'.`);
    }
  }

  if (typeof schema.description === "string") addStringBudget(audit, [schema.description], `${path}.description`);
  if ("const" in schema) addStringBudget(audit, [schema.const], `${path}.const`);
  if ("enum" in schema) {
    if (!Array.isArray(schema.enum) || !schema.enum.length) {
      throw new ReportProviderSchemaError(`${path}.enum must be a non-empty array.`);
    }
    audit.enumValues += schema.enum.length;
    if (audit.enumValues > 1_000) throw new ReportProviderSchemaError("Schema exceeds 1,000 total enum values.");
    addStringBudget(audit, schema.enum, `${path}.enum`);
    if (schema.enum.length > 250) {
      const enumStringLength = schema.enum.reduce((sum, entry) => sum + (typeof entry === "string" ? entry.length : 0), 0);
      if (enumStringLength > 15_000) {
        throw new ReportProviderSchemaError(`${path}.enum exceeds the 15,000-character large-enum budget.`);
      }
    }
  }
  if ("format" in schema && !SUPPORTED_STRING_FORMATS.has(String(schema.format))) {
    throw new ReportProviderSchemaError(`${path}.format '${String(schema.format)}' is unsupported.`);
  }
  if ("pattern" in schema) {
    if (typeof schema.pattern !== "string") throw new ReportProviderSchemaError(`${path}.pattern must be a string.`);
    try { new RegExp(schema.pattern, "u"); } catch { throw new ReportProviderSchemaError(`${path}.pattern is not a valid regular expression.`); }
  }

  if (types.has("object")) {
    const nextDepth = objectDepth + 1;
    if (nextDepth > 10) throw new ReportProviderSchemaError(`${path} exceeds the 10-level object nesting limit.`);
    if (schema.additionalProperties !== false) {
      throw new ReportProviderSchemaError(`${path} must set additionalProperties to false.`);
    }
    if (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties)) {
      throw new ReportProviderSchemaError(`${path}.properties must be an object.`);
    }
    const properties = schema.properties as Record<string, unknown>;
    const propertyNames = Object.keys(properties);
    audit.objectProperties += propertyNames.length;
    if (audit.objectProperties > 5_000) throw new ReportProviderSchemaError("Schema exceeds 5,000 object properties.");
    addStringBudget(audit, propertyNames, `${path}.properties`);
    if (!Array.isArray(schema.required)
      || schema.required.length !== propertyNames.length
      || new Set(schema.required).size !== propertyNames.length
      || propertyNames.some((property) => !schema.required?.includes(property))) {
      throw new ReportProviderSchemaError(`${path}.required must contain every property exactly once.`);
    }
    for (const [property, propertySchema] of Object.entries(properties)) {
      assertSchemaNode(propertySchema, `${path}.properties.${property}`, audit, nextDepth);
    }
  }
  if (types.has("array")) {
    if (!("items" in schema)) throw new ReportProviderSchemaError(`${path}.items is required for arrays.`);
    assertSchemaNode(schema.items, `${path}.items`, audit, objectDepth);
  }
  if ("anyOf" in schema) {
    if (!Array.isArray(schema.anyOf) || !schema.anyOf.length) {
      throw new ReportProviderSchemaError(`${path}.anyOf must be a non-empty array.`);
    }
    schema.anyOf.forEach((entry, index) => assertSchemaNode(entry, `${path}.anyOf[${index}]`, audit, objectDepth));
  }
  if ("$defs" in schema) {
    if (!schema.$defs || typeof schema.$defs !== "object" || Array.isArray(schema.$defs)) {
      throw new ReportProviderSchemaError(`${path}.$defs must be an object.`);
    }
    const definitions = schema.$defs as Record<string, unknown>;
    addStringBudget(audit, Object.keys(definitions), `${path}.$defs`);
    for (const [name, definition] of Object.entries(definitions)) {
      assertSchemaNode(definition, `${path}.$defs.${name}`, audit, objectDepth);
    }
  }
}

/**
 * Compile a schema against OpenAI's strict Structured Outputs subset before
 * any lifecycle hook or provider request can consume a call authorization.
 */
export function assertOpenAiStrictResponseSchema(schema: Record<string, unknown>, schemaName = "response") {
  assertSchemaNode(schema, schemaName, { objectProperties: 0, stringBudget: 0, enumValues: 0 }, 0, true);
}
