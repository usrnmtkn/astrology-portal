# Sky editable phrase values — 2026-09-12

## Owner request

After selecting a planet and sign in Content Studio, the **Editable phrase variables** accordion must show the actual content for that selected placement, not only variable definitions. Editors must also have a direct edit action for each variable.

## UI contract

- **Calculated Sky variables** remains the read-only runtime-fact accordion.
- **Editable phrase variables** loads values for the selected planet and sign.
- If a Writing Library already exists, the accordion shows its saved local or linked values.
- If the Writing Library is not installed yet, the accordion shows the governed content that will prefill each variable.
- Every phrase variable has a direct edit action. The editor opens the matching Writing Library source, and the matching group/textarea receives focus when possible.
- Empty optional variables are explicitly shown as empty rather than receiving invented prose.
