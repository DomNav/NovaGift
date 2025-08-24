#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/soroban-env.sh"

ADDR_CREATOR=$($SOROBAN keys address $CREATOR)
ADDR_RECIPIENT=$($SOROBAN keys address $RECIPIENT)

echo "Creator:   $ADDR_CREATOR"
echo "Recipient: $ADDR_RECIPIENT"
echo "Requesting Friendbot XLM..."
curl -s "https://friendbot.stellar.org/?addr=$ADDR_CREATOR" >/dev/null || true
curl -s "https://friendbot.stellar.org/?addr=$ADDR_RECIPIENT" >/dev/null || true
echo "Done."