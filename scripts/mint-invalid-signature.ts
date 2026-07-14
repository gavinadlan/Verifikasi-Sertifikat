/**
 * MINT TOKEN UJI DENGAN SIGNATURE TIDAK VALID
 * ============================================
 * Untuk bukti Tabel 4.6 No.7 / Gambar 4.41:
 * panel "Tanda Tangan Digital TIDAK VALID" di halaman verifikasi.
 *
 * Cara kerja:
 *   - Meminjam tokenURI dari token valid yang sudah ada, sehingga halaman
 *     verifikasi tetap bisa memuat metadata dari IPFS.
 *   - Signature dibuat oleh wallet ACAK atas pesan palsu. Panjangnya tetap
 *     65 byte sehingga lolos require() di contract, tetapi recovered address
 *     tidak akan pernah cocok dengan issuer on-chain → panel merah.
 *
 * Jalankan:
 *   npx hardhat run scripts/mint-invalid-signature.ts --network amoy
 */
import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x74D45A05Ed5D1657C93FC6823Bf04F82BaB0412E";
const SOURCE_TOKEN_ID = 3; // token valid yang metadata-nya dipinjam

async function main() {
  const [issuer] = await ethers.getSigners();
  console.log(`Issuer  : ${issuer.address}`);

  const contract = await ethers.getContractAt(
    "CertificateNFT",
    CONTRACT_ADDRESS,
    issuer
  );

  const tokenURI = await contract.tokenURI(SOURCE_TOKEN_ID);
  console.log(`tokenURI: ${tokenURI} (dipinjam dari Token #${SOURCE_TOKEN_ID})`);

  // Signature sengaja dibuat tidak valid (wallet acak + pesan palsu)
  const randomWallet = ethers.Wallet.createRandom();
  const fakeHash = ethers.keccak256(
    ethers.toUtf8Bytes("pesan palsu untuk pengujian Tabel 4.6 No.7")
  );
  const invalidSignature = await randomWallet.signMessage(
    ethers.getBytes(fakeHash)
  );

  console.log("\nMinting token uji dengan signature TIDAK VALID...");
  const tx = await contract.mintCertificate(
    issuer.address,
    tokenURI,
    invalidSignature
  );
  console.log(`Tx hash : ${tx.hash}`);
  const receipt = await tx.wait();

  // Ambil tokenId dari event CertificateMinted
  let mintedId = "?";
  for (const log of receipt!.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "CertificateMinted") {
        mintedId = parsed.args[0].toString();
        break;
      }
    } catch {
      /* log bukan milik contract ini */
    }
  }

  console.log(`\n✅ Selesai. Token uji: #${mintedId}`);
  console.log(`Buka: http://localhost:3000/verify/${mintedId}`);
  console.log(
    `Harusnya muncul panel merah "Tanda Tangan Digital TIDAK VALID" → screenshot untuk Gambar 4.41.`
  );
  console.log(
    `\nCatatan: token ini khusus untuk pengujian. Setelah screenshot, boleh` +
      ` direvokasi via dashboard (sekalian jadi bahan Gambar 4.38 kalau butuh).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
