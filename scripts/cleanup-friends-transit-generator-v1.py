from pathlib import Path

p = Path('scripts/build-friends-transit-completion-v1.mjs')
s = p.read_text()

replacements = {
    '"What was easy to leave vague gets harder to ignore for {{Name}}, particularly where %DOMAIN% is concerned."': '"What was easy to leave vague gets harder to ignore for {{Name}}, particularly around %DOMAIN%."',
    '"{{Name}} may feel more willing to ask for more, spend more, or take a bigger chance where %DOMAIN% is concerned."': '"{{Name}} may feel more willing to ask for more, spend more, or take a bigger chance around %DOMAIN%."',
    '"The emotional meaning of an ordinary event can rise fast for {{Name}}, particularly where %DOMAIN% is concerned."': '"The emotional meaning of an ordinary event can rise fast for {{Name}}, particularly around %DOMAIN%."',
    '"The line between intuition, hope, and assumption gets thinner for {{Name}} where %DOMAIN% is concerned."': '"The line between intuition, hope, and assumption gets thinner for {{Name}} around %DOMAIN%."',
    '"An unfamiliar option may ask more of {{Name}} than the familiar one, especially around %DOMAIN%."': '"An unfamiliar option may require more from {{Name}} than the familiar one, especially around %DOMAIN%."',
    '"{{Name}} may be offered a next step that feels slightly ahead of their experience where %DOMAIN% is concerned."': '"{{Name}} may be offered a next step that feels slightly ahead of their experience around %DOMAIN%."',
    '"Money, affection, or social ease can change the tone of the situation for {{Name}}, especially where %DOMAIN% is concerned."': '"Money, affection, or social ease can change the tone of the situation for {{Name}}, especially around %DOMAIN%."'
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f'missing expected cleanup target: {old}')
    s = s.replace(old, new)

helper_anchor = '''function sentence(template, replacements) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => value.replaceAll(`%${key}%`, replacement), template);
}
'''
helper_replacement = '''function sentence(template, replacements) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => value.replaceAll(`%${key}%`, replacement), template);
}

function capitalizeFirst(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
'''
if helper_anchor not in s:
    raise SystemExit('missing sentence helper anchor')
s = s.replace(helper_anchor, helper_replacement)

mechanism_anchor = '''  const mechanism = sentence(pick(mechanismPool, seed, 3), { EFFECT: effect });'''
mechanism_replacement = '''  const mechanismTemplate = pick(mechanismPool, seed, 3);
  const mechanismPrepared = mechanismTemplate
    .replace(/^%EFFECT%/u, "%EFFECT_CAP%")
    .replace(/([.!?]\\s+)%EFFECT%/gu, "$1%EFFECT_CAP%");
  const mechanism = sentence(mechanismPrepared, {
    EFFECT: effect,
    EFFECT_CAP: capitalizeFirst(effect)
  });'''
if mechanism_anchor not in s:
    raise SystemExit('missing mechanism construction anchor')
s = s.replace(mechanism_anchor, mechanism_replacement)

p.write_text(s)
