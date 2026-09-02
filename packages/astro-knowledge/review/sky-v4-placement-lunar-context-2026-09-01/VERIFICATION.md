# SKY V4 placement lunar context — verification

Release checks:

- 40/40 unique content keys are present in the approved package
- exact local event-day selection for ordinary New Moon, Full Moon, Solar Eclipse, and Lunar Eclipse
- Solar Eclipse replaces ordinary New Moon context; Lunar Eclipse replaces ordinary Full Moon context
- Full Moon and Lunar Eclipse resolve the calculated event-sign/opposite-sign axis
- full page order: placement article → `What changes today` lunar context → curated contextual overlays → motion/conditions → aspects
- fallback order: Hook → lunar context → curated fallback overlay → Lived → Turn
- no runtime model call or prose synthesis
- off-day placement output receives no lunar-context module

Owner approval authorizes serving after repository tests and CI pass.
