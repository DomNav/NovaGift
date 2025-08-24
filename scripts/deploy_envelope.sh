#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/soroban-env.sh"

WASM=./contracts/envelope/target/wasm32-unknown-unknown/release/envelope.wasm

cargo build -p envelope --target wasm32-unknown-unknown --release

CONTRACT_ID=$($SOROBAN contract deploy --wasm $WASM --network $NETWORK --source $CREATOR)
echo "CONTRACT_ID=$CONTRACT_ID"

if [ -z "${REFLECTOR_FX_CONTRACT:-}" ]; then
  echo "Set REFLECTOR_FX_CONTRACT to the oracle contract id" >&2
  exit 1
fi

$SOROBAN contract invoke \
  --id $CONTRACT_ID \
  --source $CREATOR \
  --network $NETWORK \
  -- \
  init --reflector_fx "$REFLECTOR_FX_CONTRACT"

echo "Initialized with Reflector FX: $REFLECTOR_FX_CONTRACT"