export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const CONTRACT_DEPLOY_BLOCK = Number(process.env.NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK || "0");
export const LOG_QUERY_BLOCK_RANGE = Number(process.env.NEXT_PUBLIC_LOG_QUERY_BLOCK_RANGE || "10");
export const LOG_QUERY_LOOKBACK_BLOCKS = Number(process.env.NEXT_PUBLIC_LOG_QUERY_LOOKBACK_BLOCKS || "500");
export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const POLYGONSCAN_URL = process.env.NEXT_PUBLIC_POLYGONSCAN_URL || "https://amoy.polygonscan.com";
export const MAX_BATCH_SIZE = 50;

export const CONTRACT_ABI = [
  // ── Minting ──────────────────────────────────
  "function mintCertificate(address recipient, string calldata tokenURI_, bytes calldata signature) external",
  "function batchMintCertificate(address[] calldata recipients, string[] calldata tokenURIs, bytes[] calldata signatures) external",
  // ── Revocation ───────────────────────────────
  "function revokeCertificate(uint256 tokenId) external",
  // ── Verification / Read ──────────────────────
  "function exists(uint256 tokenId) external view returns (bool)",
  "function isCertificateValid(uint256 tokenId) external view returns (bool)",
  "function isRevoked(uint256 tokenId) external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
  // ── Digital Signature (REVISI) ───────────────
  "function getIssuerSignature(uint256 tokenId) external view returns (bytes)",
  "function getCertificateIssuer(uint256 tokenId) external view returns (address)",
  "function verifyIssuerSignature(uint256 tokenId, bytes32 messageHash) external view returns (bool isValid, address recovered)",
  // ── ERC-721 Standard ─────────────────────────
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function owner() external view returns (address)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  // ── Events ───────────────────────────────────
  "event CertificateMinted(uint256 indexed tokenId, address indexed recipient, string tokenURI)",
  "event CertificateRevoked(uint256 indexed tokenId, address indexed revokedBy)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
