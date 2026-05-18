#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8545}"
HOST="${HOST:-0.0.0.0}"
HARDHAT_HEALTHCHECK_URL="http://127.0.0.1:${PORT}"
MOCKCHAIN_RPC_URL="${BLOCKCHAIN_RPC_URL:-https://skirmish-thicken-derived.ngrok-free.dev}"
LOG_FILE="${LOG_FILE:-hardhat-node.log}"

cleanup() {
  if [[ -n "${NODE_PID:-}" ]] && kill -0 "${NODE_PID}" 2>/dev/null; then
    kill "${NODE_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting Hardhat node on ${HOST}:${PORT}..."
npx hardhat node --hostname "${HOST}" --port "${PORT}" > "${LOG_FILE}" 2>&1 &
NODE_PID="$!"

echo "Waiting for Hardhat JSON-RPC on port ${PORT}..."
for attempt in {1..60}; do
  if curl -s \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    "${HARDHAT_HEALTHCHECK_URL}" >/dev/null; then
    break
  fi

  if ! kill -0 "${NODE_PID}" 2>/dev/null; then
    echo "Hardhat node exited early. Last log lines:"
    tail -n 80 "${LOG_FILE}" || true
    exit 1
  fi

  if [[ "${attempt}" -eq 60 ]]; then
    echo "Timed out waiting for Hardhat node. Last log lines:"
    tail -n 80 "${LOG_FILE}" || true
    exit 1
  fi

  sleep 1
done

echo "Deploying ZimRecruitRegistry..."
BLOCKCHAIN_RPC_URL="${MOCKCHAIN_RPC_URL}" npx hardhat run scripts/deploy.ts --network localhost

CONTRACT_ADDRESS="$(tr -d '\r\n' < deployments/localhost.address)"

echo ""
echo "Mockchain is running."
echo "Mockchain RPC URL : ${MOCKCHAIN_RPC_URL}"
echo "ngrok command     : ngrok http --domain=skirmish-thicken-derived.ngrok-free.dev ${PORT}"
echo "Chain ID          : 31337"
echo "Contract address  : ${CONTRACT_ADDRESS}"
echo "Deployment env    : mockchain/deployments/localhost.env"
echo "Node log          : mockchain/${LOG_FILE}"
echo ""
echo "Keep this terminal open. Press Ctrl+C to stop the node."

wait "${NODE_PID}"
