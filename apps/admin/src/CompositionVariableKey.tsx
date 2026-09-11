import type { CompositionMapSlot } from './compositionMap';

type Variable = Pick<CompositionMapSlot, 'name' | 'label' | 'sourceKind' | 'sources'>;

/** A variable keeps its color across all views, regardless of source type. */
export function compositionVariableColors(slots: readonly Pick<Variable, 'name'>[]) {
  const names = [...new Set(slots.map(slot => slot.name))].sort();
  return new Map(names.map((name, index) => [name, String(index % 6 + 1)]));
}

export function CompositionVariableKey({ slots, colors }: {
  slots: readonly Variable[];
  colors: ReadonlyMap<string, string>;
}) {
  if (!slots.length) return null;
  return (
    <div className="admin-variable-key">
      <p className="admin-field-hint">Match each colored variable to its name below. Select a value to inspect its source.</p>
      <div className="admin-composition-variable-legend" aria-label="Variable color key">
        {slots.map(slot => (
          <span key={slot.name} className="admin-variable-key-item" data-variable-name={slot.name}
            data-variable-color={colors.get(slot.name)} title={`{{${slot.name}}}`}>
            <span>{slot.label}</span>
            <small>{slot.sourceKind === 'runtime' ? 'Calculated fact' : slot.sourceKind === 'unmapped' ? 'Not wired' : slot.sources[0]?.kind === 'phrase' ? 'Reusable phrase' : slot.sources[0]?.kind === 'hook' ? 'Authored hook' : 'Saved copy'}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
