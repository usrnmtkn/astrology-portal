#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_WORKSPACE:?The checkout workspace is required}"
: "${GITHUB_SHA:?The workflow source revision is required}"

# Checkout's temporary HOME does not persist into container run steps. Trust
# only this job's exact checkout, and verify its default workflow revision.
git config --global --add safe.directory "$GITHUB_WORKSPACE"
test "$(git -C "$GITHUB_WORKSPACE" rev-parse --show-toplevel)" = "$GITHUB_WORKSPACE"
test "$(git -C "$GITHUB_WORKSPACE" rev-parse HEAD)" = "$GITHUB_SHA"

# Preserve the hosted runner's supported system-font stack inside the image.
# The workflow mounts it read-only; only this container's font cache is rebuilt.
test -d /usr/share/fonts/runner
fc-cache -f
