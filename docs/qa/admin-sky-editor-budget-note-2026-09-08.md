# Sky Placement editor bundle allowance — 2026-09-08

The motion-aware Sky Placement editor adds a deferred writing-section form and navigation between the shared planet-in-sign source and the retrograde source. The local production build measures 305.9 kB aggregate JavaScript gzip, 174.2 kB entry gzip, and 613.3 kB entry raw.

The aggregate allowance increases from 305,000 to 307,000 bytes. Entry gzip, entry raw, and largest-chunk limits remain 175,000, 616,000, and 616,000 bytes. The new form is a separate dynamic entry (about 1.6 kB gzip), and the bundle gate explicitly enforces that boundary. Deferred content markers and lazy-group checks remain enforced. No source corpus is added to the browser bundle.

This allowance covers the new editing interface, with narrow room for the small environment-dependent size differences seen in prior builds. Publication and reader data paths are unchanged.
