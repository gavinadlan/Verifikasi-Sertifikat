import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) return;

  // Try calling with OLD ABI (2 params, no signature)
  const OLD_ABI = [
    "function mintCertificate(address recipient, string calldata tokenURI_) external",
    "function totalSupply() external view returns (uint256)",
    "function owner() external view returns (address)",
  ];

  const contract = new ethers.Contract(contractAddress, OLD_ABI, deployer);
  
  console.log("Owner:", await contract.owner());
  console.log("Total Supply:", (await contract.totalSupply()).toString());

  try {
    console.log("\nTrying OLD 2-param mintCertificate...");
    const tx = await contract.mintCertificate(
      deployer.address,
      "ipfs://QmTestOldABI"
    );
    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ OLD ABI WORKS! Gas used:", receipt!.gasUsed.toString());
    console.log(">>> CONTRACT IS OLD VERSION — needs redeployment! <<<");
  } catch (err: any) {
    console.error("❌ OLD ABI also failed:", err.reason || err.message?.slice(0, 200));
    console.log(">>> Contract might be a different version entirely.");
  }
}

main().catch(console.error);
