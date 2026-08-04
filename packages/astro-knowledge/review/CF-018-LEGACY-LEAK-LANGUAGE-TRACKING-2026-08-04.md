# CF-018 legacy leak-language tracking

Status: tracked for a separate owner-reviewed content sweep

CF-018 prohibits `leak`, `leaks`, `leaked`, and `leaking` in newly generated Marie Satori editorial copy. It remains active in the writer, linter, judge, vocabulary, and regression policies.

The legacy global data validator previously applied CF-018 retroactively and flagged the 35 existing files below. This PR does not revise those files. Any replacement wording requires its own owner-reviewed batch and must preserve the original approval provenance until that review occurs.

## Flagged legacy files

1. `data/insights/natal-aspects/mars-conjunction-jupiter.json`
2. `data/insights/natal-aspects/mars-conjunction-neptune.json`
3. `data/insights/natal-aspects/mars-conjunction-saturn.json`
4. `data/insights/natal-aspects/mars-opposition-jupiter.json`
5. `data/insights/natal-aspects/mars-opposition-neptune.json`
6. `data/insights/natal-aspects/mars-sextile-jupiter.json`
7. `data/insights/natal-aspects/mars-sextile-neptune.json`
8. `data/insights/natal-aspects/mars-square-jupiter.json`
9. `data/insights/natal-aspects/mars-square-neptune.json`
10. `data/insights/natal-aspects/mars-trine-neptune.json`
11. `data/insights/natal-aspects/mercury-conjunction-mars.json`
12. `data/insights/natal-aspects/mercury-opposition-mars.json`
13. `data/insights/natal-aspects/mercury-sextile-mars.json`
14. `data/insights/natal-aspects/mercury-trine-mars.json`
15. `data/insights/natal-aspects/moon-conjunction-mars.json`
16. `data/insights/natal-aspects/moon-opposition-mars.json`
17. `data/insights/natal-aspects/moon-sextile-mars.json`
18. `data/insights/natal-aspects/moon-square-mars.json`
19. `data/insights/natal-aspects/sun-conjunction-mars.json`
20. `data/insights/natal-aspects/sun-opposition-mars.json`
21. `data/insights/natal-aspects/sun-sextile-mars.json`
22. `data/insights/natal-aspects/sun-trine-mars.json`
23. `data/modifiers/composite-chart.json`
24. `data/modifiers/nodal-axis-timing-framework.json`
25. `data/points/aspects/natal/lilith-conjunct-mars.json`
26. `data/points/placements/house/lilith-12.json`
27. `data/points/transits/house/lilith-house-12.json`
28. `data/synastry/aspects/A-mars_B-pluto_sextile.json`
29. `data/synastry/aspects/A-mercury_B-neptune_trine.json`
30. `data/synastry/aspects/A-neptune_B-mars_square.json`
31. `data/synastry/aspects/A-neptune_B-mercury_trine.json`
32. `data/synastry/aspects/A-pluto_B-mars_sextile.json`
33. `data/transits/mercury-conjunction-uranus.json`
34. `data/transits/mercury-square-pluto.json`
35. `data/transits/natal/neptune_mars_square.json`

## Future review contract

- Review these files as a dedicated editorial batch, not as CI cleanup.
- Preserve each original line until its replacement receives owner review.
- Do not infer approval for revised wording from CF-018 itself.
- Keep the generated-copy ban active regardless of the legacy sweep status.
