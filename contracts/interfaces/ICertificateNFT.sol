// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICertificateNFT
 * @notice Interface for the CertificateNFT contract.
 *         Defines the public API for minting, revoking, and verifying
 *         seminar certificate NFTs.
 */
interface ICertificateNFT {
    // ── Minting ──────────────────────────────────
    function mintCertificate(address recipient, string calldata tokenURI_, bytes calldata signature) external;
    function batchMintCertificate(address[] calldata recipients, string[] calldata tokenURIs, bytes[] calldata signatures) external;

    // ── Revocation ───────────────────────────────
    function revokeCertificate(uint256 tokenId) external;

    // ── Verification / Read ──────────────────────
    function exists(uint256 tokenId) external view returns (bool);
    function isCertificateValid(uint256 tokenId) external view returns (bool);
    function isRevoked(uint256 tokenId) external view returns (bool);
    function totalSupply() external view returns (uint256);
}
