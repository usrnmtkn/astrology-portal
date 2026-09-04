-- Temporary transport used for the bounded September 4 Content Studio mirror sync.
-- The subsequent migration removes it; keep both files to preserve production
-- migration-history parity without leaving outbound HTTP enabled.

create extension if not exists http with schema extensions;
