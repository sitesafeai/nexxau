#!/bin/sh
set -eu

status=0
patterns='AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----|xox[baprs]-[0-9A-Za-z-]{10,}|AIza[0-9A-Za-z_-]{35}|sk_live_[0-9a-zA-Z]{24}|sk_test_[0-9a-zA-Z]{24}|apiKey=[A-Za-z0-9]{16,}|API_KEY=|SECRET=|TOKEN=|PASSWORD=|DATABASE_URL='
allowlist='your-|<|change-me|example|REDACTED'

for file in "$@"; do
  [ -f "$file" ] || continue
  [ "$file" = "scripts/secret_scan.sh" ] && continue
  case "$file" in
    *.png|*.jpg|*.jpeg|*.gif|*.pdf|*.zip|*.tar|*.gz|*.mp4|*.mov|*.m3u8|*.pt|*.onnx|*.weights) continue ;;
  esac
  if grep -E -n "$patterns" "$file" >/dev/null 2>&1; then
    echo "Secret pattern detected in $file" >&2
    while IFS= read -r line; do
      if echo "$line" | grep -E "$patterns" >/dev/null 2>&1; then
        if echo "$line" | grep -E "$allowlist" >/dev/null 2>&1; then
          continue
        fi
        echo "$line" >&2
        status=1
      fi
    done < "$file"
  fi
done

exit "$status"
