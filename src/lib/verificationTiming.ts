/**
 * PENGUKUR WAKTU VERIFIKASI — KPI Tabel 3.2 No.1
 * ================================================
 * Target: Waktu verifikasi < 5 detik
 * Metode: JavaScript Performance API (timestamp logging)
 *
 * Cara pakai:
 *   1. Salin file ini ke src/lib/verificationTiming.ts
 *   2. Import dan panggil measureWaktuVerifikasi() di dalam
 *      fungsi verifikasi kamu (useContract.ts atau page verify)
 *   3. Buka F12 → Console saat melakukan verifikasi
 *   4. Salin angka dari console ke tabel hasil pengujian Bab 4
 *
 * Untuk ekspor ke CSV setelah 10+ pengujian:
 *   Ketik di Console browser: exportHasilKeCsv()
 * ================================================
 */

export interface HasilWaktuVerifikasi {
    tokenId: string | number;
    totalMs: number;
    tahap: {
        onChainMs: number;    // exists() + isCertificateValid() + isRevoked() + getIssuerSignature()
        ipfsMs: number;       // fetch metadata dari IPFS gateway
        signatureMs: number;  // ethers.verifyMessage() lokal di browser
    };
    kpiLulus: boolean;      // true jika totalMs < 5000
    metode: "QR Code" | "Token ID Manual";
    perangkat: string;
    timestamp: string;
}

/**
 * Fungsi utama: ukur setiap tahap verifikasi secara granular.
 * Pasang ini di dalam alur verifikasi /verify/[tokenId]/page.tsx kamu.
 *
 * Contoh pemakaian:
 *
 *   const hasil = await ukurWaktuVerifikasi({
 *     tokenId,
 *     contract: contractInstance,
 *     ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/",
 *     ethers,
 *     metode: "QR Code",
 *   });
 */
export async function ukurWaktuVerifikasi({
    tokenId,
    contract,
    ipfsGateway,
    ethers: ethersLib,
    metode = "QR Code",
}: {
    tokenId: string | number;
    contract: any;
    ipfsGateway: string;
    ethers: any;
    metode?: "QR Code" | "Token ID Manual";
}): Promise<HasilWaktuVerifikasi> {
    const perangkat = detectPerangkat();
    const t0 = performance.now();
    let onChainMs = 0;
    let ipfsMs = 0;
    let signatureMs = 0;

    // ── TAHAP 1: Pre-check On-Chain ───────────────────────────────────────────
    // Sesuai alur 4.6.3 di proposal: exists() → isRevoked() → isCertificateValid()
    const t1 = performance.now();
    const exists = await contract.exists(tokenId);
    if (!exists) {
        onChainMs = Math.round(performance.now() - t1);
        return buatHasil(tokenId, t0, { onChainMs, ipfsMs, signatureMs }, metode, perangkat, "Sertifikat Tidak Ditemukan");
    }
    const isRevoked = await contract.isRevoked(tokenId);
    const isValid = await contract.isCertificateValid(tokenId);
    const tokenURI = await contract.tokenURI(tokenId);
    const issuerSig = await contract.getIssuerSignature(tokenId);
    const issuerAddr = await contract.getCertificateIssuer(tokenId);
    onChainMs = Math.round(performance.now() - t1);

    if (isRevoked) {
        return buatHasil(tokenId, t0, { onChainMs, ipfsMs, signatureMs }, metode, perangkat, "Sertifikat Direvokasi");
    }

    // ── TAHAP 2: Fetch Metadata dari IPFS ────────────────────────────────────
    // Sesuai alur 4.6.4: tokenURI → gateway HTTP → parse JSON
    const t2 = performance.now();
    const httpURL = tokenURI.replace("ipfs://", ipfsGateway);
    const resp = await fetch(httpURL);
    const metadata = await resp.json();
    ipfsMs = Math.round(performance.now() - t2);

    // ── TAHAP 3: Verifikasi Tanda Tangan Digital (ECDSA) ─────────────────────
    // Sesuai 4.7 "Implementasi Digital Signature Verification"
    // Format pesan HARUS identik dengan buildCertificateMessage() di signCertificate.ts
    const t3 = performance.now();

    const attr = (key: string) =>
        metadata.attributes?.find((a: any) => a.trait_type === key)?.value ?? "";

    // Pesan dibangun PERSIS seperti buildCertificateMessage() di
    // signCertificate.ts, lalu diverifikasi terhadap keccak256 hash-nya
    // (bukan string mentah) — konsisten dengan proses signing saat minting.
    const message = [
        `Validori Certificate`,
        `Recipient: ${String(attr("Nama Penerima")).trim()}`,
        `Event: ${String(attr("Nama Event")).trim()}`,
        `Date: ${String(attr("Tanggal Penerbitan")).trim()}`,
        `Role: ${String(attr("Peran")).trim()}`,
        `Wallet: ${String(attr("Recipient Wallet")).trim().toLowerCase()}`,
        `CertNo: ${String(attr("Nomor Sertifikat")).trim()}`,
    ].join("\n");

    const messageHash = ethersLib.keccak256(ethersLib.toUtf8Bytes(message));
    const recoveredAddr = ethersLib.verifyMessage(
        ethersLib.getBytes(messageHash),
        issuerSig
    );
    const signatureValid = recoveredAddr.toLowerCase() === issuerAddr.toLowerCase();
    signatureMs = Math.round(performance.now() - t3);

    const hasil = buatHasil(tokenId, t0, { onChainMs, ipfsMs, signatureMs }, metode, perangkat);

    // ── Cetak ke Console untuk dicatat ke Bab 4 ──────────────────────────────
    const lulus = hasil.kpiLulus ? "✅ LULUS" : "❌ TIDAK LULUS";
    console.group(`%c⏱ Waktu Verifikasi Token #${tokenId} — ${lulus}`, "color:#6366f1;font-weight:bold");
    console.table({
        "1. On-Chain Pre-Check": `${onChainMs} ms`,
        "2. Fetch IPFS Metadata": `${ipfsMs} ms`,
        "3. Verifikasi Signature": `${signatureMs} ms`,
        "   TOTAL": `${hasil.totalMs} ms`,
        "KPI < 5000ms": hasil.kpiLulus ? "✅ LULUS" : "❌ TIDAK LULUS",
        "Metode": metode,
        "Perangkat": perangkat,
        "Status Sertifikat": isValid ? "VALID" : "TIDAK VALID",
        "Signature Valid": signatureValid ? "YA" : "TIDAK",
        "Issuer Address": issuerAddr,
        "Recovered Address": recoveredAddr,
    });
    console.groupEnd();

    // Simpan ke memori untuk ekspor
    simpanHasil(hasil);
    return hasil;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buatHasil(
    tokenId: string | number,
    t0: number,
    tahap: HasilWaktuVerifikasi["tahap"],
    metode: HasilWaktuVerifikasi["metode"],
    perangkat: string,
    _keterangan?: string
): HasilWaktuVerifikasi {
    const totalMs = Math.round(performance.now() - t0);
    return {
        tokenId,
        totalMs,
        tahap,
        kpiLulus: totalMs < 5000,
        metode,
        perangkat,
        timestamp: new Date().toISOString(),
    };
}

// Deteksi perangkat secara otomatis untuk kolom catatan
function detectPerangkat(): string {
    if (typeof navigator === "undefined") return "Unknown";
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return "iOS";
    if (/Android/.test(ua)) return "Android";
    if (/Windows/.test(ua)) return "Desktop Windows";
    if (/Mac/.test(ua)) return "Desktop Mac";
    return "Desktop";
}

// Log disimpan di localStorage agar TIDAK hilang saat pindah halaman/token —
// dengan begitu 10+ pengukuran bisa dikumpulkan lalu diekspor sekaligus.
const STORAGE_KEY = "validori_verify_log";

function muatLog(): HasilWaktuVerifikasi[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
        return [];
    }
}

function simpanHasil(h: HasilWaktuVerifikasi) {
    if (typeof window === "undefined") return;
    const log = muatLog();
    log.push(h);
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
        /* localStorage penuh/diblokir — data run ini tetap ada di memori */
    }
    // Expose ke window agar bisa dipanggil dari Console browser
    (window as any).__verifyLog = log;
    (window as any).exportHasilKeCsv = exportHasilKeCsv;
    (window as any).resetHasilVerifikasi = () => {
        window.localStorage.removeItem(STORAGE_KEY);
        console.log("🗑️ Log verifikasi dikosongkan.");
    };
    console.log(`💾 Tersimpan. Total pengukuran terkumpul: ${log.length}`);
}

/**
 * Jalankan fungsi ini di Console browser setelah 10+ pengujian:
 *   exportHasilKeCsv()
 * File CSV akan otomatis terdownload.
 */
export function exportHasilKeCsv(): void {
    const log: HasilWaktuVerifikasi[] = muatLog();
    if (log.length === 0) {
        console.warn("⚠️ Belum ada data. Lakukan verifikasi minimal 1 kali terlebih dahulu.");
        return;
    }

    const header = [
        "Token ID", "Total (ms)", "On-Chain (ms)", "IPFS (ms)", "Signature (ms)",
        "KPI Lulus", "Metode", "Perangkat", "Timestamp"
    ].join(",");

    const rows = log.map((r) => [
        r.tokenId,
        r.totalMs,
        r.tahap.onChainMs,
        r.tahap.ipfsMs,
        r.tahap.signatureMs,
        r.kpiLulus ? "Ya" : "Tidak",
        r.metode,
        r.perangkat,
        r.timestamp,
    ].join(","));

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasil-verifikasi-${Date.now()}.csv`;
    a.click();

    console.log(`✅ ${log.length} data waktu verifikasi diekspor ke CSV.`);
    console.log("   Gunakan file ini untuk mengisi tabel hasil pengujian di Bab 4.");
}

/*
 * ════════════════════════════════════════════════════════════════
 * TABEL PENCATATAN MANUAL (gunakan ini jika tidak pakai fungsi di atas)
 * ════════════════════════════════════════════════════════════════
 *
 * Saat melakukan 10 pengujian verifikasi, catat hasil ini:
 *
 * | No | Token ID | Metode    | Perangkat | On-Chain | IPFS   | Sig  | TOTAL | KPI  |
 * |----|----------|-----------|-----------|----------|--------|------|-------|------|
 * | 1  | #1       | QR Code   | Desktop   | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 2  | #5       | QR Code   | Android   | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 3  | #10      | QR Code   | iOS       | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 4  | #20      | Manual    | Desktop   | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 5  | #30      | QR Code   | Desktop   | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 6  | revoked  | QR Code   | Desktop   | ___ms    | —      | —    | ___ms | ✅/❌|
 * | 7  | invalid  | Manual    | Desktop   | ___ms    | —      | —    | ___ms | ✅/❌|
 * | 8  | #40      | QR Code   | Android   | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 9  | #45      | Manual    | iOS       | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * | 10 | #50      | QR Code   | Desktop   | ___ms    | ___ms  | ___ms| ___ms | ✅/❌|
 * |----|----------|-----------|-----------|----------|--------|------|-------|------|
 * | Rata-rata                             | ___ms    | ___ms  | ___ms| ___ms | ___% |
 *
 */