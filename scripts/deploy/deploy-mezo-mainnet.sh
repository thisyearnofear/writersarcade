#!/bin/bash
# scripts/deploy/deploy-mezo-mainnet.sh
#
# Deploy MezoBoostedSplitter (and optionally GameNFTMezo) to Mezo MAINNET
# (chainId 31612). Requires MEZO_DEPLOYER_PRIVATE_KEY to hold real BTC on
# Mezo mainnet for gas — check first with:
#   cast balance $(cast wallet address --private-key $MEZO_DEPLOYER_PRIVATE_KEY) \
#     --rpc-url https://rpc-http.mezo.boar.network

set -e

if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

: "${MEZO_DEPLOYER_PRIVATE_KEY:?missing in .env.local}"
: "${PLATFORM_TREASURY_ADDRESS:?missing in .env.local}"

MEZO_MAINNET_RPC="${MEZO_MAINNET_RPC:-https://rpc-http.mezo.boar.network}"
# Canonical MUSD on Mezo mainnet (chainId 31612)
MUSD_MAINNET="0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186"
MEZO_PRECOMPILE="0x7B7c000000000000000000000000000000000001"

echo "⚠️  Deploying to Mezo MAINNET (real BTC gas). Ctrl-C now to abort."
sleep 3

echo "🚀 Deploying MezoBoostedSplitter to Mezo mainnet..."
echo "    MUSD:     $MUSD_MAINNET"
echo "    MEZO:     $MEZO_PRECOMPILE"
echo "    Treasury: $PLATFORM_TREASURY_ADDRESS"

forge create contracts/src/MezoBoostedSplitter.sol:MezoBoostedSplitter \
  --rpc-url "$MEZO_MAINNET_RPC" \
  --private-key "$MEZO_DEPLOYER_PRIVATE_KEY" \
  --legacy \
  --constructor-args "$MUSD_MAINNET" "$MEZO_PRECOMPILE" "$PLATFORM_TREASURY_ADDRESS"

echo ""
echo "✅ Splitter deployed. Next:"
echo "   1. Set NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_MAINNET=<deployed address>"
echo "   2. Optionally deploy GameNFTMezo the same way and set"
echo "      NEXT_PUBLIC_MEZO_GAME_NFT_MAINNET=<address>"
echo "   3. Redeploy the web app so the new env vars ship."
