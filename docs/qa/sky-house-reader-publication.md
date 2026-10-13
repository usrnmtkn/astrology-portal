# Published Sky house passages and reader admission

On October 13, the owner authorized publishing the exact twelve Sun-in-Libra
house horoscopes approved in task 01a13201-e1a0-75c0-ab9b-f1b8aa29d3ed.
Content Studio saved and published all twelve revisions through its normal
version-checked package revision action. After reload, each house panel reported
Live and its complete text fingerprint matched the approved local reference.

The public POST /api/content-reader request for those twelve exact keys returned
zero rows while the publication ledger identified twelve live row versions.
The endpoint's explicit package-role list omitted house_horoscope_core, even
though the canonical Sky resolver consumes that role. Live status alone was
therefore insufficient evidence that the passages reached readers.

The repair admits that existing role only for the canonical house key shape,
houses 1 through 12, and the second_person_block grammar frame. Existing review,
publication, source-role, retirement and private-field checks remain in force.
No reader wording, moving facts or approval records are changed by this PR.

The actual-handler regression returns all twelve synthetic approved house
passages losslessly and excludes draft/reference/held/unapproved variants,
invalid house keys, invalid grammar and private source/history fields.
Production acceptance requires the public endpoint to return all twelve exact
approved passages, followed by a rendered Sky reader check. A Studio badge or
publication-ledger entry alone is not that acceptance evidence.
