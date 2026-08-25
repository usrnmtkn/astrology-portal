# Protected lunation book-body integrity

Date: 2026-08-24

The Pisces lunar-eclipse assembly briefly allowed complete replacement bodies
for Houses 4 and 10. That path rewrote protected book prose and allowed new
sentences to displace the owner's exact source text.

Complete body replacements are now prohibited. Their records are retained as
non-serving history. Serving eclipse cards reuse the byte-exact protected book
remainder, except for the two owner-approved Pisces intention omissions whose
offsets, source text, and hashes are stored explicitly.

Both resolvers now recompute the source and emitted-body hashes at render time,
including the spec-named `preservedBookRemainderSha256` gate.
Source or remainder drift fails with `BOOK_BODY_MODIFIED`; drift in another
approved eclipse section fails with `ECLIPSE_SECTION_MODIFIED`; and a rendered
part without a source key fails with `ECLIPSE_PROVENANCE_MISSING`. Review-held
continuity candidates remain non-serving.
