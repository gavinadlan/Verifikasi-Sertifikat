import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address (from PRIVATE_KEY):", deployer.address);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  console.log("Contract Address:", contractAddress);

  if (!contractAddress) {
    console.error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
    return;
  }

  try {
    const contract = await ethers.getContractAt("CertificateNFT", contractAddress);
    const ownerAddress = await contract.owner();
    console.log("Contract Owner Address on Amoy:", ownerAddress);

    if (deployer.address.toLowerCase() === ownerAddress.toLowerCase()) {
      console.log("SUCCESS: Deployer matches contract owner!");
    } else {
      console.log("WARNING: Deployer DOES NOT match contract owner!");
    }
  } catch (error: any) {
    console.error("Error reading contract:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
