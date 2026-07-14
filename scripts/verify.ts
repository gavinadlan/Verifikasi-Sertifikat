import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments", "amoy.json");
  
  if (!fs.existsSync(deploymentsPath)) {
    console.error("Deployment file not found. Please deploy first.");
    return;
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const address = deploymentData.address;

  console.log(`Verifying contract at address: ${address} on network: ${network.name}`);

  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("Verification successful!");
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Verification failed:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
