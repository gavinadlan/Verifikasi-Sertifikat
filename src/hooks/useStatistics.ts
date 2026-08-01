'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getReadOnlyContract } from '@/lib/contract';
import { IPFS_GATEWAY, CONTRACT_DEPLOY_BLOCK, LOG_QUERY_BLOCK_RANGE, LOG_QUERY_LOOKBACK_BLOCKS } from '@/constants';

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
const CACHE_KEY = 'validori_statistics_cache';
const SUPPLY_KEY = 'validori_last_supply';
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

            // 3. Fetch all CertificateMinted events in small block chunks
            const filter = contract.filters.CertificateMinted();
            const provider = contract.runner?.provider;
            if (!provider) {
                throw new Error('Blockchain provider unavailable');
            }
            const latestBlock = await provider.getBlockNumber();
            // Scan sejak blok deploy contract agar SELURUH riwayat minting terbaca.
            // Sebelumnya scan hanya LOOKBACK blok terakhir, sehingga event minting
            // lama tidak ditemukan → total gas, aktivitas, dan grafik selalu 0.
            // LOG_QUERY_LOOKBACK_BLOCKS kini hanya dipakai sebagai batas bawah
            // darurat bila CONTRACT_DEPLOY_BLOCK tidak dikonfigurasi.
            const startBlock =
                CONTRACT_DEPLOY_BLOCK > 0
                    ? CONTRACT_DEPLOY_BLOCK
                    : Math.max(0, latestBlock - Math.max(10, LOG_QUERY_LOOKBACK_BLOCKS || 500));
            // Rentang besar per request: Alchemy mendukung hingga ribuan blok
            // sekali query, jauh lebih cepat daripada 10 blok per panggilan.
            const range = Math.max(1, LOG_QUERY_BLOCK_RANGE >= 1000 ? LOG_QUERY_BLOCK_RANGE : 5000);
            const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

            const logs: any[] = [];
            for (let from = startBlock; from <= latestBlock; from += range) {
                const to = Math.min(from + range - 1, latestBlock);
                let chunk: any[] = [];
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        chunk = await contract.queryFilter(filter, from, to);
                        break;
                    } catch (e: any) {
                        const msg = String(e?.message || '');
                        if (attempt < 2 && (msg.includes('429') || msg.includes('compute units per second'))) {
                            await sleep(300 * (attempt + 1));
                            continue;
                        }
                        throw e;
                    }
                }
                logs.push(...chunk);
                await sleep(30);
            }

            // 4. Build lightweight event list (no IPFS yet)
            // Cache timestamp per blok: event dari batch minting berada di blok
            // yang sama, jadi tanpa cache getBlock() dipanggil puluhan kali untuk
            // blok yang identik.
            const blockTimeCache = new Map<number, number>();
            const events: CertificateEvent[] = await Promise.all(
                logs.map(async (log: any) => {
                    let timestamp = 0;
                    try {
                        const cached = blockTimeCache.get(log.blockNumber);
                        if (cached !== undefined) {
                            timestamp = cached;
                        } else {
                            const block = await log.getBlock();
                            timestamp = block.timestamp;
                            blockTimeCache.set(log.blockNumber, timestamp);
                        }
                    } catch { /* fallback to 0 */ }

                    return {
                        tokenId: log.args.tokenId.toString(),
                        recipient: log.args.recipient,
                        tokenURI: log.args.tokenURI,
                        blockNumber: log.blockNumber,
                        transactionHash: log.transactionHash,
                        timestamp,
                    };
                })
            );

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
            const uniqueTxLogs = Array.from(
                new Map(logs.map((log: any) => [log.transactionHash, log])).values()
            );
            const gasResults = await Promise.allSettled(
                uniqueTxLogs.map(async (log: any) => {
                    const receipt = await log.getTransactionReceipt();
                    const gasUsed = receipt.gasUsed ?? BigInt(0);
                    const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? BigInt(0);
                    const gasCostWei = gasUsed * gasPrice;
                    return Number(ethers.formatUnits(gasCostWei, 18));
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

            // 10. Verify count from localStorage
            const totalVerified = getVerifyCount();
            const conversionRate =
                currentSupply > 0 ? Math.min(100, (totalVerified / currentSupply) * 100) : 0;

            const result: StatisticsData = {
                totalMinted: currentSupply,
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