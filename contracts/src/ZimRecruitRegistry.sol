// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title  ZimRecruitRegistry
 * @author ZimRecruit
 * @notice Tamper-proof attestation registry for verified credentials.
 *         Only addresses granted VERIFIER_ROLE can submit or revoke attestations.
 *         Raw applicant data is NEVER stored on-chain — only the document SHA-256 hash,
 *         institution metadata, verifier address, and timestamp.
 *
 * @dev    Deployed to the local development chain for this project.
 *         The DEFAULT_ADMIN_ROLE is held by the platform admin wallet.
 *         The VERIFIER_ROLE is granted per institution wallet by the admin.
 */
contract ZimRecruitRegistry is AccessControl {

    // ── Roles ────────────────────────────────────────────────────────────────

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ── Data types ───────────────────────────────────────────────────────────

    struct Attestation {
        uint256 institutionId;
        string  institutionName;
        address verifier;
        uint256 timestamp;
        bool    revoked;
    }

    // documentHash (bytes32) → Attestation
    mapping(bytes32 => Attestation) private _attestations;

    // Total attestation counter
    uint256 public totalAttestations;

    // ── Events ───────────────────────────────────────────────────────────────

    event DocumentVerified(
        bytes32 indexed documentHash,
        uint256 indexed institutionId,
        string          institutionName,
        address indexed verifier,
        uint256         timestamp
    );

    event DocumentRevoked(
        bytes32 indexed documentHash,
        address indexed revokedBy,
        uint256         revokedAt
    );

    // ── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param admin The address granted DEFAULT_ADMIN_ROLE (platform multisig).
     */
    constructor(address admin) {
        require(admin != address(0), "ZimRecruit: admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ── Write functions ──────────────────────────────────────────────────────

    /**
     * @notice Attest that a document (identified by its SHA-256 hash) has been
     *         verified by this institution.
     *
     * @param documentHash    SHA-256 hash of the verified document (0x + 64 hex chars).
     * @param institutionId   Numeric identifier of the verifying institution (from MySQL).
     * @param institutionName Human-readable name of the institution (stored for UX).
     *
     * @dev    Reverts if the hash was already attested (duplicate guard).
     *         Only callable by addresses with VERIFIER_ROLE.
     */
    function verify(
        bytes32        documentHash,
        uint256        institutionId,
        string calldata institutionName
    ) external onlyRole(VERIFIER_ROLE) {
        require(
            _attestations[documentHash].timestamp == 0,
            "ZimRecruit: document already attested"
        );
        require(
            bytes(institutionName).length > 0,
            "ZimRecruit: institution name cannot be empty"
        );

        _attestations[documentHash] = Attestation({
            institutionId:   institutionId,
            institutionName: institutionName,
            verifier:        msg.sender,
            timestamp:       block.timestamp,
            revoked:         false
        });

        unchecked { totalAttestations++; }

        emit DocumentVerified(
            documentHash,
            institutionId,
            institutionName,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Revoke a previously issued attestation.
     *         Only the original verifying address can revoke.
     *
     * @param documentHash The hash of the document to revoke.
     */
    function revoke(bytes32 documentHash) external onlyRole(VERIFIER_ROLE) {
        Attestation storage a = _attestations[documentHash];
        require(a.timestamp != 0, "ZimRecruit: attestation not found");
        require(!a.revoked,        "ZimRecruit: already revoked");
        require(
            a.verifier == msg.sender,
            "ZimRecruit: caller is not the original verifier"
        );

        a.revoked = true;
        emit DocumentRevoked(documentHash, msg.sender, block.timestamp);
    }

    // ── Read functions ───────────────────────────────────────────────────────

    /**
     * @notice Retrieve the full attestation record for a document hash.
     * @return The Attestation struct (timestamp == 0 means not attested).
     */
    function get(bytes32 documentHash)
        external
        view
        returns (Attestation memory)
    {
        return _attestations[documentHash];
    }

    /**
     * @notice Convenience view: is this document currently verified and not revoked?
     */
    function isValid(bytes32 documentHash) external view returns (bool) {
        Attestation storage a = _attestations[documentHash];
        return a.timestamp != 0 && !a.revoked;
    }
}
