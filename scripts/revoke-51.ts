/**
 * Revokasi Token #51 — untuk bukti Gambar 4.38 (Tabel 4.6 No.3).
 * Jalankan: npx hardhat run scripts/revoke-51.ts --network amoy
 */
import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x74D45A05Ed5D1657C93FC6823Bf04F82BaB0412E";
const TOKEN_ID = 51;

async function main() {
  const [issuer] = await ethers.getSigners();
  const c = await ethers.getContractAt("CertificateNFT", CONTRACT_ADDRESS, issuer);

  console.log(`Issuer     : ${issuer.address}`);
  console.log(`Status awal: isRevoked(${TOKEN_ID}) = ${await c.isRevoked(TOKEN_ID)}`);

  const tx = await c.revokeCertificate(TOKEN_ID);
  console.log(`Tx hash    : ${tx.hash}`);
  await tx.wait();

  console.log(`Status kini: isRevoked(${TOKEN_ID}) = ${await c.isRevoked(TOKEN_ID)}`);
  console.log(`\n✅ Selesai. Buka http://localhost:3000/verify/${TOKEN_ID} → lencana jingga → screenshot Gambar 4.38`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
