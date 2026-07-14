import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying CertificateNFT...");

  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const contract = await CertificateNFT.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`CertificateNFT deployed to: ${address}`);

  // Wait for 5 blocks for verification purposes
  if (process.env.HARDHAT_NETWORK !== "localhost" && process.env.HARDHAT_NETWORK !== "hardhat") {
    console.log("Waiting for 5 blocks...");
    await contract.deploymentTransaction()?.wait(5);
  }

  // Save the contract address to deployments/amoy.json
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentData = {
    address: address,
    network: process.env.HARDHAT_NETWORK || "unknown"
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "amoy.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("Deployment saved to deployments/amoy.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
