# Mockchain and ngrok Guide

ZimRecruit uses only the local Hardhat mockchain exposed through this ngrok URL:

```text
https://skirmish-thicken-derived.ngrok-free.dev
```

The tunnel must forward to the local Hardhat JSON-RPC process on port `8545`. Any other blockchain RPC network is unsupported for this project.

## Start the mockchain

From the project root:

```bash
cd mockchain
npm install
bash ./start.sh
```

The script starts Hardhat on port `8545`, deploys `ZimRecruitRegistry`, grants the verifier role, and writes deployment values to:

```text
mockchain/deployments/localhost.env
mockchain/deployments/localhost.json
mockchain/deployments/localhost.address
```

## Expose Hardhat

Keep `mockchain/start.sh` running, then make sure ngrok forwards the fixed domain to port `8545`.

```bash
ngrok http --domain=skirmish-thicken-derived.ngrok-free.dev 8545
```

## `.env` values

```env
BLOCKCHAIN_RPC_URL=https://skirmish-thicken-derived.ngrok-free.dev
BLOCKCHAIN_CHAIN_ID=31337
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VERIFIER_PRIVATE_KEY=your-mockchain-verifier-private-key
VERIFIER_WALLET_ADDRESS=0xyourmockchainverifierwallet000000000000000000
```
