import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
    return;
  }

  const contract = await ethers.getContractAt("CertificateNFT", contractAddress);

  // Build test message (same format as signCertificate.ts)
  const message = [
    `Validori Certificate`,
    `Recipient: Test User`,
    `Event: Test Event`,
    `Date: 2024-12-15`,
    `Role: Peserta`,
    `Wallet: ${deployer.address.toLowerCase()}`,
    `CertNo: TEST-001`,
  ].join('\n');

  console.log("Message:", message);

  // Hash + sign binary hash (same as production signCertificateMessage)
  const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
  const binaryHash = ethers.getBytes(messageHash);
  const signature = await deployer.signMessage(binaryHash);

  console.log("Signature:", signature);
  console.log("Signature length:", ethers.getBytes(signature).length, "bytes");

  // Try minting
  try {
    console.log("\nAttempting mintCertificate on Amoy...");
    const tx = await contract.mintCertificate(
      deployer.address,
      "ipfs://QmTestMetadataForDebug",
      signature
    );
    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ SUCCESS! Gas used:", receipt!.gasUsed.toString());
  } catch (err: any) {
    console.error("❌ MINTING FAILED:");
    console.error("  Code:", err.code);
    console.error("  Reason:", err.reason);
    console.error("  Message:", err.message?.slice(0, 300));
    if (err.data) console.error("  Data:", err.data);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
