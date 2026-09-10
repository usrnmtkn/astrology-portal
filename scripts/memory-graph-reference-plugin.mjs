/** Pinned @supermemory/memory-graph 0.1.8 adaptations from heyhaigh.ai.
 * No network calls or memory data are added to the component.
 * Fail closed on dependency drift rather than silently losing visual parity.
 */
// Serialized into the pinned renderer; metadata is produced only by the owner API.
export function projectGraphConnections(documents, nodes, colors) {
  const visible = new Set(nodes.map(node => node.id));
  const edges = new Map();
  for (const doc of documents) for (const connection of doc.processingMetadata?.graphConnections ?? []) {
    if (!visible.has(connection.source) || !visible.has(connection.target) || connection.source === connection.target) continue;
    const suggested = connection.relation === 'shared_terms';
    const colorKey = { qualifies: 'extends', supersedes: 'updates', cites: 'derives' }[connection.relation];
    if (!suggested && !colorKey) continue;
    const id = `project-${connection.relation}-${connection.source}-${connection.target}`;
    edges.set(id, { id, source: connection.source, target: connection.target,
      similarity: suggested ? 0.65 + 0.35 * connection.score : 1,
      visualProps: { opacity: 0.8, thickness: 1, glow: 0, pulseDuration: 3000 },
      color: suggested ? colors.connection.medium : colors.relations[colorKey],
      edgeType: suggested ? 'doc-doc' : 'version', relationType: connection.relation });
  }
  return [...edges.values()];
}

export function adaptMemoryGraph(code) {
  const replacements = [
    ['zt = !tt && new Date(ot.createdAt).getTime() > Date.now() - 1e3 * 60 * 60 * 24;', 'zt = !tt && new Date(ot.createdAt).getTime() > Date.now() - 1e3 * 60 * 60 * 24 * 7;'],
    ['r.lineWidth = Z ? 3 : B ? 2 : 1;', 'r.lineWidth = Z ? 3 : B ? 2 : 1; if (!Z && !B && _.data && _.data.createdAt && Date.now() - new Date(_.data.createdAt).getTime() < 1e3 * 60 * 60 * 24 * 7) { r.strokeStyle = J.status.new, r.lineWidth = 2; }'],
    ['children: "New memory"', 'children: "New this week"'],
    ['className: At, children: "Document"', 'className: At, children: "IQ Cluster"'],
    ['" documents"', '" clusters"'],
    ['children: "Doc similarity"', 'children: "Shared terms"'],
    ['["updates", J.relations.updates]', '["supersedes", J.relations.updates]'],
    ['["extends", J.relations.extends]', '["qualifies", J.relations.extends]'],
    ['["derives", J.relations.derives]', '["cites", J.relations.derives]'],
    ['d.push(...u), { nodes: l, edges: d }', 'd.push(...u, ...projectGraphConnections(i, l, J)), { nodes: l, edges: d }'],
    // Use the full-provenance detail panel for memories, retaining source popovers.
    ['q(O);\n    },\n    [q]', 'if (g.find(node => node.id === O)?.type === "memory") { q(null); window.dispatchEvent(new CustomEvent("tldr-memory-select", { detail: O })); } else { q(O); }\n    },\n    [q, g]'],
    // Keep the legend discoverable when the console is narrower than 768 px.
    ['className: nc, children: "?"', 'className: nc, children: "Legend"'],
    ['className: ac, children:', 'className: ac, "aria-label": "Collapse legend", children:'],
    ['className: tc, children:', 'className: tc, "aria-label": "Expand legend", children:'],
    ['u(f === "true" ? !1 : f === "false" ? !0 : !a)', 'u(f === "true" ? !1 : f === "false" ? !0 : !window.matchMedia("(max-width: 767px)").matches)'],
  ];
  for (const [before, after] of replacements) {
    if (code.split(before).length !== 2) throw new Error('Memory graph 0.1.8 changed; review reference adaptations.');
    code = code.replace(before, after);
  }
  // Missing source dates must not become invented recency or “Invalid Date”.
  code = code.replaceAll("new Date(e.data.createdAt).toLocaleDateString()", "(Number.isFinite(Date.parse(e.data.createdAt)) ? new Date(e.data.createdAt).toLocaleDateString() : 'Date not recorded')");
  return `${projectGraphConnections.toString()}\n${code}`;
}
export function memoryGraphReferencePlugin() {
  return { name: 'tldr-memory-graph-reference', enforce: 'pre', transform(code, id) {
    if (id.endsWith('/@supermemory/memory-graph/dist/memory-graph.js')) return { code: adaptMemoryGraph(code), map: null };
  } };
}
