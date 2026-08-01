'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getReadOnlyContract } from '@/lib/contract';
import { IPFS_GATEWAY, CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK, LOG_QUERY_BLOCK_RANGE, LOG_QUERY_LOOKBACK_BLOCKS } from '@/constants';

// ── Types ─────────────────────────────────────────────────────────
export interface CertificateEvent {
    tokenId: string;
    recipient: string;
    tokenURI: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number; // unix seconds
}

export interface CertificateMetadata {
    tokenId: string;
    recipientName: string;
    role: string;
    eventTitle: string;
    eventTheme?: string;
    issueDate: string;       // YYYY-MM-DD
    organizer: string;
    issuerAddress: string;
    certificateNumber: string;
    timestamp: number;
    transactionHash: string;
}

export interface DailyCount {
    date: string;  // YYYY-MM-DD
    count: number;
}

export interface CategoryCount {
    label: string;
    count: number;
}

export interface RecentActivity {
    time: string;
    activity: string;
    detail: string;
    transactionHash: string;
    tokenId: string;
    timestamp: number;
}

export interface StatisticsData {
    totalMinted: number;
    // ── Metrik on-chain (menggantikan metrik verifikasi yang tidak terlacak
    //    di blockchain, karena verifikasi adalah operasi baca/view function) ──
    activeCertificates: number;     // sertifikat valid (belum direvokasi)
    revokedCertificates: number;    // sertifikat yang telah direvokasi issuer
    avgGasPerCertificate: number;   // rata-rata gas (unit) per sertifikat
    mintTransactionCount: number;   // jumlah transaksi minting (bukti efisiensi batch)
    totalVerified: number;          // tracked via localStorage
    conversionRate: number;         // totalVerified / totalMinted * 100
    avgVerifyTime: number | null;   // not available on-chain → null
    uniqueRecipients: number;
    totalGasMatic: number;
    dailyMints: DailyCount[];       // last 30 days
    categoryDistribution: CategoryCount[];
    recentActivities: RecentActivity[];
    lastUpdated: number;            // unix ms
}

// ── Cache helpers ─────────────────────────────────────────────────
// Naikkan versi bila struktur/derivasi data berubah, agar cache lama
// (mis. hasil scan yang gagal dengan nilai 0) tidak dipakai lagi.
const CACHE_KEY = 'validori_statistics_cache_v3';
const SUPPLY_KEY = 'validori_last_supply_v3';
const VERIFY_COUNT_KEY = 'validori_verify_count';

function readCache(): { data: StatisticsData; supply: number } | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        const supply = Number(localStorage.getItem(SUPPLY_KEY) ?? 0);
        if (!raw) return null;
        return { data: JSON.parse(raw), supply };
    } catch {
        return null;
    }
}

function writeCache(data: StatisticsData, supply: number) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(SUPPLY_KEY, String(supply));
    } catch { /* ignore quota errors */ }
}

function getVerifyCount(): number {
    try {
        return Number(localStorage.getItem(VERIFY_COUNT_KEY) ?? 0);
    } catch { return 0; }
}

/** Call this whenever a public verify page is visited to track count */
export function incrementVerifyCount() {
    try {
        const n = getVerifyCount() + 1;
        localStorage.setItem(VERIFY_COUNT_KEY, String(n));
    } catch { /* ignore */ }
}

// ── IPFS helpers ──────────────────────────────────────────────────
async function fetchIPFSMetadata(uri: string): Promise<Record<string, any> | null> {
    try {
        const cid = uri.replace('ipfs://', '');
        const url = `${IPFS_GATEWAY}${cid}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function getAttribute(attrs: Array<{ trait_type: string; value: string }>, key: string): string {
    return attrs?.find((a) => a.trait_type === key)?.value ?? '';
}

// ── Time helpers ──────────────────────────────────────────────────
function toDateStr(unixSecs: number): string {
    return new Date(unixSecs * 1000).toISOString().slice(0, 10);
}

function relativeTime(unixSecs: number): string {
    const diff = Math.floor(Date.now() / 1000 - unixSecs);
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

// ── Last N days as YYYY-MM-DD ─────────────────────────────────────
function lastNDays(n: number): string[] {
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

// ── Main hook ─────────────────────────────────────────────────────
export function useStatistics() {
    const [data, setData] = useState<StatisticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);

        try {
            const contract = getReadOnlyContract();

            // 1. Always fetch current totalSupply to check cache validity
            const supplyBN: bigint = await contract.totalSupply();
            const currentSupply = Number(supplyBN);

            // 2. Return cached data if supply hasn't changed
            if (!forceRefresh) {
                const cached = readCache();
                if (cached && cached.supply === currentSupply && currentSupply > 0) {
                    setData(cached.data);
                    setIsLoading(false);
                    return;
                }
            }

            // 3. Ambil seluruh riwayat minting.
            //    Alchemy free tier membatasi eth_getLogs hanya 10 blok per request,
            //    sehingga scan per-rentang mustahil untuk jutaan blok. Sebagai
            //    gantinya dipakai alchemy_getAssetTransfers yang mengembalikan
            //    seluruh transfer ERC-721 (mint = from 0x0) dalam satu panggilan.
            const provider = contract.runner?.provider;
            if (!provider) {
                throw new Error('Blockchain provider unavailable');
            }
            const latestBlock = await provider.getBlockNumber();

            interface MintRecord {
                tokenId: string;
                recipient: string;
                blockNumber: number;
                transactionHash: string;
                timestamp: number;
            }

            const fromBlockHex =
                '0x' + Math.max(0, CONTRACT_DEPLOY_BLOCK > 0 ? CONTRACT_DEPLOY_BLOCK : 0).toString(16);

            let mints: MintRecord[] = [];
            try {
                const transfers: any[] = [];
                let pageKey: string | undefined;
                do {
                    const params: any = {
                        fromBlock: fromBlockHex,
                        toBlock: 'latest',
                        contractAddresses: [CONTRACT_ADDRESS],
                        category: ['erc721'],
                        fromAddress: '0x0000000000000000000000000000000000000000',
                        withMetadata: true,
                        excludeZeroValue: false,
                        maxCount: '0x3e8',
                    };
                    if (pageKey) params.pageKey = pageKey;
                    const res: any = await (provider as any).send('alchemy_getAssetTransfers', [params]);
                    transfers.push(...(res?.transfers ?? []));
                    pageKey = res?.pageKey;
                } while (pageKey && transfers.length < 5000);

                mints = transfers.map((t: any) => ({
                    tokenId: BigInt(t.tokenId ?? '0x0').toString(),
                    recipient: t.to ?? '',
                    blockNumber: parseInt(t.blockNum, 16),
                    transactionHash: t.hash,
                    timestamp: t.metadata?.blockTimestamp
                        ? Math.floor(new Date(t.metadata.blockTimestamp).getTime() / 1000)
                        : 0,
                }));
            } catch (transferErr) {
                // Fallback: RPC tanpa dukungan getAssetTransfers — scan log terbatas
                // pada rentang blok terakhir agar tetap menampilkan sebagian data.
                console.warn('getAssetTransfers gagal, fallback ke scan log terbatas:', transferErr);
                const filter = contract.filters.CertificateMinted();
                const range = Math.max(1, Math.min(LOG_QUERY_BLOCK_RANGE || 10, 10));
                const lookback = Math.max(10, LOG_QUERY_LOOKBACK_BLOCKS || 500);
                const startBlock = Math.max(0, latestBlock - lookback);
                const collected: any[] = [];
                for (let from = startBlock; from <= latestBlock; from += range) {
                    const to = Math.min(from + range - 1, latestBlock);
                    try {
                        collected.push(...(await contract.queryFilter(filter, from, to)));
                    } catch { /* abaikan chunk gagal */ }
                }
                mints = collected.map((log: any) => ({
                    tokenId: log.args.tokenId.toString(),
                    recipient: log.args.recipient,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    timestamp: 0,
                }));
            }

            // 4. Lengkapi tokenURI hanya untuk event terbaru (dipakai ambil metadata IPFS).
            //    tokenURI tidak tersedia di getAssetTransfers, jadi dibaca dari contract.
            const sortedMints = [...mints].sort((a, b) => b.blockNumber - a.blockNumber);
            const needURI = sortedMints.slice(0, 200);
            const uriMap = new Map<string, string>();
            await Promise.allSettled(
                needURI.map(async (m) => {
                    try {
                        uriMap.set(m.tokenId, await contract.tokenURI(m.tokenId));
                    } catch { /* token mungkin sudah tidak ada */ }
                })
            );

            const events: CertificateEvent[] = mints.map((m) => ({
                tokenId: m.tokenId,
                recipient: m.recipient,
                tokenURI: uriMap.get(m.tokenId) ?? '',
                blockNumber: m.blockNumber,
                transactionHash: m.transactionHash,
                timestamp: m.timestamp,
            }));

            // Sort descending by block
            const sorted = [...events].sort((a, b) => b.blockNumber - a.blockNumber);

            // 5. Fetch IPFS metadata for recent 20 events (for activity table + category)
            const toFetch = sorted.slice(0, 20);
            const metadataResults: (CertificateMetadata | null)[] = await Promise.all(
                toFetch.map(async (ev) => {
                    const raw = await fetchIPFSMetadata(ev.tokenURI);
                    if (!raw?.attributes) return null;
                    return {
                        tokenId: ev.tokenId,
                        recipientName: getAttribute(raw.attributes, 'Nama Penerima'),
                        role: getAttribute(raw.attributes, 'Peran'),
                        eventTitle: getAttribute(raw.attributes, 'Nama Event'),
                        eventTheme: getAttribute(raw.attributes, 'Tema Event'),
                        issueDate: getAttribute(raw.attributes, 'Tanggal Penerbitan'),
                        organizer: getAttribute(raw.attributes, 'Penyelenggara'),
                        issuerAddress: getAttribute(raw.attributes, 'Issuer Wallet'),
                        certificateNumber: getAttribute(raw.attributes, 'Nomor Sertifikat'),
                        timestamp: ev.timestamp,
                        transactionHash: ev.transactionHash,
                    };
                })
            );

            // 6. Fetch metadata for ALL events (for category distribution) — batch quietly
            //    We reuse the top 20 and also fetch remaining up to 200 without blocking UI
            const allMetadata: CertificateMetadata[] = metadataResults.filter(Boolean) as CertificateMetadata[];

            if (sorted.length > 20) {
                const remaining = sorted.slice(20, 200);
                const extra = await Promise.allSettled(
                    remaining.map(async (ev) => {
                        const raw = await fetchIPFSMetadata(ev.tokenURI);
                        if (!raw?.attributes) return null;
                        return {
                            tokenId: ev.tokenId,
                            recipientName: getAttribute(raw.attributes, 'Nama Penerima'),
                            role: getAttribute(raw.attributes, 'Peran'),
                            eventTitle: getAttribute(raw.attributes, 'Nama Event'),
                            eventTheme: getAttribute(raw.attributes, 'Tema Event'),
                            issueDate: getAttribute(raw.attributes, 'Tanggal Penerbitan'),
                            organizer: getAttribute(raw.attributes, 'Penyelenggara'),
                            issuerAddress: getAttribute(raw.attributes, 'Issuer Wallet'),
                            certificateNumber: getAttribute(raw.attributes, 'Nomor Sertifikat'),
                            timestamp: ev.timestamp,
                            transactionHash: ev.transactionHash,
                        } as CertificateMetadata;
                    })
                );
                extra.forEach((r) => {
                    if (r.status === 'fulfilled' && r.value) allMetadata.push(r.value);
                });
            }

            // 7. Daily mints (last 30 days) — from all events via block.timestamp
            const days30 = lastNDays(30);
            const mintsByDate: Record<string, number> = {};
            days30.forEach((d) => { mintsByDate[d] = 0; });
            events.forEach((ev) => {
                if (!ev.timestamp) return;
                const d = toDateStr(ev.timestamp);
                if (d in mintsByDate) mintsByDate[d]++;
            });
            const dailyMints: DailyCount[] = days30.map((d) => ({
                date: d,
                count: mintsByDate[d],
            }));
            const uniqueRecipients = new Set(events.map((ev) => ev.recipient.toLowerCase())).size;

            // 7b. Total gas spent in MATIC from minting transaction receipts
            // Dedupe berdasarkan transaction hash: satu transaksi batch minting
            // menghasilkan puluhan event, sehingga tanpa dedupe biaya gas satu
            // transaksi akan terhitung berulang kali (over-counting).
            const uniqueTxHashes = Array.from(
                new Set(events.map((ev) => ev.transactionHash).filter(Boolean))
            );
            const gasResults = await Promise.allSettled(
                uniqueTxHashes.map(async (hash) => {
                    const receipt = await provider.getTransactionReceipt(hash);
                    if (!receipt) return 0;
                    const gasUsed = receipt.gasUsed ?? BigInt(0);
                    const gasPrice = (receipt as any).effectiveGasPrice ?? (receipt as any).gasPrice ?? BigInt(0);
                    return Number(ethers.formatUnits(gasUsed * gasPrice, 18));
                })
            );
            const totalGasMatic = gasResults.reduce((sum, result) => {
                if (result.status === 'fulfilled') return sum + result.value;
                return sum;
            }, 0);

            // 8. Category distribution from Event Title
            const categoryMap: Record<string, number> = {};
            allMetadata.forEach((m) => {
                if (!m) return;
                const key = m.eventTitle || 'Lainnya';
                categoryMap[key] = (categoryMap[key] ?? 0) + 1;
            });
            // If no metadata yet, use totalSupply as "Uncategorized"
            const categoryDistribution: CategoryCount[] =
                Object.keys(categoryMap).length > 0
                    ? Object.entries(categoryMap)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 8)
                        .map(([label, count]) => ({ label, count }))
                    : currentSupply > 0
                        ? [{ label: 'Sertifikat', count: currentSupply }]
                        : [];

            // 9. Recent activities (top 10)
            const recentActivities: RecentActivity[] = metadataResults
                .filter(Boolean)
                .slice(0, 10)
                .map((m) => ({
                    time: m!.timestamp ? relativeTime(m!.timestamp) : '—',
                    activity: 'Sertifikat Diterbitkan',
                    detail: m!.eventTitle
                        ? `${m!.eventTitle} — ${m!.recipientName}`
                        : `Token #${m!.tokenId}`,
                    transactionHash: m!.transactionHash,
                    tokenId: m!.tokenId,
                    timestamp: m!.timestamp,
                }));

            // 10a. Status revokasi per token — dibaca langsung dari smart contract.
            //      Ini menggantikan metrik "verifikasi" yang tidak dapat dihitung
            //      on-chain (verifikasi = view function, tidak menghasilkan transaksi).
            let revokedCertificates = 0;
            const revokeChecks = await Promise.allSettled(
                events.map((ev) => contract.isRevoked(ev.tokenId))
            );
            revokeChecks.forEach((r) => {
                if (r.status === 'fulfilled' && r.value === true) revokedCertificates++;
            });
            const activeCertificates = Math.max(0, events.length - revokedCertificates);

            // 10b. Rata-rata gas per sertifikat (unit gas) — relevan dengan KPI
            //      konsumsi gas < 300.000 per sertifikat.
            const gasUnitResults = await Promise.allSettled(
                uniqueTxHashes.map(async (hash) => {
                    const receipt = await provider.getTransactionReceipt(hash);
                    return receipt ? Number(receipt.gasUsed ?? 0) : 0;
                })
            );
            const totalGasUnits = gasUnitResults.reduce(
                (sum, r) => (r.status === 'fulfilled' ? sum + r.value : sum),
                0
            );
            const avgGasPerCertificate =
                events.length > 0 ? Math.round(totalGasUnits / events.length) : 0;

            // 10c. Verify count from localStorage (dipertahankan untuk kompatibilitas)
            const totalVerified = getVerifyCount();
            const conversionRate =
                currentSupply > 0 ? Math.min(100, (totalVerified / currentSupply) * 100) : 0;

            const result: StatisticsData = {
                totalMinted: currentSupply,
                activeCertificates,
                revokedCertificates,
                avgGasPerCertificate,
                mintTransactionCount: uniqueTxHashes.length,
                totalVerified,
                conversionRate: parseFloat(conversionRate.toFixed(1)),
                avgVerifyTime: null,
                uniqueRecipients,
                totalGasMatic,
                dailyMints,
                categoryDistribution,
                recentActivities,
                lastUpdated: Date.now(),
            };

            writeCache(result, currentSupply);
            setData(result);
        } catch (err: any) {
            setError(err?.message ?? 'Gagal memuat data dari blockchain');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { data, isLoading, error, refresh: () => load(true) };
}