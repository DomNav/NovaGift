#!/usr/bin/env bash
set -euo pipefail

export NETWORK="testnet"
export RPC_URL="https://soroban-testnet.stellar.org"
export SOROBAN="soroban"

export CREATOR="creator"
export RECIPIENT="recipient"

$SOROBAN keys address $CREATOR >/dev/null 2>&1 || $SOROBAN keys generate --global $CREATOR
$SOROBAN keys address $RECIPIENT >/dev/null 2>&1 || $SOROBAN keys generate --global $RECIPIENT