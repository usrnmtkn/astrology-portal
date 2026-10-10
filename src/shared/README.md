# Shared reader and Studio code

Reader and Studio use the same UI primitives, Calendar composition helpers,
location control, authentication return contract and inventory types here.
The former paths re-export these implementations for existing consumers. Do not
copy a component back into either application or import an API handler for its
types. Node-consumed compatibility exports use explicit `.js` extensions.
The local TypeScript configuration preserves the automatic React JSX runtime
for server rendering tools that do not load either application's Vite config.

`npm run qa:admin-boundary` checks static imports, re-exports and dynamic imports
from this directory and Studio. Shared code may use the existing root writing
contracts. Reader content, services, theme styles and the lunar journal index
remain explicit source dependencies pending their own extraction. Shared code
must not depend on either application's pages, features or orchestration.

Relocation preserves complete source wording and behavior; a shared source move
does not grant editorial approval or change publication rules.
