import { expect } from "chai";
import { ethers } from "hardhat";
import { ZimRecruitRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZimRecruitRegistry", () => {
  let registry: ZimRecruitRegistry;
  let admin: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
  const SAMPLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("sample-doc-content"));
  const INSTITUTION_ID = 1n;
  const INSTITUTION_NAME = "University of Zimbabwe";

  beforeEach(async () => {
    [admin, verifier, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ZimRecruitRegistry");
    registry = await Factory.deploy(admin.address) as ZimRecruitRegistry;
    await registry.grantRole(VERIFIER_ROLE, verifier.address);
  });

  describe("Deployment", () => {
    it("grants DEFAULT_ADMIN_ROLE to the admin", async () => {
      const DEFAULT_ADMIN = await registry.DEFAULT_ADMIN_ROLE();
      expect(await registry.hasRole(DEFAULT_ADMIN, admin.address)).to.be.true;
    });

    it("starts with zero total attestations", async () => {
      expect(await registry.totalAttestations()).to.equal(0n);
    });
  });

  describe("verify()", () => {
    it("allows a VERIFIER_ROLE address to attest a document", async () => {
      const tx = await registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME);
      const timestamp = await txTimestamp(tx);

      await expect(tx)
        .to.emit(registry, "DocumentVerified")
        .withArgs(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME, verifier.address, timestamp);
    });

    it("increments totalAttestations", async () => {
      await registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME);
      expect(await registry.totalAttestations()).to.equal(1n);
    });

    it("marks the document as valid via isValid()", async () => {
      await registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME);
      expect(await registry.isValid(SAMPLE_HASH)).to.be.true;
    });

    it("reverts if the hash was already attested (duplicate guard)", async () => {
      await registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME);
      await expect(
        registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME)
      ).to.be.revertedWith("ZimRecruit: document already attested");
    });

    it("reverts if called by an address without VERIFIER_ROLE", async () => {
      await expect(
        registry.connect(outsider).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME)
      ).to.be.reverted;
    });

    it("reverts if institution name is empty", async () => {
      await expect(
        registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, "")
      ).to.be.revertedWith("ZimRecruit: institution name cannot be empty");
    });
  });

  describe("revoke()", () => {
    beforeEach(async () => {
      await registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME);
    });

    it("allows the original verifier to revoke", async () => {
      const tx = await registry.connect(verifier).revoke(SAMPLE_HASH);
      const timestamp = await txTimestamp(tx);

      await expect(tx)
        .to.emit(registry, "DocumentRevoked")
        .withArgs(SAMPLE_HASH, verifier.address, timestamp);
    });

    it("marks the document as invalid after revocation", async () => {
      await registry.connect(verifier).revoke(SAMPLE_HASH);
      expect(await registry.isValid(SAMPLE_HASH)).to.be.false;
    });

    it("reverts if revoked twice", async () => {
      await registry.connect(verifier).revoke(SAMPLE_HASH);
      await expect(registry.connect(verifier).revoke(SAMPLE_HASH)).to.be.revertedWith("ZimRecruit: already revoked");
    });

    it("reverts if a different verifier tries to revoke", async () => {
      const [, , , otherVerifier] = await ethers.getSigners();
      await registry.grantRole(VERIFIER_ROLE, otherVerifier.address);
      await expect(registry.connect(otherVerifier).revoke(SAMPLE_HASH))
        .to.be.revertedWith("ZimRecruit: caller is not the original verifier");
    });
  });

  describe("get()", () => {
    it("returns empty attestation for unknown hash", async () => {
      const randomHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      const att = await registry.get(randomHash);
      expect(att.timestamp).to.equal(0n);
    });

    it("returns correct institution data after attestation", async () => {
      await registry.connect(verifier).verify(SAMPLE_HASH, INSTITUTION_ID, INSTITUTION_NAME);
      const att = await registry.get(SAMPLE_HASH);
      expect(att.institutionId).to.equal(INSTITUTION_ID);
      expect(att.institutionName).to.equal(INSTITUTION_NAME);
      expect(att.verifier).to.equal(verifier.address);
      expect(att.revoked).to.be.false;
    });
  });
});

async function txTimestamp(tx: Awaited<ReturnType<ZimRecruitRegistry["verify"]>>): Promise<bigint> {
  const receipt = await tx.wait();
  const block = await ethers.provider.getBlock(receipt!.blockNumber);
  return BigInt(block!.timestamp);
}
