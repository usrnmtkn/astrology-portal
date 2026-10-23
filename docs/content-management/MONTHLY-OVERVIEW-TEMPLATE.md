# Monthly overview: editorial template and shared-variable contract

## Status and scope

This file records the monthly overview template and naming contract requested for Content Studio. It is an editorial specification, not an installed renderer, a database migration, a published monthly edition, or evidence of a production deployment. Adding this file does not change saved writing, reader eligibility, or publication state.

The template is for the collective sky. It does not describe a natal placement or assume an individual reader's houses. A calendar month and a Sun season are different periods: the month selects events; each seasonal introduction uses the calculated ingress and exit of its own Sun-in-sign visit.

## Editorial structure

Open with a developed seasonal argument, not a list of dates or a collection of astrology keywords. Establish the focus, explain the planet's dignity in the sign, show a recognizable experience, and develop what the sign's approach makes possible. Choose one of the three openings below. They are alternatives, not paragraphs to stack together.

After the opening, select the planetary developments that matter to this month's argument. Give the New Moon and Full Moon their own writing and independent eclipse routing. Add a seasonal transition when relevant, then close with a practical perspective rather than repeating the calendar. Horoscopes remain separate templates.

The rendered structure is:

```mustache
{{seasonOverview}}

{{#hasPlanetaryHighlights}}
{{planetaryHighlights}}
{{/hasPlanetaryHighlights}}

{{#hasNewMoon}}
{{newMoonOverview}}
{{/hasNewMoon}}

{{#hasFullMoon}}
{{fullMoonOverview}}
{{/hasFullMoon}}

{{#hasLunationConnection}}
{{lunationConnection}}
{{/hasLunationConnection}}

{{#hasSeasonTransition}}
{{seasonTransition}}
{{/hasSeasonTransition}}

{{monthlyIntegration}}

{{#hasNorthNodeHoroscopes}}
{{northNodeHoroscopes}}
{{/hasNorthNodeHoroscopes}}
```

These section values are outputs of their own templates and contexts, not undifferentiated writing fields. `planetaryHighlights` contains separately editable, selected event items. `newMoonOverview` and `fullMoonOverview` are independent even when they share a visible editorial heading. Each can contain more than one qualifying event in the selected month.

The order above is an editorial layout, not a claim that the month's New Moon occurs before its Full Moon. A chronological layout must sort the actual events. Do not imply that two lunations belong to the same cycle solely because they occur in the same calendar month.

## Seasonal opening: invitation and possibility

```mustache
From **{{entryDate}}** to **{{exitDate}}**, the Sun moves through {{signTitle}}, bringing our attention to {{placementFocus}}. {{placementDignityMeaning}} Give yourself time to {{placementInvitation}}. {{experienceCollective}}

There is a particular gift in the way {{signTitle}} approaches life. By {{signMethod}}, it helps us {{placementOpportunity}}. What may initially seem like {{signBehavior}} can be a way of {{signPurpose}}. Over the coming weeks, notice what becomes possible when you {{practiceAction}}.
```

`experienceCollective` contains complete authored prose with its own punctuation. It can include several recognizable experiences, but it is not a fragment inserted after an unfinished lead-in.

## Alternative opening: behavior and purpose

This develops the purpose beneath a recognizable behavior.

```mustache
From **{{entryDate}}** to **{{exitDate}}**, the Sun moves through {{signTitle}}, bringing our attention to {{placementFocus}}. {{placementDignityMeaning}} There can be satisfaction in {{livedExperiences}}. {{signTitle}}, {{signDescriptor}}, {{signFunction}}.

But {{signBehavior}} is not the whole point. Beneath {{signTitle}}'s reputation for {{signReputation}} is an interest in {{signPurpose}}. By {{signMethod}}, it helps us {{placementOpportunity}}. The pleasure is not only in {{signBehavior}}; it is in {{placementReward}}.
```

`livedExperiences` is an ordered collection of independently editable examples. The renderer formats the collection as an inline list with “or” before the last item. The examples used here are parallel gerund phrases without final punctuation. There are no permanent `experience1`, `experience2`, or `experienceSentence1` fields.

The collection and `experienceCollective` are not aliases. One holds examples for an inline list; the other holds a complete passage. This opening uses the collection instead of requiring another collective-experience paragraph that repeats it.

## Alternative opening: capacity and possibility

This develops a capacity and what it makes possible. It does not require every sign to be introduced through a stereotype.

```mustache
From **{{entryDate}}** to **{{exitDate}}**, the Sun moves through {{signTitle}}, bringing our attention to {{placementFocus}}. {{placementDignityMeaning}} Give {{invitationSubject}} some attention, and notice {{experienceFocus}} when you {{experienceCondition}}. {{signTitle}}, {{signDescriptor}}, makes a virtue of {{signMethod}}.

Its gift is not simply {{signBehavior}}. {{giftDevelopment}} The invitation is to recognize that {{closingInsight}}.
```

`giftDevelopment` is a complete authored development of the capacity and its consequences. It replaces the earlier numbered gift-outcome fields; it is not a keyword list. All three openings must remain editable as prose templates.

## Planetary highlights

Select a lead development and additional developments only when they add something distinct. Selection is an editorial decision informed by the calculated events, not a claim that the first event in the calendar is the most important. Do not print every ingress, station, aspect, or daily Moon contact into the overview.

A selected event has its own context and writing. The event's description, sign, date, and motion come from the calculation layer. The writing explains why the selected event matters.

### Aspect or station

```mustache
### {{sectionHeading}}

On **{{eventDate}}**, {{eventDescription}}. {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}
```

### Planetary ingress

```mustache
### {{sectionHeading}}

On **{{eventDate}}**, {{eventDescription}}. {{placementDignityMeaning}} {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}
```

Dignity belongs to the planet-sign combination described by the ingress. It must not be borrowed from the Sun season. An aspect without a supplied planet-sign context does not acquire a dignity explanation by default.

## New Moon and Full Moon templates

Keep four independently editable subtemplates. The calculated event selects exactly one subtemplate. A solar eclipse replaces that event's normal New Moon copy; a lunar eclipse replaces that event's normal Full Moon copy. Do not stack an eclipse and an ordinary lunation write-up for the same occurrence.

### New Moon

```mustache
### {{sectionHeading}}

The New Moon in {{signTitle}} on **{{eventDate}}** brings attention to {{eventFocus}}. This is a useful time to {{eventOpportunity}}. {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}
```

### Full Moon

```mustache
### {{sectionHeading}}

The Full Moon in {{signTitle}} on **{{eventDate}}** puts {{eventFocus}} into clearer view. {{experienceCollective}} Notice what this reveals about {{reflectionFocus}}.

The challenge is {{eventChallenge}}. {{eventPractice}}
```

### Solar eclipse

```mustache
### {{sectionHeading}}

The solar eclipse in {{signTitle}} on **{{eventDate}}** can bring a turning point in {{eventFocus}}. {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}
```

### Lunar eclipse

```mustache
### {{sectionHeading}}

The lunar eclipse in {{signTitle}} on **{{eventDate}}** can bring a story involving {{eventFocus}} to a head. {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}
```

The New Moon and Full Moon flags describe qualifying calculated events, including their eclipse variants. No qualifying event means the corresponding section is absent. An eclipse-specific heading or field must be absent in a month without that eclipse type, not displayed as an empty placeholder.

For an existing event with missing required writing, report an editorial source gap. Do not treat missing writing as proof that the event does not exist. Eclipse practice is authored separately; do not automatically reuse ordinary New Moon intention-setting or assert a universal prohibition on important decisions.

`lunationConnection` is optional, separately authored complete prose. It explains a supported relationship between the selected lunations. Do not automatically manufacture a shared metaphor or cycle narrative.

## Seasonal transition

Use the incoming Sun season's own facts and writing. Do not repeat a complete second introduction unless the edition deliberately calls for it.

```mustache
When the Sun enters {{signTitle}} on **{{entryDate}}**, our attention begins to turn toward {{placementFocus}}. {{placementDignityMeaning}} {{experienceCollective}}

The challenge is {{placementChallenge}}. {{placementPractice}}
```

## Closing and horoscopes

`monthlyIntegration` is a complete authored closing that connects the selected themes to a useful perspective or choice. Do not derive it by shortening approved source prose or repeating every event.

`northNodeHoroscopes` is the output of a separate horoscope template with its own calculated context and review. It is not part of `experienceCollective`, the seasonal opening, or the lunation templates. Other horoscope families follow the same separation.

## One naming contract across the app

Names identify content, not paragraph position, sentence count, or grammatical form. Editor labels, descriptions, type information, and validation carry the writing requirements. Reuse a name only when its meaning and value contract are the same.

### Required distinctions

| Name | Editor label | Contract |
| --- | --- | --- |
| `placementDignity` | Planet-in-sign dignity | Calculated structured information under the selected dignity system. Not authored prose. |
| `placementDignityMeaning` | Dignity meaning | Complete authored prose identifying the dignity condition and explaining its significance for this exact planet-sign combination. |
| `experienceCollective` | Collective experience | Complete authored prose describing recognizable feelings, behavior, decisions, or interactions associated with the shared sky. No personal natal-chart assumptions or claim that everyone experiences it. |
| `livedExperiences` | Lived experiences | Repeatable ordered examples. For the behavior opening, each item is a parallel gerund phrase without final punctuation. A collection is not interchangeable with a passage. |
| `experienceBody` | Physical experience | The existing physical-life subject field: energy, rest, pace, physical cues, or sensory experience, without medical claims. Not the article body and not a synonym for collective experience. |
| `placementCollectiveTheme` | Collective theme | The existing larger social or cultural expression of the placement. Not automatically the same content as a recognizable everyday collective experience. |

Collective identifies scope; physical experience identifies a subject. A passage can be collective in scope and physical in subject. The monthly template does not require a physical example.

### Seasonal writing

| Name | Meaning | Writing requirement in these templates |
| --- | --- | --- |
| `placementFocus` | What the selected planet-in-sign period draws attention to | Noun phrase after “attention to.” |
| `placementInvitation` | A useful invitation within that period | Base-form action after “time to.” |
| `signMethod` | How the sign approaches life or a task | Gerund phrase that works after “By” and “a virtue of.” |
| `placementOpportunity` | What that approach makes more available | Base-form action after “helps us.” |
| `signBehavior` | The recognizable behavior being developed or reconsidered | Noun or gerund phrase. Must fit every use within the chosen opening. |
| `signPurpose` | The purpose beneath that behavior | Gerund phrase after “a way of” or “an interest in.” |
| `practiceAction` | The specific action the reader can try | Base-form action after “when you.” |
| `signDescriptor` | A short identifying description of the sign | Appositive noun phrase including its article when needed, such as “a mutable earth sign.” The template does not append another “sign.” |
| `signFunction` | What the sign notices or does | Third-person singular predicate that follows the sign's name. |
| `signReputation` | The reputation being examined in the behavior opening | Noun or gerund phrase after “reputation for.” |
| `placementReward` | What becomes satisfying or possible beyond the behavior itself | Noun or gerund phrase after “it is in.” |
| `invitationSubject` | What deserves attention in the capacity opening | Noun phrase after “Give.” |
| `experienceFocus` | What the reader may notice | Noun phrase after “notice.” |
| `experienceCondition` | The circumstance in which that experience arises | Predicate following “you,” without repeating the subject. |
| `giftDevelopment` | How the capacity develops into useful possibilities | Complete prose with its own punctuation. |
| `closingInsight` | The perspective the capacity opening develops | Complete clause following “recognize that,” without final punctuation. |
| `placementChallenge` | The difficulty specific to the incoming placement | Noun or gerund phrase after “The challenge is.” |
| `placementPractice` | Concrete ways to work with the placement | Complete prose; not interchangeable with the inline `practiceAction`. |

### Event writing and facts

| Name | Meaning | Value contract |
| --- | --- | --- |
| `sectionHeading` | The editorial point of the selected section | Authored heading; do not automatically use generic “Planetary changes” for every section. |
| `eventDate` | Exact event's local calendar date | Read-only, formatted from its calculated timestamp and selected time zone. |
| `eventDescription` | What occurs | Calculated factual clause, without final punctuation. It must not contain an interpretation. |
| `eventFocus` | The subject highlighted by that event | Noun phrase. |
| `eventMeaning` | Why the event matters | Complete authored prose. |
| `eventOpportunity` | A useful possibility associated with the event | Base-form action after “time to.” |
| `eventChallenge` | The specific difficulty or complication | Noun or gerund phrase after “The challenge is.” |
| `eventPractice` | A useful response to the stated difficulty | Complete authored prose. |
| `reflectionFocus` | What the Full Moon's visibility helps the reader examine | Noun phrase after “about.” |
| `entryDate` | Beginning of the selected planetary visit | Read-only date derived from the calculated ingress, not the first day of the month. |
| `exitDate` | End of that same visit | Read-only date derived from the calculated exit, not the last day of the month. |
| `signTitle` | Sign belonging to the current template context | Read-only title; opening season, incoming season, ingress, and lunation contexts resolve independently. |

These are target contracts. Existing fields such as `signMethod`, `placementOpportunity`, `signDescriptor`, and `placementPractice` already have related definitions in the Writing Library. Do not assume every existing value fits a new grammatical frame. Preserve complete approved prose, require an appropriate separately authored value when needed, and validate the rendered result. Do not silently cut a sentence into a phrase.

### Names superseded in the editorial drafts

| Earlier draft name | Final contract |
| --- | --- |
| `dignitySentence` | `placementDignityMeaning` |
| `seasonalFocus` | `placementFocus` |
| `seasonalInvitation` | `placementInvitation` |
| `surfaceBehavior` | `signBehavior` |
| `deeperPurpose` | `signPurpose` |
| `manifestation1Clause`, `manifestation2Clause`, `manifestation3Clause` | An appropriate `livedExperiences` collection, not three new numbered fields |
| `experienceClause1`, `experienceSentence1`, and numbered equivalents | Do not introduce these names |
| `giftOutcome1Clause`, `giftOutcome2Clause`, `giftOutcome3Clause` | `giftDevelopment`, authored as a coherent development |

`experienceGeneral` remains a legacy name in the existing Writing Library. Reconcile it with `experienceCollective` only for content verified as collective-sky writing. Do not rename natal or other audience-specific passages into a collective scope, and do not create two independently editable fields storing the same collective passage. Existing templates and stored values need compatibility handling before any runtime rename.

## Dignity resolution

The renderer supplies `placementDignity`; the editor supplies `placementDignityMeaning`. Prose must not determine the factual classification.

Use the repository's selected traditional sign-level rules rather than infer dignity from descriptive writing. Preserve every applicable condition instead of forcing mutually exclusive labels. A full dignity assessment and a whole-sign assessment are different contracts. Absence of domicile or exaltation is not, by itself, a declaration of peregrine status. Degree-dependent or day/night-dependent dignity must not be represented as constant throughout an entire season. Unsupported planets or points must remain explicitly unsupported rather than receiving an invented traditional dignity.

The opening requires an explanation appropriate to the supplied planet-sign facts. Missing writing is a visible source gap; it is not permission to generate a factual-sounding explanation. A no-major-sign-condition result still needs appropriately scoped explanation and must not be relabeled “in its own territory.” The existing calculation code is `packages/astro-knowledge/engine/timing/conditions.js`; inspect its current contract before implementation.

## Context, storage, and rendering requirements

Use the same names inside each subtemplate while supplying distinct contexts. Do not add `openingSeasonExperience`, `closingSeasonExperience`, `newMoonExperience`, or `fullMoonExperience` merely to distinguish where the same concept is used. The context identifies the selected planet, sign, event, audience, and date window.

Store the reusable template separately from a month/year/time-zone edition. Store each selected event and its writing independently. A changed month must not inherit the previous month's event prose, dates, or source selections. An incoming season must not reuse the opening season's dignity meaning or experience by accident.

Authored values are literal data. Do not execute tokens, control syntax, or object paths found inside authored prose. Only declared template references may compose other templates, with bounded depth and circular-reference detection. Calculated facts cannot be overridden by an editable phrase.

Adopting this specification must preserve existing saved templates and approved source passages. Template deployment is not approval to publish any generated edition. The authoring flow remains: choose month, review highlights, generate draft, edit and approve, publish. A deterministic assembly is not AI generation; any later AI writing integration must use the established governed writer and review workflow.

## Implementation acceptance criteria

- The shared variable picker, template validator, preview renderer, saved data, and publication checks agree on canonical names and types. Legacy names continue to resolve without overwriting newer writing.
- All three opening alternatives render independently. No combination stacks them or forces both a stereotype paragraph and a capacity paragraph.
- Dignity is correct for each exact planet-sign context, supports multiple applicable conditions, and does not equate a missing major condition with peregrine status.
- Collective-experience passages and physical-experience fields remain distinct. Passage and inline-list values are not silently interchanged.
- New Moon and Full Moon events are separate, repeatable, eclipse-aware, and scoped to the selected month and time zone. Empty event sections disappear; missing required writing produces an editorial gap.
- Highlight selection is reviewable, not the complete event list. The lead and additional events remain separately editable.
- Calculated dates use exact ingress and event timestamps, including local-midnight, year-boundary, and daylight-saving cases. No illustrative dates become production defaults.
- Saved approved text, review state, and publication state remain unchanged until the corresponding explicit authoring or publishing action.
- Before reporting the application implementation complete, run the unfiltered Content Studio API contract, targeted rendering and save/reopen regressions, relevant fresh-build browser checks, privacy checks, and existing release gates. Verify the merged revision in production separately.
