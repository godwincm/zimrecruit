import { artifacts, ethers, network } from "hardhat";
import fs from "node:fs/promises";
import path from "node:path";

const MOCKCHAIN_RPC_URL = "https://skirmish-thicken-derived.ngrok-free.dev";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const fallbackVerifier = signers[1] ?? deployer;

  const adminAddress = process.env.PLATFORM_ADMIN_ADDRESS || deployer.address;
  const verifierAddress = process.env.VERIFIER_WALLET_ADDRESS || fallbackVerifier.address;
  const verifierPrivateKey = process.env.VERIFIER_PRIVATE_KEY;
  if (!verifierPrivateKey) {
    throw new Error("Set VERIFIER_PRIVATE_KEY to the mockchain verifier account private key before deployment.");
  }

  console.log("");
  console.log("Deploying ZimRecruitRegistry mockchain contract");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${network.config.chainId ?? 31337}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Admin    : ${adminAddress}`);
  console.log(`Verifier : ${verifierAddress}`);

  const Registry = await ethers.getContractFactory("ZimRecruitRegistry");
  const registry = await Registry.deploy(adminAddress);
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  const deploymentTx = registry.deploymentTransaction();

  const verifierRole = await registry.VERIFIER_ROLE();
  const grantTx = await registry.grantRole(verifierRole, verifierAddress);
  await grantTx.wait();

  const deploymentDir = path.resolve("deployments");
  await fs.mkdir(deploymentDir, { recursive: true });

  const artifact = await artifacts.readArtifact("ZimRecruitRegistry");
  const deployment = {
    contractName: "ZimRecruitRegistry",
    contractAddress,
    chainId: network.config.chainId ?? 31337,
    network: network.name,
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL ?? MOCKCHAIN_RPC_URL,
    adminAddress,
    deployerAddress: deployer.address,
    verifierAddress,
    verifierPrivateKey,
    deploymentTxHash: deploymentTx?.hash ?? null,
    verifierRoleGrantTxHash: grantTx.hash,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const deploymentJsonPath = path.join(deploymentDir, `${network.name}.json`);
  const addressPath = path.join(deploymentDir, `${network.name}.address`);
  const envPath = path.join(deploymentDir, `${network.name}.env`);

  await fs.writeFile(deploymentJsonPath, JSON.stringify(deployment, null, 2) + "\n");
  await fs.writeFile(addressPath, `${contractAddress}\n`);
  await fs.writeFile(
    envPath,
    [
      `BLOCKCHAIN_RPC_URL=${process.env.BLOCKCHAIN_RPC_URL ?? MOCKCHAIN_RPC_URL}`,
      "BLOCKCHAIN_CHAIN_ID=31337",
      `VERIFIER_PRIVATE_KEY=${verifierPrivateKey}`,
      `VERIFIER_WALLET_ADDRESS=${verifierAddress}`,
      `CONTRACT_ADDRESS=${contractAddress}`,
      "",
    ].join("\n")
  );

  console.log("");
  console.log("ZimRecruitRegistry deployed");
  console.log(`Contract : ${contractAddress}`);
  console.log(`Grant tx : ${grantTx.hash}`);
  console.log("");
  console.log("Saved deployment files:");
  console.log(`- ${deploymentJsonPath}`);
  console.log(`- ${addressPath}`);
  console.log(`- ${envPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
