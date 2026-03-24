#!/usr/bin/env bash
set -euo pipefail

sed -E \
  -e 's/((EXPO_PUBLIC_)?[A-Z0-9_]*(TOKEN|KEY|SECRET|PASSWORD|CLIENT_ID|CLIENT_SECRET)[A-Z0-9_]*=)[^[:space:]]+/\1[REDACTED]/g' \
  -e 's/((x-ncp-apigw-api-key(-id)?|authorization|bearer)[=: ]+)([^[:space:]"'"'"'"'"']+)/\1[REDACTED]/Ig' \
  -e 's/\b(pk|sk)\.[A-Za-z0-9._-]+/[REDACTED_TOKEN]/g'
