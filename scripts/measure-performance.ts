/**
 * SCRIPT PENGUKURAN PERFORMA — untuk mengisi Tabel 4.7
 * =====================================================
 * "Perbandingan Sequential Minting dan Batch Minting"
 *
 * Kolom Tabel 4.7 yang akan terisi otomatis:
 *   - Jumlah transaksi
 *   - Total gas digunakan
 *   - Gas per sertifikat
 *   - Total waktu minting
 *   - Status target penelitian (gas < 300.000/mint)
 *
 * Plus KPI dari Tabel 3.2:
 *   - Waktu verifikasi (diukur terpisah di frontend)
 *   - Gas Consumption < 300.000 gas/mint
 *   - Batch Minting Success Rate 100%
 *
 * Cara menjalankan:
 *   npx hardhat run scripts/measure-performance.ts --network amoy
 *
 * Output: tabel ringkasan di terminal + file hasil-tabel-4-7.json
 * =====================================================
 */

import { ethers } from "hardhat";
import * as fs from "fs";

interface HasilMinting {
    tokenId: number;
    gasUsed: bigint;
    durationMs: number;
    txHash: string;
    berhasil: boolean;
    error?: string;
}

async function main() {
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║   PENGUKURAN PERFORMA — Tabel 4.7 Skripsi               ║");
    console.log("║   Gavin Adlan Hidayat — 20220801093                      ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`📡 Network  : ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`👛 Deployer : ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Saldo    : ${ethers.formatEther(balance)} MATIC\n`);

    // Helper: format pesan signature identik dengan signCertificate.ts di frontend
    async function buatSignature(tokenId: number, namaP: string): Promise<string> {
        const message = `Certificate for ${namaP}\nEvent: Seminar HIMASTIKA-HUMANIS 2024\nRole: Peserta\nDate: 2024-12-15\nToken: ${tokenId}`;
        return await deployer.signMessage(message);
    }

    const JUMLAH = 50;
    const allSigners = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateNFT");

    // ══════════════════════════════════════════════════════════════
    // BAGIAN A: Sequential Minting (50 transaksi terpisah)
    // ══════════════════════════════════════════════════════════════
    console.log("──────────────────────────────────────────────────────────");
    console.log(`📋 SEQUENTIAL MINTING — ${JUMLAH} sertifikat (satu per satu)`);
    console.log("──────────────────────────────────────────────────────────");

    const contractSeq = await Factory.deploy();
    await contractSeq.waitForDeployment();
    console.log(`   Contract: ${await contractSeq.getAddress()}\n`);

    const hasilSeq: HasilMinting[] = [];
    const waktuMulaiSeq = Date.now();

    for (let i = 1; i <= JUMLAH; i++) {
        const nama = `Peserta ${i.toString().padStart(2, "0")}`;
        const penerima = allSigners[i % allSigners.length].address;
        const uri = `ipfs://QmSeqMetadata${i}ExampleHashABCDEF`;
        const sig = await buatSignature(i, nama);

        try {
            const t0 = Date.now();
            const tx = await contractSeq.mintCertificate(penerima, uri, sig);
            const receipt = await tx.wait();
            const durasi = Date.now() - t0;

            hasilSeq.push({
                tokenId: i,
                gasUsed: receipt!.gasUsed,
                durationMs: durasi,
                txHash: receipt!.hash,
                berhasil: true,
            });

            const gas = receipt!.gasUsed.toLocaleString().padStart(9);
            console.log(`   ✅ Token #${String(i).padStart(2)} | Gas: ${gas} | ${durasi}ms | ${receipt!.hash.slice(0, 18)}...`);
        } catch (err: any) {
            hasilSeq.push({ tokenId: i, gasUsed: BigInt(0), durationMs: 0, txHash: "", berhasil: false, error: err.message });
            console.log(`   ❌ Token #${i} GAGAL: ${err.message?.slice(0, 60)}`);
        }
    }

    const waktuTotalSeq = Date.now() - waktuMulaiSeq;
    const seqBerhasil = hasilSeq.filter((r) => r.berhasil);
    const seqTotalGas = seqBerhasil.reduce((a, r) => a + r.gasUsed, BigInt(0));
    const seqAvgGas = seqTotalGas / BigInt(seqBerhasil.length || 1);
    const seqMinGas = seqBerhasil.reduce((a, r) => (r.gasUsed < a ? r.gasUsed : a), seqBerhasil[0]?.gasUsed ?? BigInt(0));
    const seqMaxGas = seqBerhasil.reduce((a, r) => (r.gasUsed > a ? r.gasUsed : a), seqBerhasil[0]?.gasUsed ?? BigInt(0));

    // ══════════════════════════════════════════════════════════════
    // BAGIAN B: Batch Minting (1 transaksi untuk 50 sertifikat)
    // ══════════════════════════════════════════════════════════════
    console.log("\n──────────────────────────────────────────────────────────");
    console.log(`📦 BATCH MINTING — ${JUMLAH} sertifikat (satu transaksi)`);
    console.log("──────────────────────────────────────────────────────────");

    const contractBatch = await Factory.deploy();
    await contractBatch.waitForDeployment();
    console.log(`   Contract: ${await contractBatch.getAddress()}\n`);

    // Siapkan data batch
    console.log("   Menyiapkan data (upload metadata + buat signature)...");
    const batchAddrs: string[] = [];
    const batchURIs: string[] = [];
    const batchSigs: string[] = [];

    for (let i = 1; i <= JUMLAH; i++) {
        batchAddrs.push(allSigners[i % allSigners.length].address);
        batchURIs.push(`ipfs://QmBatchMetadata${i}ExampleHashXYZ`);
        batchSigs.push(await buatSignature(i, `Peserta Batch ${i}`));
    }

    let batchGas = BigInt(0);
    let batchDurasi = 0;
    let batchTxHash = "";
    let batchBerhasil = false;
    let batchJumlahBerhasil = 0;

    try {
        const t0 = Date.now();
        const tx = await contractBatch.batchMintCertificate(batchAddrs, batchURIs, batchSigs);
        const receipt = await tx.wait();
        batchDurasi = Date.now() - t0;

        batchGas = receipt!.gasUsed;
        batchTxHash = receipt!.hash;
        batchBerhasil = true;
        batchJumlahBerhasil = JUMLAH;

        console.log(`   ✅ Batch berhasil! ${JUMLAH}/${JUMLAH} sertifikat dalam 1 transaksi`);
        console.log(`      Gas total : ${batchGas.toLocaleString()}`);
        console.log(`      Gas/token : ${(batchGas / BigInt(JUMLAH)).toLocaleString()}`);
        console.log(`      Durasi    : ${(batchDurasi / 1000).toFixed(2)} detik`);
        console.log(`      Tx Hash   : ${batchTxHash}`);
    } catch (err: any) {
        console.log(`   ❌ BATCH GAGAL: ${err.message}`);
        batchJumlahBerhasil = 0;
    }

    // ══════════════════════════════════════════════════════════════
    // TABEL 4.7 — CETAK KE TERMINAL
    // ══════════════════════════════════════════════════════════════
    const seqSuccessRate = ((seqBerhasil.length / JUMLAH) * 100).toFixed(0);
    const batchSuccessRate = ((batchJumlahBerhasil / JUMLAH) * 100).toFixed(0);
    const gasHemat = seqTotalGas - batchGas;
    const pctHemat = seqTotalGas > 0 ? ((Number(gasHemat) / Number(seqTotalGas)) * 100).toFixed(1) : "0";

    // KPI evaluasi
    const kpi1GasSeq = seqAvgGas < BigInt(300_000);   // gas/mint < 300.000
    const kpi2Batch = batchJumlahBerhasil === JUMLAH; // 100% success

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║              TABEL 4.7 — HASIL PENGUJIAN                 ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Parameter               │ Sequential      │ Batch       ║`);
    console.log(`╠══════════════════════════════════════════════════════════╣`);
    console.log(`║  Jumlah transaksi        │ ${String(JUMLAH).padEnd(15)} │ ${"1".padEnd(11)} ║`);
    console.log(`║  Konfirmasi MetaMask     │ ${String(JUMLAH).padEnd(15)} │ ${"1".padEnd(11)} ║`);
    console.log(`║  Total gas digunakan     │ ${seqTotalGas.toLocaleString().padEnd(15)} │ ${batchGas.toLocaleString().padEnd(11)} ║`);
    console.log(`║  Gas per sertifikat      │ ${seqAvgGas.toLocaleString().padEnd(15)} │ ${(batchGas / BigInt(JUMLAH)).toLocaleString().padEnd(11)} ║`);
    console.log(`║  Gas minimum per token   │ ${seqMinGas.toLocaleString().padEnd(15)} │ ${"—".padEnd(11)} ║`);
    console.log(`║  Gas maksimum per token  │ ${seqMaxGas.toLocaleString().padEnd(15)} │ ${"—".padEnd(11)} ║`);
    console.log(`║  Total waktu minting     │ ${((waktuTotalSeq / 1000).toFixed(1) + "s").padEnd(15)} │ ${((batchDurasi / 1000).toFixed(1) + "s").padEnd(11)} ║`);
    console.log(`║  Retry per sertifikat    │ ${"Ya".padEnd(15)} │ ${"Tidak".padEnd(11)} ║`);
    console.log(`║  Success rate            │ ${(seqSuccessRate + "%").padEnd(15)} │ ${(batchSuccessRate + "%").padEnd(11)} ║`);
    console.log(`║  Status target penelitian│ ${(kpi1GasSeq ? "✅ LULUS" : "❌ GAGAL").padEnd(15)} │ ${(kpi2Batch ? "✅ LULUS" : "❌ GAGAL").padEnd(11)} ║`);
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Penghematan gas batch   │ ${gasHemat.toLocaleString()} (${pctHemat}%)`.padEnd(59) + "║");
    console.log("╚══════════════════════════════════════════════════════════╝");

    console.log("\n📊 EVALUASI KPI (Tabel 3.2):");
    console.log(`   ${kpi1GasSeq ? "✅" : "❌"} Gas/Mint       → Target: <300.000 | Aktual: ${seqAvgGas.toLocaleString()} gas → ${kpi1GasSeq ? "LULUS" : "TIDAK LULUS"}`);
    console.log(`   ${kpi2Batch ? "✅" : "❌"} Batch 50 NFT   → Target: 100%    | Aktual: ${batchSuccessRate}%            → ${kpi2Batch ? "LULUS" : "TIDAK LULUS"}`);

    // ══════════════════════════════════════════════════════════════
    // Simpan ke JSON untuk dikutip di Bab 4
    // ══════════════════════════════════════════════════════════════
    const output = {
        metadata: {
            timestamp: new Date().toISOString(),
            network: `${network.name} (Chain ID: ${network.chainId})`,
            deployer: deployer.address,
            jumlahSertifikat: JUMLAH,
        },
        tabel_4_7: {
            sequential: {
                jumlahTransaksi: JUMLAH,
                konfimasiMetaMask: JUMLAH,
                totalGas: seqTotalGas.toString(),
                gasPerSertifikat: seqAvgGas.toString(),
                gasMinimum: seqMinGas.toString(),
                gasMaksimum: seqMaxGas.toString(),
                totalWaktuMs: waktuTotalSeq,
                totalWaktuDetik: (waktuTotalSeq / 1000).toFixed(1),
                retryPerSertifikat: "Ya",
                successRate: `${seqSuccessRate}%`,
                statusTarget: kpi1GasSeq ? "LULUS" : "TIDAK LULUS",
            },
            batch: {
                jumlahTransaksi: 1,
                konfirmasiMetaMask: 1,
                totalGas: batchGas.toString(),
                gasPerSertifikat: (batchGas / BigInt(JUMLAH)).toString(),
                totalWaktuMs: batchDurasi,
                totalWaktuDetik: (batchDurasi / 1000).toFixed(1),
                txHash: batchTxHash,
                retryPerSertifikat: "Tidak",
                successRate: `${batchSuccessRate}%`,
                statusTarget: kpi2Batch ? "LULUS" : "TIDAK LULUS",
            },
            perbandingan: {
                penghematanGas: gasHemat.toString(),
                penghematanGasPersen: `${pctHemat}%`,
                rekomendasi: Number(pctHemat) > 15
                    ? "Gunakan Batch Minting untuk efisiensi gas pada penerbitan massal."
                    : "Sequential dan Batch memiliki efisiensi serupa; Sequential lebih aman untuk error handling.",
            },
        },
        evaluasi_kpi: {
            gasPerMint: {
                target: "<300.000 gas/mint",
                aktual: seqAvgGas.toString(),
                lulus: kpi1GasSeq,
            },
            batchSuccessRate: {
                target: "100%",
                aktual: `${batchSuccessRate}%`,
                lulus: kpi2Batch,
            },
        },
        detail_sequential: hasilSeq,
    };

    const outputPath = "./hasil-tabel-4-7.json";
    fs.writeFileSync(outputPath, JSON.stringify(output, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    console.log(`\n✅ Data lengkap disimpan di: ${outputPath}`);
    console.log("   Salin angka dari file ini ke Tabel 4.7 di dokumen skripsi kamu.\n");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});