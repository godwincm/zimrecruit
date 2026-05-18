import { Contract, JsonRpcProvider, Wallet, formatUnits } from "ethers";

// ── ABI (minimal — only the functions we call) ───────────────────────────────
const ABI = [
  "function verify(bytes32 documentHash, uint256 institutionId, string calldata institutionName) external",
  "function revoke(bytes32 documentHash) external",
  "function get(bytes32 documentHash) external view returns (tuple(uint256 institutionId, string institutionName, address verifier, uint256 timestamp, bool revoked))",
  "event DocumentVerified(bytes32 indexed documentHash, uint256 indexed institutionId, string institutionName, address indexed verifier, uint256 timestamp)",
  "event DocumentRevoked(bytes32 indexed documentHash, address indexed by, uint256 at)",
];

const MOCK_CHAIN_ID = 31337;
export const MOCKCHAIN_RPC_URL = "https://skirmish-thicken-derived.ngrok-free.dev";

function assertMockchainConfig() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL ?? MOCKCHAIN_RPC_URL;
  const chainId = Number(process.env.BLOCKCHAIN_CHAIN_ID ?? MOCK_CHAIN_ID);
  const allowedRpc =
    rpcUrl === MOCKCHAIN_RPC_URL ||
    /^https:\/\/[a-z0-9-]+\.ngrok-free\.(app|dev)\/?$/i.test(rpcUrl) ||
    /^https:\/\/[a-z0-9-]+\.ngrok\.io\/?$/i.test(rpcUrl);

  if (chainId !== MOCK_CHAIN_ID || !allowedRpc) {
    throw new Error("Only the local Hardhat mockchain, exposed directly or through ngrok, is supported.");
  }

  return { rpcUrl, chainId };
}

let provider: JsonRpcProvider | null = null;
let wallet: Wallet | null = null;
let registry: Contract | null = null;

if (process.env.CONTRACT_ADDRESS && process.env.VERIFIER_PRIVATE_KEY) {
  try {
    const { rpcUrl, chainId } = assertMockchainConfig();
    provider = new JsonRpcProvider(rpcUrl, { name: "mockchain", chainId });
    
    const privKey = process.env.VERIFIER_PRIVATE_KEY.startsWith("0x")
      ? process.env.VERIFIER_PRIVATE_KEY
      : "0x" + process.env.VERIFIER_PRIVATE_KEY;
    
    wallet = new Wallet(privKey, provider);
    registry = new Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
  } catch (err: any) {
    console.warn("⚠️  Blockchain initialization failed:", err.message);
  }
} else if (!process.env.CONTRACT_ADDRESS || !process.env.VERIFIER_PRIVATE_KEY) {
  console.warn("⚠️  CONTRACT_ADDRESS or VERIFIER_PRIVATE_KEY not configured");
}

export { registry, provider, wallet };

/** Attestation result returned from the chain. */
export interface OnChainAttestation {
  institutionId: bigint;
  institutionName: string;
  verifier: string;
  timestamp: bigint;
  revoked: boolean;
}

/** Submit a verify() transaction and wait for confirmation. */
export async function attest(
  documentHash: string,   // 0x + 64 hex chars
  institutionId: number,
  institutionName: string
): Promise<{ txHash: string; blockNumber: number }> {
  if (!registry) {
    throw new Error("Blockchain not initialized. Set CONTRACT_ADDRESS and VERIFIER_PRIVATE_KEY.");
  }
  
  const tx = await registry.verify(documentHash, institutionId, institutionName, {
    gasLimit: Number(process.env.GAS_LIMIT ?? 250_000),
  });
  const receipt = await tx.wait(1);  // wait 1 confirmation
  if (!receipt) throw new Error("Transaction receipt is null — possible revert.");
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
}

/** Submit a revoke() transaction. */
export async function revokeAttestation(
  documentHash: string
): Promise<{ txHash: string; blockNumber: number }> {
  if (!registry) {
    throw new Error("Blockchain not initialized.");
  }
  
  const tx = await registry.revoke(documentHash, {
    gasLimit: Number(process.env.GAS_LIMIT ?? 250_000),
  });
  const receipt = await tx.wait(1);
  if (!receipt) throw new Error("Revoke receipt is null.");
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
}

/** Read-only: fetch the on-chain attestation for a document hash. */
export async function getAttestation(documentHash: string): Promise<OnChainAttestation | null> {
  if (!registry) {
    throw new Error("Blockchain not initialized.");
  }
  
  const a = await registry.get(documentHash);
  if (a.timestamp === 0n) return null;
  return {
    institutionId: a.institutionId as bigint,
    institutionName: a.institutionName as string,
    verifier: a.verifier as string,
    timestamp: a.timestamp as bigint,
    revoked: a.revoked as boolean,
  };
}

/** Check current verifier wallet balance for monitoring. */
export async function walletBalance(): Promise<string> {
  if (!provider || !wallet) {
    throw new Error("Blockchain not initialized.");
  }
  
  const bal = await provider.getBalance(wallet.address);
  return formatUnits(bal, 18) + " ETH";
}
