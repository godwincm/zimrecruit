// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZimRecruitRegistry
 * @notice Tamper-proof attestation registry for verified credentials.
 *         Only addresses granted VERIFIER_ROLE can submit or revoke attestations.
 *         Raw applicant data is never stored on-chain.
 */
contract ZimRecruitRegistry is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct Attestation {
        uint256 institutionId;
        string institutionName;
        address verifier;
        uint256 timestamp;
        bool revoked;
    }

    mapping(bytes32 => Attestation) private _attestations;

    uint256 public totalAttestations;

    event DocumentVerified(
        bytes32 indexed documentHash,
        uint256 indexed institutionId,
        string institutionName,
        address indexed verifier,
        uint256 timestamp
    );

    event DocumentRevoked(
        bytes32 indexed documentHash,
        address indexed revokedBy,
        uint256 revokedAt
    );

    /**
     * @param admin The address granted DEFAULT_ADMIN_ROLE.
     */
    constructor(address admin) {
        require(admin != address(0), "ZimRecruit: admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function verify(
        bytes32 documentHash,
        uint256 institutionId,
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
            institutionId: institutionId,
            institutionName: institutionName,
            verifier: msg.sender,
            timestamp: block.timestamp,
            revoked: false
        });

        unchecked {
            totalAttestations++;
        }

        emit DocumentVerified(
            documentHash,
            institutionId,
            institutionName,
            msg.sender,
            block.timestamp
        );
    }

    function revoke(bytes32 documentHash) external onlyRole(VERIFIER_ROLE) {
        Attestation storage a = _attestations[documentHash];
        require(a.timestamp != 0, "ZimRecruit: attestation not found");
        require(!a.revoked, "ZimRecruit: already revoked");
        require(
            a.verifier == msg.sender,
            "ZimRecruit: caller is not the original verifier"
        );

        a.revoked = true;
        emit DocumentRevoked(documentHash, msg.sender, block.timestamp);
    }

    function get(bytes32 documentHash)
        external
        view
        returns (Attestation memory)
    {
        return _attestations[documentHash];
    }

    function isValid(bytes32 documentHash) external view returns (bool) {
        Attestation storage a = _attestations[documentHash];
        return a.timestamp != 0 && !a.revoked;
    }
}
