/**
 * PENGUKUR KECEPATAN UPLOAD IPFS — KPI Tabel 3.2 No.2
 * ======================================================
 * Target: Upload file PDF 2MB ke IPFS < 3 detik
 * Metode: Timestamp logging before-after upload (sesuai Tabel 3.2)
 *
 * Cara pakai:
 *   1. Salin ke src/lib/ipfsUploadTiming.ts
 *   2. Wrap fungsi upload di useIPFS.ts dengan ukurUploadIPFS()
 *   3. Lihat hasil di Console browser (F12) setelah upload
 *   4. Ketik exportHasilUploadKeCsv() di Console untuk ekspor ke CSV
 * ======================================================
 */

export interface HasilUploadIPFS {
    namaFile: string;
    ukuranBytes: number;
    ukuranMB: string;
    jenis: "template-pdf" | "metadata-json";
    durasiMs: number;
    kpiLulus: boolean; // true jika < 3000ms
    cid: string;
    timestamp: string;
}

// Log disimpan di localStorage agar tidak hilang saat pindah halaman/reload.
const UPLOAD_STORAGE_KEY = "validori_upload_log";

function muatLogUpload(): HasilUploadIPFS[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(window.localStorage.getItem(UPLOAD_STORAGE_KEY) ?? "[]");
    } catch {
        return [];
    }
}

/**
 * Wrap fungsi upload kamu dengan ini.
 *
 * Contoh pemakaian di useIPFS.ts:
 *
 *   import { ukurUploadIPFS } from "@/lib/ipfsUploadTiming";
 *
 *   // Saat upload template PDF:
 *   const cid = await ukurUploadIPFS(
 *     () => uploadFileToPinata(file),   // fungsi upload asli kamu
 *     file.name,
 *     file.size,
 *     "template-pdf"
 *   );
 *
 *   // Saat upload metadata JSON:
 *   const cid = await ukurUploadIPFS(
 *     () => uploadMetadataToPinata(metadata),
 *     `metadata_${recipientName}.json`,
 *     JSON.stringify(metadata).length,
 *     "metadata-json"
 *   );
 */
export async function ukurUploadIPFS<T extends string>(
    uploadFn: () => Promise<T>,
    namaFile: string,
    ukuranBytes: number,
    jenis: HasilUploadIPFS["jenis"]
): Promise<T> {
    const t0 = performance.now();
    const cid = await uploadFn();
    const durasiMs = Math.round(performance.now() - t0);

    const kpiLulus = durasiMs < 3000;
    const ukuranMB = (ukuranBytes / (1024 * 1024)).toFixed(2);

    const hasil: HasilUploadIPFS = {
        namaFile,
        ukuranBytes,
        ukuranMB,
        jenis,
        durasiMs,
        kpiLulus,
        cid: String(cid),
        timestamp: new Date().toISOString(),
    };

    // Cetak ke Console
    const ikon = kpiLulus ? "✅" : "❌";
    const kpiLabel = kpiLulus ? "LULUS" : "TIDAK LULUS";
    console.group(
        `%c⏱ Upload IPFS — ${namaFile} — ${ikon} ${kpiLabel}`,
        "color:#10b981;font-weight:bold"
    );
    console.table({
        "File": namaFile,
        "Jenis": jenis,
        "Ukuran": `${ukuranMB} MB (${ukuranBytes.toLocaleString()} bytes)`,
        "Durasi": `${durasiMs} ms`,
        "KPI < 3000ms": kpiLulus ? "✅ LULUS" : "❌ TIDAK LULUS",
        "CID": String(cid),
        "Waktu": new Date().toLocaleString("id-ID"),
    });
    console.groupEnd();

    // Simpan ke localStorage dan expose ke window
    if (typeof window !== "undefined") {
        const log = muatLogUpload();
        log.push(hasil);
        try {
            window.localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(log));
        } catch {
            /* localStorage penuh/diblokir — abaikan */
        }
        (window as any).__uploadLog = log;
        (window as any).exportHasilUploadKeCsv = exportHasilUploadKeCsv;
        (window as any).cetakRingkasanUpload = cetakRingkasanUpload;
        (window as any).resetHasilUpload = () => {
            window.localStorage.removeItem(UPLOAD_STORAGE_KEY);
            console.log("🗑️ Log upload dikosongkan.");
        };
        console.log(`💾 Tersimpan. Total upload terukur: ${log.length}`);
    }

    return cid;
}

/**
 * Cetak ringkasan semua upload di Console.
 * Panggil di Console browser: cetakRingkasanUpload()
 */
export function cetakRingkasanUpload(): void {
    const log: HasilUploadIPFS[] = muatLogUpload();
    if (log.length === 0) {
        console.warn("⚠️ Belum ada data upload. Lakukan upload dulu.");
        return;
    }

    const templateLog = log.filter((r) => r.jenis === "template-pdf");
    const metadataLog = log.filter((r) => r.jenis === "metadata-json");

    const avgMs = (arr: HasilUploadIPFS[]) =>
        arr.length ? Math.round(arr.reduce((a, r) => a + r.durasiMs, 0) / arr.length) : 0;
    const maxMs = (arr: HasilUploadIPFS[]) =>
        arr.length ? Math.max(...arr.map((r) => r.durasiMs)) : 0;
    const minMs = (arr: HasilUploadIPFS[]) =>
        arr.length ? Math.min(...arr.map((r) => r.durasiMs)) : 0;
    const lulusRate = (arr: HasilUploadIPFS[]) =>
        arr.length ? ((arr.filter((r) => r.kpiLulus).length / arr.length) * 100).toFixed(0) : "—";

    console.group("%c📊 Ringkasan Upload IPFS (KPI Tabel 3.2 No.2)", "color:#6366f1;font-weight:bold");
    console.log(`\nTotal upload : ${log.length} file`);

    if (templateLog.length > 0) {
        console.log(`\n📄 Template PDF (${templateLog.length} file):`);
        console.table({
            "Rata-rata": `${avgMs(templateLog)} ms`,
            "Tercepat": `${minMs(templateLog)} ms`,
            "Terlambat": `${maxMs(templateLog)} ms`,
            "KPI < 3 dtk": `${lulusRate(templateLog)}% lulus`,
        });
    }

    if (metadataLog.length > 0) {
        console.log(`\n📋 Metadata JSON (${metadataLog.length} file):`);
        console.table({
            "Rata-rata": `${avgMs(metadataLog)} ms`,
            "Tercepat": `${minMs(metadataLog)} ms`,
            "Terlambat": `${maxMs(metadataLog)} ms`,
            "KPI < 3 dtk": `${lulusRate(metadataLog)}% lulus`,
        });
    }

    console.groupEnd();
}

/**
 * Ekspor semua hasil upload ke CSV.
 * Panggil di Console browser: exportHasilUploadKeCsv()
 */
export function exportHasilUploadKeCsv(): void {
    const log: HasilUploadIPFS[] = muatLogUpload();
    if (log.length === 0) {
        console.warn("⚠️ Belum ada data. Lakukan upload dulu.");
        return;
    }

    const header = [
        "Nama File", "Jenis", "Ukuran (MB)", "Ukuran (bytes)",
        "Durasi (ms)", "KPI < 3dtk", "CID", "Timestamp"
    ].join(",");

    const rows = log.map((r) => [
        `"${r.namaFile}"`,
        r.jenis,
        r.ukuranMB,
        r.ukuranBytes,
        r.durasiMs,
        r.kpiLulus ? "Ya" : "Tidak",
        r.cid,
        r.timestamp,
    ].join(","));

    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `hasil-upload-ipfs-${Date.now()}.csv`;
    a.click();

    console.log(`✅ ${log.length} data upload diekspor ke CSV.`);
}

/*
 * ════════════════════════════════════════════════════════════════
 * TABEL PENCATATAN MANUAL (jika tidak pakai wrapper di atas)
 * ════════════════════════════════════════════════════════════════
 *
 * Buka Network tab di DevTools (F12 → Network), filter "pinata".
 * Catat waktu dari kolom "Time" untuk setiap request upload.
 *
 * | No | File              | Jenis        | Ukuran | Durasi | KPI < 3dtk |
 * |----|-------------------|--------------|--------|--------|------------|
 * | 1  | template.pdf      | Template PDF | 2.00MB | ___ms  | ✅/❌       |
 * | 2  | metadata_01.json  | Metadata JSON| ~1KB   | ___ms  | ✅/❌       |
 * | 3  | metadata_02.json  | Metadata JSON| ~1KB   | ___ms  | ✅/❌       |
 * | ...| ...               | ...          | ...    | ...    | ...        |
 * | Rata-rata template                            | ___ms  | ____%       |
 * | Rata-rata metadata                            | ___ms  | ____%       |
 *
 */