/**
 * @file signCertificate.ts
 * @description Utilitas untuk membuat dan memverifikasi tanda tangan digital
 *              sertifikat menggunakan ECDSA via MetaMask (EIP-191 Binary Hash).
 *
 * ALUR KERJA:
 * 1. SAAT MINTING:
 *    - buildCertificateMessage()  → buat pesan string dari data sertifikat
 *    - hashCertificateMessage()   → keccak256 hash pesan → jadi bytes32
 *    - signCertificateMessage()   → sign HASH (bukan string) via MetaMask
 *                                   MetaMask tambahkan prefix "\x19Ethereum Signed Message:\n32"
 *    - Kirim signature ke mintCertificate() sebagai parameter
 *
 * 2. SAAT VERIFIKASI:
 *    - buildCertificateMessage()     → bangun ulang pesan yang SAMA dari metadata IPFS
 *    - hashCertificateMessage()      → keccak256 hash yang sama
 *    - verifyCertificateSignature()  → verifyMessage(binaryHash, sig) → recover address
 *    - Bandingkan recovered address dengan issuer address on-chain
 *
 * KENAPA HASH DULU (bukan sign string langsung)?
 * Agar prefix yang ditambahkan MetaMask adalah "\x19Ethereum Signed Message:\n32"
 * (selalu 32, karena kita kirim 32-byte hash), sehingga konsisten dengan
 * ecrecover() di Solidity yang menggunakan prefix statis "\n32".
 */

import { ethers } from 'ethers';

// ──────────────────────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Data sertifikat yang digunakan untuk membangun pesan yang akan ditandatangani.
 * Harus IDENTIK antara saat minting dan saat verifikasi.
 *
 * PENTING — recipientWalletAddress:
 * Gunakan address wallet penerima ASLI saat minting (mintRecipient).
 * Saat verifikasi, baca dari metadata IPFS (atribut "Recipient Wallet"),
 * BUKAN dari ownerOf() — karena ownerOf() bisa berubah jika NFT ditransfer.
 */
export interface CertificateSignatureData {
    recipientName: string;
    eventTitle: string;
    issueDate: string;
    role: string;
    recipientWalletAddress: string; // address ASLI penerima — ambil dari metadata IPFS saat verifikasi
    certificateNumber: string;
}

export interface SignatureVerificationResult {
    isValid: boolean;
    recoveredAddress: string;
    expectedIssuer: string;
    message: string;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Membangun Pesan Sertifikat
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Membangun pesan string terstruktur dari data sertifikat.
 * Format ini TIDAK BOLEH diubah setelah deployment — perubahan apapun
 * akan membuat semua signature lama tidak valid.
 *
 * Semua field di-trim() untuk mencegah spasi ekstra merusak hash.
 */
export function buildCertificateMessage(data: CertificateSignatureData): string {
    return [
        `Validori Certificate`,
        `Recipient: ${data.recipientName.trim()}`,
        `Event: ${data.eventTitle.trim()}`,
        `Date: ${data.issueDate.trim()}`,
        `Role: ${data.role.trim()}`,
        `Wallet: ${data.recipientWalletAddress.trim().toLowerCase()}`,
        `CertNo: ${data.certificateNumber.trim()}`,
    ].join('\n');
}

/**
 * Menghitung keccak256 hash dari pesan sertifikat.
 * Hasilnya adalah bytes32 hex string (0x...) — inilah yang akan ditandatangani,
 * bukan string mentahnya.
 */
export function hashCertificateMessage(data: CertificateSignatureData): string {
    const message = buildCertificateMessage(data);
    return ethers.keccak256(ethers.toUtf8Bytes(message));
}

// ──────────────────────────────────────────────────────────────────────────────
//  Signing (Digunakan Saat Minting)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Meminta issuer menandatangani data sertifikat menggunakan MetaMask.
 *
 * REVISI KRITIKAL: Fungsi ini menandatangani HASH (bytes32) dari pesan,
 * bukan string teks mentahnya. Ini memastikan prefix yang ditambahkan
 * MetaMask selalu "\x19Ethereum Signed Message:\n32" — konsisten dengan
 * verifyIssuerSignature() di smart contract.
 *
 * Alur teknis:
 * 1. buildCertificateMessage() → string pesan
 * 2. keccak256(pesan)          → bytes32 hash (hex string "0x...")
 * 3. ethers.getBytes(hash)     → Uint8Array 32 bytes (binary)
 * 4. signer.signMessage(binaryHash) → MetaMask prefix "\n32" + sign
 *
 * Issuer TIDAK membayar gas — ini signing, bukan transaksi blockchain.
 */
export async function signCertificateMessage(
    signer: ethers.Signer,
    data: CertificateSignatureData
): Promise<string> {
    // Hitung keccak256 hash dari pesan (hex string "0x...")
    const messageHash = hashCertificateMessage(data);

    // Konversi hex string ke Uint8Array (32 bytes binary)
    // Ini yang membuat MetaMask menambahkan prefix "\x19Ethereum Signed Message:\n32"
    // (bukan prefix dinamis berdasarkan panjang string)
    const binaryHash = ethers.getBytes(messageHash);

    // MetaMask popup muncul di sini — issuer klik "Sign"
    const signature = await signer.signMessage(binaryHash);

    return signature;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Verification (Digunakan Saat Verifikasi)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Memverifikasi tanda tangan digital sertifikat secara lokal di frontend.
 *
 * REVISI KRITIKAL: Menggunakan binaryHash (bukan string message) agar
 * proses recovery konsisten dengan cara signing — keduanya pakai hash binary.
 *
 * Tidak memerlukan wallet atau gas — semua operasi kriptografi lokal di browser.
 *
 * PENTING untuk signatureData.recipientWalletAddress:
 * Isi dari metadata IPFS (atribut "Recipient Wallet"), BUKAN dari ownerOf().
 * Menggunakan ownerOf() akan menyebabkan verifikasi gagal jika NFT pernah
 * dipindahtangankan ke wallet lain.
 */
export async function verifyCertificateSignature(
    data: CertificateSignatureData,
    signature: string,
    expectedIssuer: string
): Promise<SignatureVerificationResult> {
    try {
        // Hitung hash yang sama dengan saat signing
        const messageHash = hashCertificateMessage(data);
        const binaryHash = ethers.getBytes(messageHash);

        // verifyMessage(binaryHash, signature):
        // 1. Tambahkan prefix "\x19Ethereum Signed Message:\n32" ke binaryHash
        // 2. ecrecover → recover address yang menghasilkan signature ini
        const recoveredAddress = ethers.verifyMessage(binaryHash, signature);

        const isValid =
            recoveredAddress.toLowerCase() === expectedIssuer.toLowerCase();

        return {
            isValid,
            recoveredAddress,
            expectedIssuer,
            message: isValid
                ? `Tanda tangan valid. Sertifikat diterbitkan oleh ${recoveredAddress}`
                : `Tanda tangan tidak cocok. Ditemukan: ${recoveredAddress}, Diharapkan: ${expectedIssuer}`,
        };
    } catch (error: any) {
        return {
            isValid: false,
            recoveredAddress: '',
            expectedIssuer,
            message: `Gagal memverifikasi tanda tangan: ${error.message}`,
        };
    }
}
