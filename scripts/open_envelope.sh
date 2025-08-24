#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/soroban-env.sh"

if [ $# -lt 2 ]; then
  echo "usage: $0 CONTRACT_ID ENVELOPE_ID" >&2
  exit 1
fi

CONTRACT_ID="$1"; ID="$2"

$SOROBAN contract invoke \
  --id "$CONTRACT_ID" \
  --source "$RECIPIENT" \
  --network "$NETWORK" \
  -- \
  open_envelope \
    --recipient "$($SOROBAN keys address $RECIPIENT)" \
    --id "$ID"