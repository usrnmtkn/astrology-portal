export type StudioVariableSource = { key: string; label: string; field: string };
export type StudioVariableUsage = { key: string; label: string; surface: string };
export type StudioVariable = {
  id: string;
  name: string;
  token: string;
  kind: "editable" | "readonly" | "unmapped";
  description: string;
  source: string;
  usages: StudioVariableUsage[];
  sources: StudioVariableSource[];
};
export type StudioVariableCatalog = { schema: "studio-variables/v1"; variables: StudioVariable[] };

export function decodeStudioVariableCatalog(data: any): StudioVariableCatalog {
  if (data?.schema !== 'studio-variables/v1' || !Array.isArray(data.variables) || !Array.isArray(data.usages) || !Array.isArray(data.sources)) throw new Error('The variable catalog is unavailable.');
  return { schema: data.schema, variables: data.variables.map((variable: any) => ({ ...variable,
    usages: variable.usages.map((index: number) => { if (!data.usages[index]) throw new Error('The variable catalog is incomplete.'); return data.usages[index]; }),
    sources: variable.sources.map((index: number) => { if (!data.sources[index]) throw new Error('The variable catalog is incomplete.'); return data.sources[index]; }) })) };
}

export function filterStudioVariables(variables: StudioVariable[], query: string, kind: string, surface: string) {
  const terms = query.toLocaleLowerCase().replace(/[{}]/gu, "").trim().split(/\s+/u).filter(Boolean);
  return variables.filter(variable => (!kind || variable.kind === kind)
    && (!surface || variable.usages.some(usage => usage.surface === surface))
    && terms.every(term => [variable.name, variable.description, variable.source,
      ...variable.usages.flatMap(usage => [usage.label, usage.key, usage.surface]),
      ...variable.sources.flatMap(source => [source.key, source.label])].join(" ").toLocaleLowerCase().includes(term)));
}
