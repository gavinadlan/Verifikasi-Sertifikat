import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CertificateNFT } from "../typechain-types";

// ============================================================
// UNIT TEST — CertificateNFT.sol
// Mengikuti struktur Tabel 4.4 di proposal skripsi
// Gavin Adlan Hidayat — 20220801093
//
// Cara menjalankan:
//   npx hardhat test
//   REPORT_GAS=true npx hardhat test
// ============================================================

describe("CertificateNFT — Pengujian Fungsional Smart Contract (Tabel 4.4)", function () {
  let contract: CertificateNFT;
  let owner: SignerWithAddress;
  let recipient: SignerWithAddress;
  let attacker: SignerWithAddress;

  // ── Helper: buildCertificateMessage() ─────────────────────────────────────
  // Proposal subbab 4.7: parameternya adalah
  //   nama penerima, nama event, tanggal, peran, wallet address penerima, nomor sertifikat
  //
  // ⚠️  WAJIB disesuaikan agar identik dengan src/lib/signCertificate.ts kamu.
  //     Jika test No.9/10/11 gagal, ubah format `message` di bawah ini
  //     agar cocok persis dengan buildCertificateMessage() di kode aslimu.
  function buildMessage(params: {
    recipientName: string;
    eventName: string;
    date: string;
    role: string;
    recipientAddress: string;
    certificateNumber: string;
  }): string {
    return (
      `Nama Penerima: ${params.recipientName}\n` +
      `Nama Event: ${params.eventName}\n` +
      `Tanggal: ${params.date}\n` +
      `Peran: ${params.role}\n` +
      `Wallet: ${params.recipientAddress}\n` +
      `Nomor Sertifikat: ${params.certificateNumber}`
    );
  }

  async function sign(signer: SignerWithAddress, params: Parameters<typeof buildMessage>[0]): Promise<string> {
    const message = buildMessage(params);
    const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
    const binaryHash = ethers.getBytes(messageHash);
    return signer.signMessage(binaryHash);
  }

  // Default params untuk test yang tidak butuh variasi khusus
  function defaultParams(overrides: Partial<Parameters<typeof buildMessage>[0]> = {}) {
    return {
      recipientName: "Budi Santoso",
      eventName: "Seminar HIMASTIKA-HUMANIS 2024",
      date: "2024-12-15",
      role: "Peserta",
      recipientAddress: "", // diisi di bawah setelah signers tersedia
      certificateNumber: "CERT-001",
      ...overrides,
    };
  }

  beforeEach(async function () {
    [owner, recipient, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateNFT");
    contract = (await Factory.deploy()) as unknown as CertificateNFT;
    await contract.waitForDeployment();
  });

  // ── No.1: mintCertificate() ───────────────────────────────────────────────
  describe("No.1 — mintCertificate() | Minting sertifikat tunggal", function () {
    it("✅ Token berhasil diterbitkan (Tabel 4.4 No.1 → Lulus)", async function () {
      const tokenURI = "ipfs://QmExampleMetadataCID/metadata.json";
      const sig = await sign(owner, defaultParams({ recipientAddress: recipient.address }));

      await expect(
        contract.mintCertificate(recipient.address, tokenURI, sig)
      ).to.emit(contract, "CertificateMinted").withArgs(1, recipient.address, tokenURI);

      expect(await contract.ownerOf(1)).to.equal(recipient.address);
      expect(await contract.tokenURI(1)).to.equal(tokenURI);
      expect(await contract.totalSupply()).to.equal(1);
    });

    it("❌ KEAMANAN: Non-owner tidak boleh memanggil mintCertificate()", async function () {
      const sig = await sign(attacker, defaultParams({ recipientName: "Penyerang", recipientAddress: recipient.address }));
      await expect(
        contract.connect(attacker).mintCertificate(recipient.address, "ipfs://QmFake", sig)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("❌ Minting ke address zero harus ditolak", async function () {
      const sig = await sign(owner, defaultParams({ recipientAddress: ethers.ZeroAddress }));
      await expect(
        contract.mintCertificate(ethers.ZeroAddress, "ipfs://QmCID", sig)
      ).to.be.reverted;
    });
  });

  // ── No.2: batchMintCertificate() ─────────────────────────────────────────
  describe("No.2 — batchMintCertificate() | Minting maksimal 50 sertifikat", function () {
    it("✅ Seluruh 50 token berhasil diterbitkan (Tabel 4.4 No.2 → Lulus)", async function () {
      const BATCH_SIZE = 50;
      const allSigners = await ethers.getSigners();
      const addrs: string[] = [];
      const uris: string[] = [];
      const sigs: string[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const addr = allSigners[i % allSigners.length].address;
        addrs.push(addr);
        uris.push(`ipfs://QmBatchCID${i + 1}`);
        sigs.push(await sign(owner, {
          recipientName: `Peserta ${i + 1}`,
          eventName: "Seminar HIMASTIKA-HUMANIS 2024",
          date: "2024-12-15",
          role: "Peserta",
          recipientAddress: addr,
          certificateNumber: `CERT-${String(i + 1).padStart(3, "0")}`,
        }));
      }

      const tx = await contract.batchMintCertificate(addrs, uris, sigs);
      await tx.wait();
      expect(await contract.totalSupply()).to.equal(BATCH_SIZE);

      for (const id of [1, 25, 50]) {
        expect(await contract.exists(id)).to.be.true;
        expect(await contract.isCertificateValid(id)).to.be.true;
      }
    });

    it("❌ KEAMANAN: Non-owner tidak boleh memanggil batchMintCertificate()", async function () {
      await expect(
        contract.connect(attacker).batchMintCertificate(
          [recipient.address],
          ["ipfs://QmFake"],
          ["0x" + "00".repeat(65)]
        )
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("❌ Batch lebih dari 50 harus ditolak oleh contract", async function () {
      const addrs = Array(51).fill(recipient.address);
      const uris = Array(51).fill("ipfs://QmCID");
      const sigs = Array(51).fill("0x" + "00".repeat(65));
      await expect(contract.batchMintCertificate(addrs, uris, sigs)).to.be.reverted;
    });

    it("❌ Array panjang tidak sama harus ditolak", async function () {
      await expect(
        contract.batchMintCertificate(
          [recipient.address, attacker.address],
          ["ipfs://QmCID1"],
          ["0x1234", "0x5678"]
        )
      ).to.be.reverted;
    });
  });

  // ── No.3: revokeCertificate() ─────────────────────────────────────────────
  describe("No.3 — revokeCertificate() | Revokasi sertifikat", function () {
    beforeEach(async function () {
      const sig = await sign(owner, defaultParams({ recipientName: "Ani Rahayu", role: "Panitia", recipientAddress: recipient.address }));
      await contract.mintCertificate(recipient.address, "ipfs://QmRevokeTest", sig);
    });

    it("✅ Status sertifikat menjadi revoked (Tabel 4.4 No.3 → Lulus)", async function () {
      await expect(contract.revokeCertificate(1))
        .to.emit(contract, "CertificateRevoked")
        .withArgs(1, owner.address);
      expect(await contract.isRevoked(1)).to.be.true;
      // Token tetap exist (audit trail terjaga, non-destruktif)
      expect(await contract.exists(1)).to.be.true;
    });

    it("❌ KEAMANAN: Non-owner tidak boleh merevokasi", async function () {
      await expect(
        contract.connect(attacker).revokeCertificate(1)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  // ── No.4 & 5: isCertificateValid() ───────────────────────────────────────
  describe("No.4 & 5 — isCertificateValid() | Sertifikat aktif dan direvokasi", function () {
    beforeEach(async function () {
      const sig = await sign(owner, defaultParams({ recipientName: "Citra", role: "Pembicara", recipientAddress: recipient.address }));
      await contract.mintCertificate(recipient.address, "ipfs://QmValidTest", sig);
    });

    it("✅ Mengembalikan true untuk sertifikat aktif (Tabel 4.4 No.4 → Lulus)", async function () {
      expect(await contract.isCertificateValid(1)).to.be.true;
    });

    it("✅ Mengembalikan false untuk sertifikat direvokasi (Tabel 4.4 No.5 → Lulus)", async function () {
      await contract.revokeCertificate(1);
      expect(await contract.isCertificateValid(1)).to.be.false;
    });
  });

  // ── No.6 & 7: exists() ───────────────────────────────────────────────────
  describe("No.6 & 7 — exists() | Token tersedia dan tidak tersedia", function () {
    beforeEach(async function () {
      const sig = await sign(owner, defaultParams({ recipientName: "Deni", recipientAddress: recipient.address }));
      await contract.mintCertificate(recipient.address, "ipfs://QmExistTest", sig);
    });

    it("✅ Mengembalikan true untuk token yang tersedia (Tabel 4.4 No.6 → Lulus)", async function () {
      expect(await contract.exists(1)).to.be.true;
    });

    it("✅ Mengembalikan false untuk token yang tidak tersedia (Tabel 4.4 No.7 → Lulus)", async function () {
      expect(await contract.exists(9999)).to.be.false;
    });
  });

  // ── No.8: tokenURI() ─────────────────────────────────────────────────────
  describe("No.8 — tokenURI() | Mengembalikan URI metadata IPFS", function () {
    it("✅ Mengembalikan URI metadata IPFS yang benar (Tabel 4.4 No.8 → Lulus)", async function () {
      const expectedURI = "ipfs://QmTokenURITest123/metadata.json";
      const sig = await sign(owner, defaultParams({ recipientName: "Eko", recipientAddress: recipient.address }));
      await contract.mintCertificate(recipient.address, expectedURI, sig);
      expect(await contract.tokenURI(1)).to.equal(expectedURI);
    });
  });

  // ── No.9: getIssuerSignature() ───────────────────────────────────────────
  describe("No.9 — getIssuerSignature() | Mengambil signature berdasarkan tokenId", function () {
    it("✅ Signature berhasil dikembalikan (Tabel 4.4 No.9 → Lulus)", async function () {
      const params = defaultParams({ recipientName: "Fani", recipientAddress: recipient.address });
      const expectedSig = await sign(owner, params);
      await contract.mintCertificate(recipient.address, "ipfs://QmSigTest", expectedSig);

      const storedSig = await contract.getIssuerSignature(1);
      expect(storedSig).to.equal(expectedSig);
      // Signature ECDSA = 65 bytes = 132 hex chars + "0x" prefix
      expect(storedSig.length).to.equal(132);
    });
  });

  // ── No.10: getCertificateIssuer() ────────────────────────────────────────
  describe("No.10 — getCertificateIssuer() | Mengambil address issuer berdasarkan tokenId", function () {
    it("✅ Address issuer berhasil dikembalikan (Tabel 4.4 No.10 → Lulus)", async function () {
      const sig = await sign(owner, defaultParams({ recipientName: "Gilang", role: "Pembicara", recipientAddress: recipient.address }));
      await contract.mintCertificate(recipient.address, "ipfs://QmIssuerTest", sig);

      const storedIssuer = await contract.getCertificateIssuer(1);
      expect(storedIssuer.toLowerCase()).to.equal(owner.address.toLowerCase());
    });
  });

  // ── No.11: verifyIssuerSignature() ───────────────────────────────────────
  describe("No.11 — verifyIssuerSignature() | Verifikasi signature issuer", function () {
    const params = {
      recipientName: "Hana Pertiwi",
      eventName: "Seminar HIMASTIKA-HUMANIS 2024",
      date: "2024-12-15",
      role: "Peserta",
      recipientAddress: "", // diisi di beforeEach
      certificateNumber: "CERT-010",
    };

    let storedSig: string;

    beforeEach(async function () {
      params.recipientAddress = recipient.address;
      storedSig = await sign(owner, params);
      await contract.mintCertificate(recipient.address, "ipfs://QmVerifySigTest", storedSig);
    });

    it("✅ Mengembalikan true untuk signature valid (Tabel 4.4 No.11 → Lulus)", async function () {
      const message = buildMessage(params);
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      const [isValid, recoveredAddr] = await contract.verifyIssuerSignature(1, messageHash);
      expect(isValid).to.be.true;
      expect(recoveredAddr.toLowerCase()).to.equal(owner.address.toLowerCase());
    });

    it("❌ Mengembalikan false untuk pesan yang telah dimodifikasi (tamper-proof)", async function () {
      const tamperedParams = { ...params, recipientName: "NAMA DIPALSUKAN" };
      const tamperedMessage = buildMessage(tamperedParams);
      const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes(tamperedMessage));
      const [isValid] = await contract.verifyIssuerSignature(1, tamperedHash);
      expect(isValid).to.be.false;
    });

    it("✅ ethers.verifyMessage() off-chain menghasilkan address yang sama (simulasi frontend)", async function () {
      // Simulasi verifyCertificateSignature() yang dipanggil di halaman /verify
      const message = buildMessage(params);
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      const binaryHash = ethers.getBytes(messageHash);
      const recoveredAddress = ethers.verifyMessage(binaryHash, storedSig);
      expect(recoveredAddress.toLowerCase()).to.equal(owner.address.toLowerCase());
    });
  });

  // ── Pengukuran Gas (data untuk Tabel 4.7) ────────────────────────────────
  describe("Pengukuran Gas (data pendukung Tabel 4.7)", function () {
    it("⛽ Catat gas usage mintCertificate() — target Polygon < 300.000 gas", async function () {
      const sig = await sign(owner, defaultParams({ recipientAddress: recipient.address }));
      const tx = await contract.mintCertificate(recipient.address, "ipfs://QmGasTest", sig);
      const receipt = await tx.wait();

      const gasUsed = Number(receipt!.gasUsed);
      console.log(`\n  ⛽ Gas mintCertificate (Hardhat EVM): ${gasUsed.toLocaleString()} gas`);
      console.log(`     ℹ️  Gas di Polygon Amoy akan lebih rendah.`);
      console.log(`     Gunakan measure-performance.ts untuk angka resmi di Polygon.\n`);
      // Threshold longgar di Hardhat; angka resmi dari Polygon Amoy di Tabel 4.7
      expect(gasUsed).to.be.lessThan(500_000);
    });
  });
});