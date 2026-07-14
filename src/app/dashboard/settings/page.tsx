'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { getReadOnlyContract } from '@/lib/contract';
import { POLYGONSCAN_URL, RPC_URL, CHAIN_ID, CONTRACT_ADDRESS } from '@/constants';

// ── Types ─────────────────────────────────────────────────────────
type Tab = 'Profil' | 'Wallet & Blockchain' | 'Notifikasi' | 'Keamanan';
const TABS: Tab[] = ['Profil', 'Wallet & Blockchain', 'Notifikasi', 'Keamanan'];

// ── Shared styles ─────────────────────────────────────────────────
const inputCls =
  'w-full px-4 py-3 rounded-xl text-sm text-slate-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-slate-300 bg-white';

// ── Toggle ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
      style={{ background: checked ? '#6366F1' : '#E5E7EB' }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Checkbox ───────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div
        className="w-4 h-4 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
        style={{ background: checked ? '#6366F1' : 'white', borderColor: checked ? '#6366F1' : '#D1D5DB' }}
      >
        {checked && (
          <svg className="w-2.5 h-2.5" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}

// ── Radio ──────────────────────────────────────────────────────────
function Radio({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-5 flex-wrap">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(opt)}>
          <div
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
            style={{ borderColor: value === opt ? '#6366F1' : '#D1D5DB' }}
          >
            {value === opt && <div className="w-2 h-2 rounded-full" style={{ background: '#6366F1' }} />}
          </div>
          <span className="text-sm text-slate-600">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────
function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// ── localStorage keys for profile settings ────────────────────────
const PROFILE_KEY = 'validori_profile_settings';
const CERT_SETTINGS_KEY = 'validori_cert_settings';

const DEFAULT_PROFILE = {
  orgName: '',
  email: '',
  phone: '',
  website: '',
  instagram: '',
  twitter: '',
  address: '',
  primaryColor: '#6366F1',
  secondaryColor: '#3B82F6',
};

const DEFAULT_CERT = {
  template: 'Template Modern Blue',
  showLogo: true,
  showQR: true,
  qrPosition: 'Bottom Right',
  language: 'Bahasa Indonesia',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch { return fallback; }
}

function saveToStorage(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

// ════════════════════════════════════════════════════════════════════
// TAB 1: PROFIL
// ════════════════════════════════════════════════════════════════════
function TabProfil({ onDirty }: { onDirty: () => void }) {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [cert, setCert] = useState(DEFAULT_CERT);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setForm(loadFromStorage(PROFILE_KEY, DEFAULT_PROFILE));
    setCert(loadFromStorage(CERT_SETTINGS_KEY, DEFAULT_CERT));
    setLoaded(true);
  }, []);

  // Persist to localStorage on change (skip initial load)
  useEffect(() => {
    if (loaded) saveToStorage(PROFILE_KEY, form);
  }, [form, loaded]);

  useEffect(() => {
    if (loaded) saveToStorage(CERT_SETTINGS_KEY, cert);
  }, [cert, loaded]);

  const upd = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); onDirty(); };
  const updCert = (k: keyof typeof cert, v: any) => { setCert((c) => ({ ...c, [k]: v })); onDirty(); };

  return (
    <div className="space-y-8">
      <Section title="Logo & Branding">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow"
                style={{ background: `linear-gradient(135deg,${form.primaryColor},${form.secondaryColor})` }}
              >
                {form.orgName ? form.orgName.charAt(0).toUpperCase() : 'V'}
              </div>
              <button className="px-4 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
                Ubah Logo
              </button>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {([['Primary Color', 'primaryColor'], ['Secondary Color', 'secondaryColor']] as const).map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">{label}</label>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white">
                      <input type="color" value={form[key]} onChange={(e) => upd(key, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-sm font-mono text-slate-700">{form[key].toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Preview on certificate</p>
                <div className="rounded-xl p-4 flex items-center gap-3"
                  style={{ border: `1.5px solid ${form.primaryColor}`, background: `${form.primaryColor}0d` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg,${form.primaryColor},${form.secondaryColor})` }}>
                    {form.orgName ? form.orgName.charAt(0).toUpperCase() : 'V'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{form.orgName || 'Nama Organisasi'}</p>
                    <p className="text-xs" style={{ color: form.secondaryColor }}>Nama Penerima</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Certificate of Completion</p>
                    <p className="text-sm font-bold text-slate-700">Nama Event</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Informasi Dasar">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nama Organisasi <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.orgName} onChange={(e) => upd('orgName', e.target.value)} placeholder="Contoh: HIMASTIKA UEU" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => upd('email', e.target.value)} placeholder="organisasi@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Telepon</label>
              <input className={inputCls} value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="+62 812 xxxx xxxx" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Website</label>
              <input className={inputCls} value={form.website} onChange={(e) => upd('website', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Instagram</label>
              <input className={inputCls} value={form.instagram} onChange={(e) => upd('instagram', e.target.value)} placeholder="@username" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Twitter</label>
              <input className={inputCls} value={form.twitter} onChange={(e) => upd('twitter', e.target.value)} placeholder="@username" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Alamat</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.address} onChange={(e) => upd('address', e.target.value)} placeholder="Alamat organisasi..." />
          </div>
        </div>
      </Section>

      <Section title="Certificate Settings">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Template Sertifikat Default</label>
            <select className={inputCls} value={cert.template} onChange={(e) => updCert('template', e.target.value)}>
              {['Template Modern Blue', 'Template Classic Gold', 'Template Minimal Dark', 'Template Elegant Green'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <Checkbox checked={cert.showLogo} onChange={(v) => updCert('showLogo', v)} label="Tampilkan logo di sertifikat" />
            <Checkbox checked={cert.showQR} onChange={(v) => updCert('showQR', v)} label="Sertakan QR Code" />
          </div>
          {cert.showQR && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Posisi QR Code</label>
              <Radio options={['Bottom Right', 'Bottom Center', 'Top Right']} value={cert.qrPosition} onChange={(v) => updCert('qrPosition', v)} />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Bahasa Sertifikat</label>
            <select className={inputCls} value={cert.language} onChange={(e) => updCert('language', e.target.value)}>
              {['Bahasa Indonesia', 'English', 'Melayu'].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Tx history item type ───────────────────────────────────────────
interface TxHistoryItem {
  emoji: string;
  label: string;
  sub: string;
  hash: string;
  color: string;
}

// ════════════════════════════════════════════════════════════════════
// TAB 2: WALLET & BLOCKCHAIN
// ════════════════════════════════════════════════════════════════════
function TabWallet({ onDirty }: { onDirty: () => void }) {
  const { address, balance, disconnect } = useWallet();
  const { getTotalSupply } = useContract();
  const [gasPreset, setGasPreset] = useState<'Lambat' | 'Normal' | 'Cepat'>('Normal');
  const [autoGas, setAutoGas] = useState(true);
  const [showEstimate, setShowEstimate] = useState(false);
  const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [contractOwner, setContractOwner] = useState<string>('');

  const networkName = Number(CHAIN_ID) === 31337 ? 'Hardhat Localhost' : 'Polygon Amoy';
  const rpcDisplay = RPC_URL || 'https://polygon-rpc.com';
  const chainIdDisplay = String(CHAIN_ID ?? '80002');
  const explorerDisplay = (POLYGONSCAN_URL || 'https://amoy.polygonscan.com').replace('https://', '');

  // Fetch real transaction history from on-chain CertificateMinted events
  useEffect(() => {
    async function fetchOnChainData() {
      setTxLoading(true);
      try {
        const contract = getReadOnlyContract();

        // Fetch total supply
        const supply = await getTotalSupply();
        setTotalMinted(supply);

        // Fetch contract owner
        try {
          const owner = await contract.owner();
          setContractOwner(owner);
        } catch { /* owner() may not be in ABI */ }

        // Fetch CertificateMinted events
        const filter = contract.filters.CertificateMinted();
        const logs = await contract.queryFilter(filter, 0, 'latest');

        // Get the latest 10 events
        const recentLogs = logs.slice(-10).reverse();

        const items: TxHistoryItem[] = await Promise.all(
          recentLogs.map(async (log: any) => {
            let timeAgo = '';
            try {
              const block = await log.getBlock();
              const diff = Math.floor(Date.now() / 1000 - block.timestamp);
              if (diff < 60) timeAgo = `${diff} detik lalu`;
              else if (diff < 3600) timeAgo = `${Math.floor(diff / 60)} menit lalu`;
              else if (diff < 86400) timeAgo = `${Math.floor(diff / 3600)} jam lalu`;
              else timeAgo = `${Math.floor(diff / 86400)} hari lalu`;
            } catch {
              timeAgo = `Block #${log.blockNumber}`;
            }

            const tokenId = log.args.tokenId.toString();

            return {
              emoji: '✅',
              label: 'Certificate Minted',
              sub: `Token #${tokenId} · ${timeAgo}`,
              hash: log.transactionHash,
              color: '#10B981',
            };
          })
        );

        setTxHistory(items);
      } catch (err) {
        console.error('Failed to fetch tx history:', err);
        setTxHistory([]);
      } finally {
        setTxLoading(false);
      }
    }
    fetchOnChainData();
  }, [getTotalSupply]);

  const GAS_OPTIONS = [
    { label: 'Lambat' as const, time: '~30 detik', price: '$0.01' },
    { label: 'Normal' as const, time: '~15 detik', price: '$0.05' },
    { label: 'Cepat' as const, time: '~5 detik', price: '$0.10' },
  ];

  const shortAddr = address ? `0x${address.slice(2, 6)}...${address.slice(-4)}` : '—';

  return (
    <div className="space-y-8">
      {/* Wallet Terhubung */}
      <Section
        title="Wallet Terhubung"
        right={
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#ECFDF5', color: '#059669' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Terhubung
          </span>
        }
      >
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <p className="text-xs text-slate-400 mb-1">Alamat Wallet</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-slate-800 font-mono">{shortAddr}</p>
              <button
                onClick={() => address && navigator.clipboard.writeText(address)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-slate-600 hover:bg-gray-50 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Salin
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-gray-100">
            {[
              { label: 'Saldo', value: balance ? `${Number(balance).toFixed(4)} MATIC` : '—' },
              { label: 'Network', value: networkName },
              { label: 'Total Minted', value: `${totalMinted} NFT`, green: totalMinted > 0 },
            ].map(({ label, value, green }) => (
              <div key={label} className="px-6 py-4">
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-bold" style={{ color: green ? '#059669' : '#1E293B' }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 px-6 pb-5 pt-1">
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)', boxShadow: '0 4px 14px rgba(99,102,241,.3)' }}>
              Top Up Saldo
            </button>
            <a href={`${POLYGONSCAN_URL}/address/${address}`} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
              Lihat di Explorer
            </a>
            <button onClick={disconnect}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-all">
              Putuskan Koneksi
            </button>
          </div>
        </div>
      </Section>

      {/* Smart Contract Info */}
      <Section title="Smart Contract">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Contract Address</p>
              <p className="text-sm font-mono font-medium text-slate-700 truncate">{CONTRACT_ADDRESS || '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Contract Owner</p>
              <p className="text-sm font-mono font-medium text-slate-700 truncate">{contractOwner || '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Token Standard</p>
              <p className="text-sm font-medium text-slate-700">ERC-721 (CertificateNFT)</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Total Supply</p>
              <p className="text-sm font-bold text-slate-700">{totalMinted} sertifikat</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Pengaturan Network */}
      <Section title="Pengaturan Network">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Blockchain Network</label>
            <select className={`${inputCls} bg-gray-50`} defaultValue={networkName} onChange={onDirty}>
              <option>Polygon (MATIC) - Mainnet</option>
              <option>Polygon Amoy Testnet</option>
              <option>Hardhat Localhost</option>
            </select>
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <span>⚠</span> Mengubah network akan memerlukan koneksi ulang wallet
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'RPC URL', value: rpcDisplay },
              { label: 'Chain ID', value: chainIdDisplay },
              { label: 'Currency Symbol', value: 'MATIC' },
              { label: 'Block Explorer', value: explorerDisplay },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Gas Fee */}
      <Section title="Pengaturan Gas Fee">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-3">Prioritas Gas Fee</label>
            <div className="grid grid-cols-3 gap-3">
              {GAS_OPTIONS.map((opt) => {
                const active = gasPreset === opt.label;
                return (
                  <button key={opt.label} onClick={() => { setGasPreset(opt.label); onDirty(); }}
                    className="rounded-xl p-4 text-left transition-all border"
                    style={active
                      ? { borderColor: '#6366F1', background: 'white', boxShadow: '0 0 0 1.5px #6366F1' }
                      : { borderColor: '#E5E7EB', background: 'white' }}>
                    <p className={`text-sm font-bold ${active ? 'text-indigo-600' : 'text-slate-700'}`}>{opt.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.time}</p>
                    <p className={`text-lg font-bold mt-2 ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{opt.price}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <Checkbox checked={autoGas} onChange={(v) => { setAutoGas(v); onDirty(); }}
              label="Otomatis sesuaikan gas fee berdasarkan kondisi network" />
            <Checkbox checked={showEstimate} onChange={(v) => { setShowEstimate(v); onDirty(); }}
              label="Tampilkan estimasi gas fee sebelum transaksi" />
          </div>
        </div>
      </Section>

      {/* Riwayat Transaksi — Real on-chain data */}
      <Section title="Riwayat Transaksi Blockchain"
        right={
          <a href={`${POLYGONSCAN_URL}/address/${address}`} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
            Lihat Semua
          </a>
        }>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-50">
          {txLoading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-2" />
              <p className="text-xs text-slate-400">Memuat dari blockchain...</p>
            </div>
          ) : txHistory.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-slate-400">Belum ada transaksi sertifikat</p>
              <p className="text-xs text-slate-300 mt-1">Transaksi akan muncul setelah Anda menerbitkan sertifikat</p>
            </div>
          ) : (
            txHistory.map((tx, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: `${tx.color}18` }}>
                  {tx.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{tx.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{tx.sub}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <a href={`${POLYGONSCAN_URL}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-mono text-indigo-500 hover:text-indigo-700 transition-colors block">
                    {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 3: NOTIFIKASI
// ════════════════════════════════════════════════════════════════════
function TabNotifikasi({ onDirty }: { onDirty: () => void }) {
  const [emailNotif, setEmailNotif] = useState({
    sertifikatDiterbitkan: true,
    verifikasiPublik: true,
    transaksiBlockchain: true,
    saldoRendah: true,
    apiUsageAlert: false,
    newsletterUpdate: true,
  });
  const [push, setPush] = useState({ aktifkan: true, suara: false, janganGanggu: false });
  const [frequency, setFrequency] = useState('Real-time');
  const [emailAddr, setEmailAddr] = useState('himastika@ueu.ac.id');
  const [testSent, setTestSent] = useState(false);

  const updE = (k: keyof typeof emailNotif) => { setEmailNotif((e) => ({ ...e, [k]: !e[k] })); onDirty(); };
  const updP = (k: keyof typeof push) => { setPush((p) => ({ ...p, [k]: !p[k] })); onDirty(); };

  const emailItems = [
    { key: 'sertifikatDiterbitkan' as const, label: 'Sertifikat Diterbitkan', desc: 'Dapatkan notifikasi saat sertifikat baru berhasil diterbitkan' },
    { key: 'verifikasiPublik' as const, label: 'Verifikasi Publik', desc: 'Notifikasi saat ada yang memverifikasi sertifikat Anda' },
    { key: 'transaksiBlockchain' as const, label: 'Transaksi Blockchain', desc: 'Update status transaksi blockchain (pending, success, failed)' },
    { key: 'saldoRendah' as const, label: 'Saldo Rendah', desc: 'Peringatan saat saldo wallet Anda di bawah 5 MATIC' },
    { key: 'apiUsageAlert' as const, label: 'API Usage Alert', desc: 'Notifikasi saat penggunaan API mendekati limit (80%)' },
    { key: 'newsletterUpdate' as const, label: 'Newsletter & Update', desc: 'Berita dan update fitur terbaru dari Verifikasi Sertifikat' },
  ];
  const pushItems = [
    { key: 'aktifkan' as const, label: 'Aktifkan Notifikasi Push', desc: 'Terima notifikasi real-time di browser Anda' },
    { key: 'suara' as const, label: 'Suara Notifikasi', desc: 'Mainkan suara saat notifikasi masuk' },
    { key: 'janganGanggu' as const, label: 'Mode Jangan Ganggu', desc: 'Nonaktifkan notifikasi di jam tertentu' },
  ];

  return (
    <div className="space-y-8">
      <Section title="Notifikasi Email">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-50">
          {emailItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 pr-6">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={emailNotif[key]} onChange={() => updE(key)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Notifikasi Push (Browser)">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-50">
          {pushItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 pr-6">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={push[key]} onChange={() => updP(key)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Frekuensi Notifikasi">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">Ringkasan Email</label>
            <Radio options={['Real-time', 'Harian', 'Mingguan', 'Tidak pernah']} value={frequency}
              onChange={(v) => { setFrequency(v); onDirty(); }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Tujuan Notifikasi</label>
            <input type="email" className={inputCls} value={emailAddr}
              onChange={(e) => { setEmailAddr(e.target.value); onDirty(); }} />
            <p className="text-xs text-slate-400 mt-1.5">Tambahkan email lain dengan koma sebagai pemisah</p>
          </div>
        </div>
      </Section>

      <Section title="Test Notifikasi">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">Kirim notifikasi test untuk memastikan pengaturan Anda berfungsi</p>
          <button
            onClick={() => { setTestSent(true); setTimeout(() => setTestSent(false), 2500); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all"
            style={testSent
              ? { borderColor: '#10B981', color: '#059669', background: '#ECFDF5' }
              : { borderColor: '#6366F1', color: '#4F46E5', background: 'white' }}>
            {testSent ? '✓ Terkirim!' : 'Kirim Test Email'}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 4: KEAMANAN
// ════════════════════════════════════════════════════════════════════
function TabKeamanan({ onDirty }: { onDirty: () => void }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [secToggles, setSecToggles] = useState({ loginAlerts: true, apiRotation: false, ipWhitelist: false });

  const pwRules = [
    { label: 'Minimal 8 karakter', ok: newPw.length >= 8 },
    { label: 'Mengandung huruf besar dan kecil', ok: /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) },
    { label: 'Mengandung angka', ok: /[0-9]/.test(newPw) },
    { label: 'Mengandung karakter khusus', ok: /[^A-Za-z0-9]/.test(newPw) },
  ];

  const sessions = [
    { device: 'Chrome on Windows', location: 'Jakarta, Indonesia · 103.xxx.xxx.xxx', time: 'Sesi saat ini · Aktif sekarang', current: true },
    { device: 'Safari on iPhone', location: 'Jakarta, Indonesia · 103.xxx.xxx.xxx', time: 'Terakhir aktif 2 jam lalu', current: false },
    { device: 'Firefox on MacOS', location: 'Bandung, Indonesia · 114.xxx.xxx.xxx', time: 'Terakhir aktif 1 hari lalu', current: false },
  ];

  const EyeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {showPw
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        : <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      }
    </svg>
  );

  return (
    <div className="space-y-8">
      {/* Security Score Banner */}
      <div className="rounded-2xl px-6 py-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1px solid #A7F3D0' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#10B981' }}>
          <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">Akun Anda Aman</p>
          <p className="text-xs text-slate-500 mt-0.5">Semua fitur keamanan aktif dan berfungsi dengan baik</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: '#059669' }}>100%</p>
          <p className="text-xs text-slate-400">Security Score</p>
        </div>
      </div>

      {/* Password */}
      <Section title="Password">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password Saat Ini</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-10`}
                value={currentPw} onChange={(e) => { setCurrentPw(e.target.value); onDirty(); }}
                placeholder="Masukkan password saat ini" />
              <button onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <EyeIcon />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password Baru</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-10`}
                value={newPw} onChange={(e) => { setNewPw(e.target.value); onDirty(); }}
                placeholder="Masukkan password baru" />
              <button onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <EyeIcon />
              </button>
            </div>
            {newPw && (
              <div className="mt-2 space-y-1.5">
                {pwRules.map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                    <span className={`text-xs ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Konfirmasi Password Baru</label>
            <input type={showPw ? 'text' : 'password'}
              className={`${inputCls} ${confirmPw && confirmPw !== newPw ? 'border-red-300 focus:ring-red-200' : ''}`}
              value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); onDirty(); }}
              placeholder="Konfirmasi password baru" />
            {confirmPw && confirmPw !== newPw && <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>}
          </div>

          <button
            disabled={!newPw || newPw !== confirmPw || !currentPw}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1)', boxShadow: '0 4px 14px rgba(99,102,241,.3)' }}>
            Update Password
          </button>
        </div>
      </Section>

      {/* 2FA */}
      <Section title="Two-Factor Authentication (2FA)"
        right={<span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#ECFDF5', color: '#059669' }}>Aktif</span>}>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <p className="text-xs text-slate-400">Tambahkan lapisan keamanan ekstra untuk akun Anda</p>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg flex-shrink-0">📱</div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Authenticator App</p>
              <p className="text-xs text-slate-400">Google Authenticator, Authy, atau sejenisnya</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
              Regenerate Codes
            </button>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={{ borderColor: '#EF4444', color: '#EF4444' }}>
              Nonaktifkan 2FA
            </button>
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: '#EEF2FF', border: '1px solid #E0E7FF' }}>
            <p className="text-sm font-semibold text-indigo-700">💾 Backup Codes</p>
            <p className="text-xs text-indigo-600 leading-relaxed">
              Simpan backup codes Anda di tempat yang aman.{' '}
              <span className="font-semibold">Anda akan membutuhkannya jika kehilangan akses ke authenticator app.</span>
            </p>
            <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#4F46E5' }}>
              Lihat Backup Codes
            </button>
          </div>
        </div>
      </Section>

      {/* Sesi Aktif */}
      <Section title="Sesi Aktif">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">💻</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{s.device}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.location}</p>
                  <p className="text-xs mt-0.5" style={{ color: s.current ? '#059669' : '#9CA3AF' }}>{s.time}</p>
                </div>
                {s.current
                  ? <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#ECFDF5', color: '#059669' }}>Aktif</span>
                  : <button className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={{ borderColor: '#FCA5A5', color: '#EF4444' }}>Logout</button>
                }
              </div>
            ))}
          </div>
          <div className="px-6 pb-5 pt-2">
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all"
              style={{ borderColor: '#FCA5A5', color: '#EF4444' }}>
              Logout dari Semua Perangkat
            </button>
          </div>
        </div>
      </Section>

      {/* Security Toggles */}
      <Section title="Pengaturan Keamanan Lainnya">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[
            { key: 'loginAlerts' as const, label: 'Login Alerts', desc: 'Dapatkan notifikasi saat ada login dari perangkat baru' },
            { key: 'apiRotation' as const, label: 'API Key Rotation', desc: 'Rotasi otomatis API key setiap 90 hari' },
            { key: 'ipWhitelist' as const, label: 'IP Whitelist', desc: 'Batasi akses hanya dari IP address tertentu' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 pr-6">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={secToggles[key]}
                onChange={(v) => { setSecToggles((s) => ({ ...s, [key]: v })); onDirty(); }} />
            </div>
          ))}
        </div>
      </Section>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-100 overflow-hidden">
        <div className="px-6 py-3 border-b border-red-100" style={{ background: '#FEF2F2' }}>
          <p className="text-sm font-bold text-red-700">Danger Zone</p>
        </div>
        <div className="bg-white divide-y divide-red-50">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Export Data</p>
              <p className="text-xs text-slate-400 mt-0.5">Download semua data organisasi Anda</p>
            </div>
            <button className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
              Export
            </button>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Hapus Akun</p>
              <p className="text-xs text-slate-400 mt-0.5">Hapus akun dan semua data secara permanen</p>
            </div>
            <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: '#EF4444' }}>
              Hapus Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function PengaturanPage() {
  const router = useRouter();
  const { isConnected, isInitializing } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('Profil');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // ALL hooks MUST be called before any conditional return
  const onDirty = useCallback(() => setDirty(true), []);

  const handleSave = useCallback(() => {
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  useEffect(() => {
    if (!isInitializing && !isConnected) router.push('/connect');
  }, [isConnected, isInitializing, router]);

  // Early return AFTER all hooks
  if (isInitializing || !isConnected) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 p-6 pb-28 max-w-4xl w-full mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan</h1>

        {/* Tab nav */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap"
              style={{ color: activeTab === tab ? '#4F46E5' : '#6B7280' }}>
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg,#4F46E5,#6366F1)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Profil' && <TabProfil onDirty={onDirty} />}
        {activeTab === 'Wallet & Blockchain' && <TabWallet onDirty={onDirty} />}
        {activeTab === 'Notifikasi' && <TabNotifikasi onDirty={onDirty} />}
        {activeTab === 'Keamanan' && <TabKeamanan onDirty={onDirty} />}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 right-0 left-44 bg-white border-t border-gray-100 px-6 py-3.5 flex items-center gap-3 z-30 shadow-sm">
        {dirty && (
          <span className="text-xs text-amber-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Ada perubahan yang belum disimpan
          </span>
        )}
        <div className="flex-1" />
        <button onClick={() => setDirty(false)}
          className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
          Batal
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: saved
              ? 'linear-gradient(135deg,#10B981,#059669)'
              : 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)',
            boxShadow: '0 4px 14px rgba(99,102,241,.35)',
          }}>
          {saved
            ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>Tersimpan!</>
            : 'Simpan Perubahan'
          }
        </button>
      </div>
    </div>
  );
}