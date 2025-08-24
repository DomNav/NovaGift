#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/soroban-env.sh"

if [ $# -lt 5 ]; then
  echo "usage: $0 CONTRACT_ID RECIPIENT_ADDR ASSET_ID AMOUNT_IN EXPIRY_SECS" >&2
  exit 1
fi

CONTRACT_ID="$1"; RECIPIENT="$2"; ASSET="$3"; AMOUNT="$4"; EXP="$5"

$SOROBAN contract invoke \
  --id "$CONTRACT_ID" \
  --source "$CREATOR" \
  --network "$NETWORK" \
  -- \
  create_envelope \
    --creator "$($SOROBAN keys address $CREATOR)" \
    --recipient "$RECIPIENT" \
    --asset "$ASSET" \
    --amount_in "$AMOUNT" \
    --denom "USD" \
    --expiry_secs "$EXP"