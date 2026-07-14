import { useState, useCallback } from 'react';
import { getContract, getSigner, getReadOnlyContract } from '@/lib/contract';
import { MintResult, Participant, Certificate } from '@/types';
import { APP_URL } from '@/constants';

// ── REVISI: Import utilitas digital signature ─────────────────────────────────
import {
  signCertificateMessage,
  verifyCertificateSignature,
  CertificateSignatureData,
  SignatureVerificationResult,
} from '@/lib/signCertificate';
// ─────────────────────────────────────────────────────────────────────────────

export const useContract = () => {
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ──────────────────────────────────────────────
  //  Minting
  // ──────────────────────────────────────────────

  /**
   * Mint satu sertifikat dengan digital signature.
   *
   * REVISI: Sebelum memanggil contract.mintCertificate(), fungsi ini akan:
   * 1. Membangun pesan dari data sertifikat menggunakan buildCertificateMessage()
   * 2. Meminta issuer menandatangani pesan via MetaMask (popup akan muncul)
   * 3. Meneruskan signature sebagai parameter tambahan ke smart contract
   *
   * @param recipient     - Address wallet penerima sertifikat
   * @param tokenURI      - IPFS URI metadata sertifikat (ipfs://CID)
   * @param signatureData - Data sertifikat untuk membangun pesan yang akan ditandatangani
   */
  const mintCertificate = async (
    recipient: string,
    tokenURI: string,
    signatureData: CertificateSignatureData  // ← REVISI: parameter baru
  ): Promise<MintResult> => {
    setIsMinting(true);
    setError(null);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      // ── REVISI: Langkah 1 — Minta issuer menandatangani data sertifikat ──
      // MetaMask akan menampilkan popup dengan pesan terstruktur yang berisi
      // detail sertifikat. Issuer perlu klik "Sign" untuk melanjutkan.
      // Ini BUKAN transaksi — tidak ada gas yang dikenakan di tahap ini.
      let signature: string;
      try {
        signature = await signCertificateMessage(signer, signatureData);
      } catch (signErr: any) {
        throw new Error(`Penandatanganan dibatalkan atau gagal: ${signErr.message}`);
      }
      // ─────────────────────────────────────────────────────────────────────

      // ── REVISI: Langkah 2 — Kirim ke contract dengan signature ───────────
      // Contract versi baru menerima 3 parameter: recipient, tokenURI, signature
      const tx = await contract.mintCertificate(recipient, tokenURI, signature);
      // ─────────────────────────────────────────────────────────────────────

      const receipt = await tx.wait();

      let tokenId = '0';
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log as any);
          if (parsed?.name === 'CertificateMinted') {
            tokenId = parsed.args[0].toString();
          }
        } catch (e) { }
      }

      return {
        tokenId,
        recipientName: recipient,
        transactionHash: tx.hash,
        metadataCID: tokenURI.replace('ipfs://', ''),
        qrCodeUrl: `${APP_URL}/verify/${tokenId}`,
        status: 'success',
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Minting failed');
      throw err;
    } finally {
      setIsMinting(false);
    }
  };

  /**
   * Batch mint banyak sertifikat sekaligus dengan digital signature per peserta.
   *
   * REVISI: Karena setiap sertifikat memiliki data berbeda (nama peserta berbeda-beda),
   * maka setiap sertifikat HARUS memiliki signature yang berbeda pula.
   * Oleh karena itu, proses signing dilakukan satu per satu (loop) sebelum
   * batch transaction dikirim ke blockchain.
   *
   * Alur:
   * 1. Loop semua peserta → kumpulkan signatures satu per satu via MetaMask
   * 2. Setelah semua signed → kirim batchMintCertificate() dalam 1 transaksi
   *
   * @param participants    - Array data peserta
   * @param tokenURIs       - Array IPFS URI metadata per peserta
   * @param signatureDataList - Array data sertifikat untuk signing per peserta
   */
  const batchMint = async (
    participants: Participant[],
    tokenURIs: string[],
    signatureDataList: CertificateSignatureData[]  // ← REVISI: parameter baru
  ): Promise<MintResult[]> => {
    setIsMinting(true);
    setError(null);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const address = await signer.getAddress();
      const recipients = participants.map((p) => {
        const rawAddr = (p.walletAddress || '').trim();
        const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(rawAddr) && rawAddr !== '0x0000000000000000000000000000000000000000';
        return isValidAddr ? rawAddr : address;
      });

      // ── REVISI: Kumpulkan semua signatures sebelum minting ───────────────
      // MetaMask akan popup sebanyak jumlah peserta.
      // Untuk UX yang lebih baik, pertimbangkan untuk menjelaskan ini ke issuer
      // di UI sebelum proses dimulai.
      const signatures: string[] = [];
      for (let i = 0; i < signatureDataList.length; i++) {
        try {
          const sig = await signCertificateMessage(signer, signatureDataList[i]);
          signatures.push(sig);
        } catch (signErr: any) {
          throw new Error(
            `Penandatanganan untuk peserta ${participants[i].recipientName} dibatalkan.`
          );
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // ── LOG DATA DAN SIMULASI (staticCall) SEBELUM TRANSAKSI ───────────────
      console.log("=== BATCH MINT DIAGNOSTICS ===");
      console.log("Recipients (Count: " + recipients.length + "):", recipients);
      console.log("Token URIs (Count: " + tokenURIs.length + "):", tokenURIs);
      console.log("Signatures (Count: " + signatures.length + "):", signatures.map(s => s.slice(0, 10) + "..."));

      try {
        console.log("Simulating contract.batchMintCertificate using staticCall...");
        await contract.batchMintCertificate.staticCall(
          recipients,
          tokenURIs,
          signatures
        );
        console.log("StaticCall simulation succeeded!");
      } catch (staticErr: any) {
        console.error("❌ StaticCall simulation failed with error:", staticErr);
        throw new Error(
          `Simulasi transaksi gagal: ${staticErr.reason || staticErr.message || 'Error tidak diketahui'}`
        );
      }

      // ── ESTIMASI GAS & BUFFER ─────────────────────────────────────────────
      let gasLimit;
      try {
        const estimatedGas = await contract.batchMintCertificate.estimateGas(
          recipients,
          tokenURIs,
          signatures
        );
        console.log("Estimated gas:", estimatedGas.toString());
        gasLimit = (estimatedGas * BigInt(130)) / BigInt(100); // +30% buffer
      } catch (gasErr) {
        console.warn("⚠️ Gagal mengestimasi gas, menggunakan fallback gas limit 8,000,000:", gasErr);
        gasLimit = BigInt(8000000);
      }

      // ── REVISI: Kirim batch dengan signatures & gasLimit ──────────────────
      const tx = await contract.batchMintCertificate(
        recipients,
        tokenURIs,
        signatures,
        { gasLimit }
      );
      // ─────────────────────────────────────────────────────────────────────

      const receipt = await tx.wait();

      const parsedLogs = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .filter((parsed: any) => parsed && parsed.name === 'CertificateMinted');

      const results: MintResult[] = participants.map((p, i) => {
        const log = parsedLogs[i];
        const tokenId = log ? log.args[0].toString() : 'unknown';
        return {
          tokenId,
          recipientName: p.recipientName,
          transactionHash: tx.hash,
          metadataCID: tokenURIs[i].replace('ipfs://', ''),
          qrCodeUrl: `${APP_URL}/verify/${tokenId}`,
          status: 'success',
        };
      });

      return results;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Batch minting failed');
      throw err;
    } finally {
      setIsMinting(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Verification Helpers (used by QR flow)
  // ──────────────────────────────────────────────

  const getTokenURI = async (tokenId: string): Promise<string> => {
    try {
      const contract = getReadOnlyContract();
      return await contract.tokenURI(tokenId);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const getOwner = async (tokenId: string): Promise<string> => {
    try {
      const contract = getReadOnlyContract();
      return await contract.ownerOf(tokenId);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const getTotalSupply = async (): Promise<number> => {
    try {
      const contract = getReadOnlyContract();
      const supply = await contract.totalSupply();
      return Number(supply);
    } catch (err) {
      console.error(err);
      return 0;
    }
  };

  const checkExists = async (tokenId: string): Promise<boolean> => {
    // Jangan menelan error jaringan: jika RPC gagal, lempar error agar
    // halaman menampilkan pesan kegagalan jaringan, bukan "tidak ditemukan".
    // exists() adalah view function yang mengembalikan bool tanpa revert,
    // jadi hasil false benar-benar berarti token tidak ada.
    const contract = getReadOnlyContract();
    return await contract.exists(tokenId);
  };

  const checkCertificateValid = async (tokenId: string): Promise<boolean> => {
    try {
      const contract = getReadOnlyContract();
      return await contract.isCertificateValid(tokenId);
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const checkRevoked = async (tokenId: string): Promise<boolean> => {
    try {
      const contract = getReadOnlyContract();
      return await contract.isRevoked(tokenId);
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const revokeCertificate = async (tokenId: string): Promise<string> => {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.revokeCertificate(tokenId);
      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Revocation failed');
      throw err;
    }
  };

  // ── REVISI: Fungsi verifikasi digital signature ───────────────────────────

  /**
   * Mengambil data signature dari smart contract dan memverifikasi keasliannya.
   *
   * Fungsi ini dipanggil di halaman verifikasi publik (/verify/[tokenId]) setelah
   * data metadata berhasil diambil dari IPFS.
   *
   * Alur:
   * 1. Ambil signature bytes dari contract.getIssuerSignature(tokenId)
   * 2. Ambil issuer address dari contract.getCertificateIssuer(tokenId)
   * 3. Bangun ulang pesan dari data metadata (HARUS identik dengan saat minting)
   * 4. Recover address dari signature + pesan → bandingkan dengan issuer on-chain
   *
   * @param tokenId         - Token ID sertifikat yang diverifikasi
   * @param signatureData   - Data sertifikat dari metadata IPFS (untuk rebuild pesan)
   * @returns Hasil verifikasi lengkap
   */
  const verifyIssuerSignature = async (
    tokenId: string,
    signatureData: CertificateSignatureData
  ): Promise<SignatureVerificationResult> => {
    try {
      const contract = getReadOnlyContract();

      // Ambil signature dan issuer address dari smart contract
      const [signatureBytes, issuerAddress] = await Promise.all([
        contract.getIssuerSignature(tokenId),
        contract.getCertificateIssuer(tokenId),
      ]);

      // Konversi bytes ke hex string jika diperlukan
      const signatureHex =
        typeof signatureBytes === 'string'
          ? signatureBytes
          : Buffer.from(signatureBytes).toString('hex');

      // Verifikasi signature menggunakan utilitas yang sama dengan saat minting
      return await verifyCertificateSignature(
        signatureData,
        signatureHex,
        issuerAddress
      );
    } catch (err: any) {
      console.error('Gagal verifikasi signature:', err);
      return {
        isValid: false,
        recoveredAddress: '',
        expectedIssuer: '',
        message: `Gagal mengambil data verifikasi dari blockchain: ${err.message}`,
      };
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const getIssuedCertificates = useCallback(
    async (issuerAddress: string): Promise<Certificate[]> => {
      console.log('[getIssuedCertificates] Called with issuerAddress:', issuerAddress);
      try {
        const contract = getReadOnlyContract();
        const certificates: Certificate[] = [];

        const supply = Number(await contract.totalSupply());
        console.log('[getIssuedCertificates] totalSupply:', supply);

        for (let tokenNum = 1; tokenNum <= supply; tokenNum++) {
          const tokenId = String(tokenNum);
          try {
            const [ownerAddress, tokenURI] = await Promise.all([
              contract.ownerOf(tokenId),
              contract.tokenURI(tokenId),
            ]);
            console.log(`[getIssuedCertificates] Token #${tokenId}: owner=${ownerAddress}, URI=${tokenURI}`);

            let isRevoked = false;
            try {
              isRevoked = await contract.isRevoked(tokenId);
            } catch { }

            const cleanCID = tokenURI.replace('ipfs://', '');

            // Use server-side proxy to avoid IPFS gateway rate limiting
            console.log(`[getIssuedCertificates] Fetching metadata via /api/ipfs/${cleanCID}`);
            const metaRes = await fetch(`/api/ipfs/${cleanCID}`);
            console.log(`[getIssuedCertificates] Fetch status: ${metaRes.status}`);

            if (!metaRes.ok) {
              console.error(`Failed to fetch metadata for token ${tokenId}: ${metaRes.status}`);
              continue;
            }
            const metadata = await metaRes.json();
            console.log(`[getIssuedCertificates] Metadata:`, metadata);

            // Skip if metadata has error (invalid CID, etc.)
            if (metadata.error) {
              console.error(`Metadata error for token ${tokenId}:`, metadata.error);
              continue;
            }

            const getAttr = (trait: string) =>
              metadata.attributes?.find((a: any) => a.trait_type === trait)?.value || '';
            const issuerFromMetadata = (getAttr('Issuer Wallet') || '').toLowerCase();

            console.log(`[getIssuedCertificates] Token #${tokenId}: issuerFromMetadata="${issuerFromMetadata}" vs connected="${issuerAddress.toLowerCase()}"`);

            if (issuerFromMetadata !== issuerAddress.toLowerCase()) {
              console.log(`[getIssuedCertificates] Token #${tokenId}: SKIPPED (issuer mismatch)`);
              continue;
            }

            console.log(`[getIssuedCertificates] Token #${tokenId}: MATCHED! Adding to list.`);
            certificates.push({
              tokenId,
              ownerAddress,
              issuerAddress: issuerFromMetadata || issuerAddress,
              tokenURI,
              transactionHash: '-',
              blockNumber: 0,
              recipientName: getAttr('Nama Penerima') || ownerAddress,
              recipientRole: (getAttr('Peran') || 'Peserta') as Certificate['recipientRole'],
              eventTitle: getAttr('Nama Event'),
              eventTheme: getAttr('Tema Event') || '',
              issueDate: getAttr('Tanggal Penerbitan'),
              organizerName: getAttr('Penyelenggara'),
              certificateNumber: getAttr('Nomor Sertifikat'),
              pdfCID: metadata.image ? metadata.image.replace('ipfs://', '') : '',
              metadataCID: cleanCID,
              isRevoked,
            });
          } catch (tokenErr) {
            console.error('Failed reading token', tokenId, tokenErr);
          }
        }
        console.log(`[getIssuedCertificates] Done. Found ${certificates.length} certificates.`);
        return certificates.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
      } catch (err) {
        console.error('[getIssuedCertificates] FATAL ERROR:', err);
        return [];
      }
    },
    []
  );

  return {
    mintCertificate,
    batchMint,
    getTokenURI,
    getOwner,
    getTotalSupply,
    getIssuedCertificates,
    checkExists,
    checkCertificateValid,
    checkRevoked,
    revokeCertificate,
    verifyIssuerSignature,  // ← REVISI: export fungsi verifikasi signature baru
    isMinting,
    error,
  };
};
