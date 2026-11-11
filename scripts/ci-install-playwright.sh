#!/usr/bin/env bash
set -euo pipefail

# The hosted runner's Azure HTTP mirror can consume the browser job's deadline.
# Use Ubuntu's HTTPS archive without changing suites, components or signing keys.
sources_dir="${PLAYWRIGHT_APT_SOURCES_DIR:-/etc/apt}"
backup_dir="$(mktemp -d)"
changed_files=()
original_files=()
restore_on_exit=0

restore_sources() {
  local index failed=0
  for ((index=0; index<${#changed_files[@]}; index++)); do
    if ! sudo tee "${changed_files[index]}" < "${original_files[index]}" > /dev/null; then
      failed=1
    fi
  done
  return "$failed"
}

cleanup() {
  local status=$?
  trap - EXIT
  if ((restore_on_exit)); then
    if ! restore_sources; then status=1; fi
  fi
  if ! rm -rf -- "$backup_dir"; then status=1; fi
  exit "$status"
}
trap cleanup EXIT

shopt -s nullglob
for source_file in "$sources_dir/sources.list" "$sources_dir"/sources.list.d/*.list "$sources_dir"/sources.list.d/*.sources; do
  [[ -f "$source_file" ]] || continue
  original_file="$backup_dir/${#changed_files[@]}.original"
  preferred_file="$backup_dir/${#changed_files[@]}.preferred"
  sudo cat "$source_file" > "$original_file"
  sed -E \
    -e 's#mirror\+file:/etc/apt/apt-mirrors\.txt(/|[[:space:]]|$)#https://archive.ubuntu.com/ubuntu\1#g' \
    -e 's#https?://azure\.archive\.ubuntu\.com/ubuntu(/|[[:space:]]|$)#https://archive.ubuntu.com/ubuntu\1#g' \
    "$original_file" > "$preferred_file"
  if ! cmp -s "$original_file" "$preferred_file"; then
    changed_files+=("$source_file")
    original_files+=("$original_file")
    restore_on_exit=1
    sudo tee "$source_file" < "$preferred_file" > /dev/null
  fi
done

if npx playwright install --with-deps chromium; then
  restore_on_exit=0
  exit 0
else
  primary_status=$?
fi

# A failed preferred host must not erase the runner's native signed mirror
# choices. Retry the complete installation once, never omit OS dependencies.
if ((${#changed_files[@]} == 0)); then exit "$primary_status"; fi
printf '%s\n' 'Preferred Ubuntu archive installation failed; restoring the original signed sources and retrying full Playwright installation once.' >&2
restore_sources
restore_on_exit=0
npx playwright install --with-deps chromium
