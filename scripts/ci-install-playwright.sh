#!/usr/bin/env bash
set -euo pipefail

# The hosted runner's Azure HTTP mirror can consume the browser job's deadline.
# Use Ubuntu's HTTPS archive without changing suites, components or signing keys.
shopt -s nullglob
for source_file in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
  [[ -f "$source_file" ]] || continue
  sudo sed -i -E 's#https?://azure\.archive\.ubuntu\.com/ubuntu(/|[[:space:]]|$)#https://archive.ubuntu.com/ubuntu\1#g' "$source_file"
done

npx playwright install --with-deps chromium
