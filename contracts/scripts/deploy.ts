import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\nDeploying ZimRecruitRegistry");
  console.log(`   Network   : ${network.name} (chainId: ${network.config.chainId})`);
  console.log(`   Deployer  : ${deployer.address}`);
  console.log(`   Balance   : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const adminAddress = process.env.PLATFORM_ADMIN_ADDRESS ?? deployer.address;
  console.log(`   Admin     : ${adminAddress}`);

  const Registry = await ethers.getContractFactory("ZimRecruitRegistry");
  const registry = await Registry.deploy(adminAddress);
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  const deployTx = registry.deploymentTransaction()!;

  console.log("\nZimRecruitRegistry deployed");
  console.log(`   Address   : ${contractAddress}`);
  console.log(`   Tx hash   : ${deployTx.hash}`);

  if (process.env.VERIFIER_WALLET_ADDRESS) {
    const VERIFIER_ROLE = await registry.VERIFIER_ROLE();
    const tx = await registry.grantRole(VERIFIER_ROLE, process.env.VERIFIER_WALLET_ADDRESS);
    await tx.wait();
    console.log(`   VERIFIER_ROLE granted to ${process.env.VERIFIER_WALLET_ADDRESS}`);
  }

  console.log("\nAdd to your .env:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   BLOCKCHAIN_CHAIN_ID=${network.config.chainId}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
