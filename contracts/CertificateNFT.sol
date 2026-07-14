// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICertificateNFT.sol";

/**
 * @title CertificateNFT
 * @author Validori
 * @notice ERC-721 smart contract for issuing and verifying seminar certificates
 *         as NFTs on the Polygon network. Each token represents a unique certificate
 *         with immutable metadata stored on IPFS.
 *
 * @dev Key design decisions for thesis scope:
 *  - Ownable: only the deployer (institution) can mint and revoke certificates.
 *  - tokenURI is immutable after minting — no update function is provided.
 *  - Revocation marks a certificate as invalid without burning the token,
 *    preserving the audit trail on-chain.
 *  - Batch minting is capped at 50 to prevent out-of-gas failures.
 *
 * ── REVISI: Digital Signature Verification ───────────────────────────────────
 *  - Setiap sertifikat menyimpan tanda tangan digital (ECDSA) dari issuer.
 *  - Tanda tangan dihasilkan dari hash data sertifikat menggunakan private key
 *    wallet issuer (MetaMask) sebelum minting.
 *  - Siapapun dapat memverifikasi keaslian sertifikat dengan me-recover address
 *    dari signature dan membandingkannya dengan issuer address on-chain.
 *  - Ini membuktikan bahwa sertifikat benar-benar ditandatangani oleh issuer
 *    yang sah, bukan hanya "ada di blockchain".
 * ─────────────────────────────────────────────────────────────────────────────
 */
contract CertificateNFT is ERC721, ERC721URIStorage, Ownable, ICertificateNFT {
    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @dev Auto-incrementing counter for token IDs (starts at 1).
    uint256 private _tokenIdCounter;

    /// @dev Tracks revocation status for each tokenId.
    mapping(uint256 => bool) private _revoked;

    // ── REVISI: Digital Signature Storage ────────────────────────────────────
    /// @dev Menyimpan tanda tangan digital ECDSA dari issuer untuk setiap tokenId.
    ///      Tanda tangan ini dihasilkan dari hash data sertifikat (nama penerima,
    ///      nama event, tanggal, peran, recipient address) menggunakan private key
    ///      wallet issuer via MetaMask eth_sign sebelum transaksi minting.
    mapping(uint256 => bytes) private _issuerSignatures;

    /// @dev Menyimpan address issuer yang menerbitkan setiap sertifikat.
    ///      Digunakan sebagai referensi saat verifikasi signature dilakukan.
    mapping(uint256 => address) private _certificateIssuers;
    // ─────────────────────────────────────────────────────────────────────────

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new certificate NFT is minted.
    /// @param tokenId   The ID of the minted token (indexed for efficient log filtering).
    /// @param recipient The address that received the certificate (indexed).
    /// @param tokenURI  The IPFS URI pointing to the certificate metadata.
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string tokenURI
    );

    /// @notice Emitted when a certificate is revoked by the owner.
    /// @param tokenId The ID of the revoked token (indexed).
    /// @param revokedBy The address that performed the revocation (indexed).
    event CertificateRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy
    );

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() ERC721("CertificateNFT", "CERT") Ownable(msg.sender) {
        _tokenIdCounter = 1;
    }

    // ──────────────────────────────────────────────
    //  Minting
    // ──────────────────────────────────────────────

    /**
     * @notice Mint a single certificate NFT.
     * @param recipient   The wallet address that will own the certificate.
     * @param tokenURI_   The IPFS URI (e.g. "ipfs://Qm...") for the certificate metadata.
     * @param signature   Tanda tangan digital ECDSA dari issuer atas data sertifikat.
     *                    Dihasilkan via MetaMask eth_sign dari keccak256 hash data sertifikat.
     *
     * @dev Only the contract owner (institution) can call this.
     *      Input validation prevents minting to the zero address or with an empty URI.
     *
     * ── REVISI: Parameter `signature` ditambahkan untuk menyimpan tanda tangan
     *    digital issuer on-chain bersama dengan tokenId saat minting. ──────────
     */
    function mintCertificate(
        address recipient,
        string calldata tokenURI_,
        bytes calldata signature
    ) public onlyOwner {
        require(recipient != address(0), "CertificateNFT: mint to zero address");
        require(bytes(tokenURI_).length > 0, "CertificateNFT: empty tokenURI");
        require(signature.length == 65, "CertificateNFT: invalid signature length");

        _mintOne(recipient, tokenURI_, signature);
    }

    /**
     * @notice Mint multiple certificate NFTs in one transaction.
     * @param recipients Array of wallet addresses that will own the certificates.
     * @param tokenURIs  Array of IPFS URIs for each certificate's metadata.
     * @param signatures Array of ECDSA signatures from issuer, one per certificate.
     *
     * @dev Arrays must be the same length and no larger than 50 entries.
     *      Each individual mint is delegated to the internal `_mintOne` function.
     *
     * ── REVISI: Parameter `signatures` ditambahkan untuk batch minting. ───────
     */
    function batchMintCertificate(
        address[] calldata recipients,
        string[] calldata tokenURIs,
        bytes[] calldata signatures
    ) public onlyOwner {
        require(recipients.length == tokenURIs.length, "CertificateNFT: arrays length mismatch");
        require(recipients.length == signatures.length, "CertificateNFT: signatures length mismatch");
        require(recipients.length > 0, "CertificateNFT: empty arrays");
        require(recipients.length <= 50, "CertificateNFT: batch size exceeds limit");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "CertificateNFT: mint to zero address");
            require(bytes(tokenURIs[i]).length > 0, "CertificateNFT: empty tokenURI");
            require(signatures[i].length == 65, "CertificateNFT: invalid signature length");

            _mintOne(recipients[i], tokenURIs[i], signatures[i]);
        }
    }

    // ──────────────────────────────────────────────
    //  Revocation
    // ──────────────────────────────────────────────

    /**
     * @notice Revoke a certificate, marking it as invalid.
     * @param tokenId The ID of the certificate to revoke.
     *
     * @dev The token is NOT burned — it remains on-chain for audit purposes,
     *      but `isCertificateValid()` will return false after revocation.
     *      Only the contract owner can revoke. Revocation is irreversible.
     */
    function revokeCertificate(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "CertificateNFT: token does not exist");
        require(!_revoked[tokenId], "CertificateNFT: already revoked");

        _revoked[tokenId] = true;
        emit CertificateRevoked(tokenId, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  Verification Helpers (used by frontend / QR flow)
    // ──────────────────────────────────────────────

    /**
     * @notice Check whether a token with the given ID exists.
     * @param tokenId The token ID to check.
     * @return True if the token has been minted.
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @notice Check whether a certificate is valid (exists AND not revoked).
     * @param tokenId The token ID to validate.
     * @return True if the certificate is valid.
     */
    function isCertificateValid(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId) && !_revoked[tokenId];
    }

    /**
     * @notice Check whether a certificate has been revoked.
     * @param tokenId The token ID to check.
     * @return True if the certificate has been revoked.
     */
    function isRevoked(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "CertificateNFT: token does not exist");
        return _revoked[tokenId];
    }

    /**
     * @notice Get the total number of certificates minted so far.
     * @return The total supply count.
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    // ── REVISI: Fungsi-fungsi Digital Signature Verification ─────────────────

    /**
     * @notice Mengambil tanda tangan digital issuer untuk sertifikat tertentu.
     * @param tokenId Token ID sertifikat yang ingin diambil signature-nya.
     * @return Tanda tangan digital ECDSA (65 bytes) dari issuer.
     *
     * @dev Digunakan oleh frontend saat verifikasi untuk mendapatkan signature
     *      yang akan di-recover untuk membuktikan keaslian issuer.
     */
    function getIssuerSignature(uint256 tokenId) external view returns (bytes memory) {
        require(_exists(tokenId), "CertificateNFT: token does not exist");
        return _issuerSignatures[tokenId];
    }

    /**
     * @notice Mengambil address issuer yang menerbitkan sertifikat tertentu.
     * @param tokenId Token ID sertifikat.
     * @return Address wallet issuer yang menerbitkan sertifikat ini.
     */
    function getCertificateIssuer(uint256 tokenId) external view returns (address) {
        require(_exists(tokenId), "CertificateNFT: token does not exist");
        return _certificateIssuers[tokenId];
    }

    /**
     * @notice Verifikasi on-chain bahwa signature berasal dari issuer yang tercatat.
     * @param tokenId      Token ID sertifikat yang diverifikasi.
     * @param messageHash  Hash dari data sertifikat yang ditandatangani (keccak256).
     *                     Frontend harus menghitung ulang hash yang sama dengan saat minting.
     * @return isValid     True jika signature valid dan berasal dari issuer yang tercatat.
     * @return recovered   Address yang berhasil di-recover dari signature.
     *
     * @dev Menggunakan ECDSA recover via ecrecover() Solidity built-in.
     *      messageHash harus menggunakan Ethereum Signed Message prefix ("\x19Ethereum Signed Message:\n32")
     *      karena MetaMask eth_sign menambahkan prefix ini secara otomatis.
     */
    function verifyIssuerSignature(
        uint256 tokenId,
        bytes32 messageHash
    ) external view returns (bool isValid, address recovered) {
        require(_exists(tokenId), "CertificateNFT: token does not exist");

        bytes memory sig = _issuerSignatures[tokenId];
        require(sig.length == 65, "CertificateNFT: no signature stored");

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        recovered = _recoverSigner(ethSignedHash, sig);
        isValid = (recovered == _certificateIssuers[tokenId]);
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    /**
     * @dev Internal function that performs a single mint operation.
     *      Extracted to avoid code duplication between `mintCertificate`
     *      and `batchMintCertificate`.
     *
     * @param recipient  The wallet address to receive the certificate.
     * @param tokenURI_  The IPFS URI for the certificate metadata.
     * @param signature  Tanda tangan digital ECDSA dari issuer.
     *
     * ── REVISI: Parameter `signature` ditambahkan dan disimpan ke mapping. ───
     */
    function _mintOne(
        address recipient,
        string calldata tokenURI_,
        bytes calldata signature
    ) internal {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _issuerSignatures[tokenId] = signature;
        _certificateIssuers[tokenId] = msg.sender;

        emit CertificateMinted(tokenId, recipient, tokenURI_);
    }

    /**
     * @dev Recover signer address dari Ethereum signed message hash dan signature.
     *      Implementasi manual ecrecover untuk memisahkan r, s, v dari bytes signature.
     *
     * @param ethSignedHash Hash yang sudah ditambahkan Ethereum prefix.
     * @param sig           Signature 65 bytes (r=32, s=32, v=1).
     * @return              Address yang menghasilkan signature ini.
     */
    function _recoverSigner(
        bytes32 ethSignedHash,
        bytes memory sig
    ) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) v += 27;

        require(v == 27 || v == 28, "Invalid signature v value");

        return ecrecover(ethSignedHash, v, r, s);
    }

    /**
     * @dev Check if a token exists by attempting `_ownerOf`.
     *      OpenZeppelin v5 removed the public `_exists` function,
     *      so we re-implement it using `_ownerOf`.
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // ──────────────────────────────────────────────
    //  Required Overrides (Solidity linearization)
    // ──────────────────────────────────────────────

    /// @inheritdoc ERC721URIStorage
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @inheritdoc ERC721URIStorage
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}