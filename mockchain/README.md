# ZimRecruit Mockchain

This folder runs the local Hardhat blockchain, deploys `ZimRecruitRegistry`, grants `VERIFIER_ROLE`, and writes the deployment values your API needs.

## Local setup

```bash
cd mockchain
npm install
bash ./start.sh
```

The local chain ID is `31337`. The app RPC must be the ngrok tunnel that forwards to the local Hardhat node:

```env
BLOCKCHAIN_RPC_URL=https://skirmish-thicken-derived.ngrok-free.dev
BLOCKCHAIN_CHAIN_ID=31337
```

Start ngrok with the fixed domain:

```bash
ngrok http --domain=skirmish-thicken-derived.ngrok-free.dev 8545
```

The script writes:

- `mockchain/deployments/localhost.json`
- `mockchain/deployments/localhost.address`
- `mockchain/deployments/localhost.env`
